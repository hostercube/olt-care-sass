import net from 'net';
import { logger } from '../utils/logger.js';

/**
 * Execute Telnet commands on OLT
 * Enhanced for VSOL, DBC, CDATA, ECOM and other Chinese OLTs
 * Handles various login prompts and CLI modes
 */
export async function executeTelnetCommands(olt, commands) {
  return new Promise((resolve, reject) => {
    const TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '90000'); // Extended timeout for slower OLTs
    let output = '';
    let authenticated = false;
    let commandIndex = 0;
    let loginStep = 0; // 0: waiting for username prompt, 1: waiting for password prompt, 2: logged in
    let loginAttempts = 0;
    let dataBuffer = '';
    let lastDataTime = Date.now();
    let commandsStarted = false;
    
    const socket = new net.Socket();
    socket.setEncoding('utf8');
    
    const timeout = setTimeout(() => {
      logger.error(`Telnet connection timeout for ${olt.ip_address}:${olt.port} - Output length: ${output.length}`);
      socket.destroy();
      if (output.length > 100) {
        // We got some data, return what we have
        resolve(output);
      } else {
        reject(new Error(`Telnet connection timeout after ${TIMEOUT/1000}s`));
      }
    }, TIMEOUT);
    
    socket.on('connect', () => {
      logger.info(`Telnet connected to ${olt.ip_address}:${olt.port}`);
      lastDataTime = Date.now();
    });
    
    socket.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      dataBuffer += chunk;
      lastDataTime = Date.now();
      
      const lowerBuffer = dataBuffer.toLowerCase();
      
      // Handle login sequence with multiple pattern matching
      if (!authenticated) {
        // Check for username/login prompts - various formats
        if (loginStep === 0) {
          if (lowerBuffer.includes('username') || 
              lowerBuffer.includes('login:') || 
              lowerBuffer.includes('login :') ||
              lowerBuffer.includes('user:') ||
              lowerBuffer.includes('user name') ||
              lowerBuffer.match(/user\s*:/)) {
            loginStep = 1;
            setTimeout(() => {
              socket.write(olt.username + '\r\n');
              logger.debug(`Sent username to ${olt.ip_address}`);
              dataBuffer = '';
            }, 300);
          }
        }
        
        // Check for password prompt
        if (loginStep === 1 && lowerBuffer.includes('password')) {
          loginStep = 2;
          setTimeout(() => {
            socket.write(olt.password_encrypted + '\r\n');
            logger.debug(`Sent password to ${olt.ip_address}`);
            dataBuffer = '';
          }, 300);
        }
        
        // Check if we're now logged in (various CLI prompts)
        if (loginStep === 2) {
          // Look for common CLI prompt patterns
          if (lowerBuffer.includes('#') || 
              lowerBuffer.includes('>') || 
              lowerBuffer.includes('$') ||
              lowerBuffer.includes('olt>') ||
              lowerBuffer.includes('olt#') ||
              lowerBuffer.match(/\w+[>#\$]\s*$/)) {
            authenticated = true;
            logger.info(`Telnet authenticated to ${olt.ip_address}`);
            dataBuffer = '';
            
            // Wait a bit before sending commands to let the CLI settle
            setTimeout(() => {
              sendNextCommand();
            }, 500);
          }
          // Check for login failure
          else if (lowerBuffer.includes('invalid') || 
                   lowerBuffer.includes('failed') || 
                   lowerBuffer.includes('incorrect') ||
                   lowerBuffer.includes('denied')) {
            clearTimeout(timeout);
            socket.destroy();
            reject(new Error('Telnet login failed - invalid credentials'));
            return;
          }
        }
        
        // Handle case where we get prompt immediately (some OLTs send prompt first)
        if (loginStep === 0 && loginAttempts === 0) {
          if (lowerBuffer.includes('#') || lowerBuffer.includes('>')) {
            // Some OLTs show prompt before asking for login - wait for actual prompt
            loginAttempts++;
          }
        }
      } else {
        // We're authenticated, check if ready for next command
        const lines = dataBuffer.split('\n');
        const lastLine = lines[lines.length - 1] || '';
        
        // Check for command prompt at end of output
        if (lastLine.match(/[#>$]\s*$/) || 
            lowerBuffer.endsWith('#') || 
            lowerBuffer.endsWith('> ') ||
            lowerBuffer.endsWith('# ')) {
          dataBuffer = '';
          sendNextCommand();
        }
        
        // Handle "More" prompts for pagination
        if (lowerBuffer.includes('--more--') || 
            lowerBuffer.includes('-- more --') ||
            lowerBuffer.includes('press any key') ||
            lowerBuffer.includes('continue')) {
          dataBuffer = '';
          socket.write(' '); // Send space to continue
        }
      }
    });
    
    function sendNextCommand() {
      if (commandsStarted && commandIndex > 0) {
        // Small delay between commands
      }
      
      if (commandIndex < commands.length) {
        const cmd = commands[commandIndex];
        commandIndex++;
        commandsStarted = true;
        
        setTimeout(() => {
          logger.debug(`Sending Telnet command [${commandIndex}/${commands.length}] to ${olt.name}: ${cmd}`);
          socket.write(cmd + '\r\n');
        }, 800); // Increased delay for slower OLTs
      } else if (commandIndex === commands.length) {
        commandIndex++; // Prevent sending exit multiple times
        
        // Wait for any remaining output before exiting
        setTimeout(() => {
          logger.debug(`Sending exit command to ${olt.name}`);
          socket.write('exit\r\n');
          socket.write('quit\r\n');
          
          setTimeout(() => {
            clearTimeout(timeout);
            socket.end();
            logger.info(`Telnet session complete for ${olt.name}, output length: ${output.length}`);
            resolve(output);
          }, 3000);
        }, 2000);
      }
    }
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      logger.error(`Telnet error for ${olt.ip_address}:${olt.port}:`, err.message);
      
      // If we got some output before the error, return it
      if (output.length > 100) {
        resolve(output);
      } else {
        reject(new Error(`Telnet connection error: ${err.message}`));
      }
    });
    
    socket.on('close', () => {
      clearTimeout(timeout);
      logger.debug(`Telnet connection closed for ${olt.ip_address}, output length: ${output.length}`);
      // Connection closed normally, resolve with whatever output we have
      if (!socket.destroyed) {
        resolve(output);
      }
    });
    
    socket.on('timeout', () => {
      logger.warn(`Telnet socket timeout for ${olt.ip_address}`);
      socket.destroy();
      if (output.length > 100) {
        resolve(output);
      } else {
        reject(new Error('Telnet socket timeout'));
      }
    });
    
    // Set socket timeout
    socket.setTimeout(TIMEOUT);
    
    logger.debug(`Connecting Telnet to ${olt.ip_address}:${olt.port} as ${olt.username}`);
    socket.connect(olt.port, olt.ip_address);
  });
}

/**
 * Test if Telnet port is open and responsive
 */
export async function testTelnetPort(host, port, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection timeout to ${host}:${port}`));
    }, timeoutMs);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ success: true, port, protocol: 'telnet' });
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Cannot connect to ${host}:${port}: ${err.message}`));
    });
    
    socket.connect(port, host);
  });
}
