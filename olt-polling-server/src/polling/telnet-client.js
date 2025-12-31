import net from 'net';
import { logger } from '../utils/logger.js';

/**
 * Execute Telnet commands on OLT
 * Enhanced for VSOL, DBC, CDATA, ECOM and other Chinese OLTs
 * Handles various login prompts, enable mode, and CLI modes
 * 
 * IMPORTANT: This client properly handles:
 * - Login sequence (username -> password)
 * - Enable mode with separate enable password
 * - Pagination (--More--)
 * - Command completion detection
 * - Port forwarding scenarios (e.g., 8045 -> 23)
 */
export async function executeTelnetCommands(olt, commands) {
  return new Promise((resolve, reject) => {
    const TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '180000'); // 3 minutes timeout
    const COMMAND_DELAY = 2000; // 2 seconds between commands
    const COMMAND_WAIT = 5000; // Wait 5 seconds for command output
    
    let output = '';
    let authenticated = false;
    let commandIndex = 0;
    let loginStep = 0; 
    // 0: waiting for username prompt
    // 1: sent username, waiting for password prompt
    // 2: sent password, waiting for prompt
    // 3: in user mode (>), sent enable command
    // 4: sent enable password
    // 5: fully authenticated in enable mode (#)
    let dataBuffer = '';
    let lastDataTime = Date.now();
    let commandsStarted = false;
    let allCommandsSent = false;
    let waitingForOutput = false;
    
    const socket = new net.Socket();
    socket.setEncoding('utf8');
    
    // Track if we resolved/rejected to prevent double calls
    let finished = false;
    
    function finish(result, error = null) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      
      if (error) {
        if (output.length > 100) {
          // We got some data, return what we have
          logger.warn(`Telnet error but returning partial output: ${output.length} chars`);
          resolve(output);
        } else {
          reject(error);
        }
      } else {
        resolve(result);
      }
    }
    
    const timeout = setTimeout(() => {
      logger.warn(`Telnet timeout for ${olt.ip_address}:${olt.port} - Output: ${output.length} chars`);
      socket.destroy();
      finish(output.length > 100 ? output : null, output.length <= 100 ? new Error('Telnet timeout') : null);
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
        handleLoginSequence(lowerBuffer);
      } else {
        handleAuthenticatedData(lowerBuffer);
      }
    });
    
    function handleLoginSequence(lowerBuffer) {
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
            logger.debug(`Sent username: ${olt.username}`);
            dataBuffer = '';
          }, 500);
        }
      }
      
      // Check for password prompt (initial login) - only if we've sent username
      if (loginStep === 1 && lowerBuffer.includes('password')) {
        loginStep = 2;
        setTimeout(() => {
          socket.write(olt.password_encrypted + '\r\n');
          logger.debug(`Sent login password`);
          dataBuffer = '';
        }, 500);
      }
      
      // Check if we're now logged in (various CLI prompts)
      if (loginStep === 2) {
        // Check for user mode prompt (>) - need to escalate to enable mode
        if (lowerBuffer.match(/[\w\-]+>\s*$/) && !lowerBuffer.includes('#')) {
          // In user mode, need to escalate to enable mode
          loginStep = 3;
          setTimeout(() => {
            socket.write('enable\r\n');
            logger.debug(`Sending enable command`);
            dataBuffer = '';
          }, 1000);
        }
        // Already in privileged mode (#)
        else if (lowerBuffer.match(/[\w\-]+#\s*$/)) {
          enterPrivilegedMode();
        }
        // Check for login failure
        else if (lowerBuffer.includes('invalid') || 
                 lowerBuffer.includes('failed') || 
                 lowerBuffer.includes('incorrect') ||
                 lowerBuffer.includes('denied') ||
                 lowerBuffer.includes('bad password')) {
          finish(null, new Error('Telnet login failed - invalid credentials'));
          socket.destroy();
          return;
        }
      }
      
      // Handle enable password prompt (step 3)
      if (loginStep === 3 && lowerBuffer.includes('password')) {
        loginStep = 4;
        setTimeout(() => {
          socket.write(olt.password_encrypted + '\r\n');
          logger.debug(`Sent enable password`);
          dataBuffer = '';
        }, 500);
      }
      
      // Check if we're now in enable mode (after sending enable or enable password)
      if (loginStep === 3 || loginStep === 4) {
        if (lowerBuffer.match(/[\w\-]+#\s*$/)) {
          enterPrivilegedMode();
        }
        // Some OLTs go directly to enable mode without password after a delay
        else if (loginStep === 3 && !lowerBuffer.includes('password')) {
          setTimeout(() => {
            const currentBuffer = dataBuffer.toLowerCase();
            if (currentBuffer.match(/[\w\-]+#\s*$/)) {
              enterPrivilegedMode();
            } else if (currentBuffer.match(/[\w\-]+>\s*$/)) {
              // Still in user mode, send enable again
              socket.write('enable\r\n');
              dataBuffer = '';
            }
          }, 2000);
        }
      }
    }
    
    function enterPrivilegedMode() {
      if (authenticated) return; // Prevent duplicate calls
      authenticated = true;
      loginStep = 5;
      logger.info(`Telnet authenticated (enable mode) at ${olt.ip_address}`);
      dataBuffer = '';
      
      // Send terminal length 0 first to disable paging, then start commands
      setTimeout(() => {
        socket.write('terminal length 0\r\n');
        logger.debug(`Sent: terminal length 0`);
        
        setTimeout(() => {
          startSendingCommands();
        }, COMMAND_DELAY);
      }, 1000);
    }
    
    function handleAuthenticatedData(lowerBuffer) {
      // Handle "More" prompts for pagination
      if (lowerBuffer.includes('--more--') || 
          lowerBuffer.includes('-- more --') ||
          lowerBuffer.includes('press any key') ||
          lowerBuffer.match(/continue\s*\?/i)) {
        dataBuffer = '';
        socket.write(' '); // Send space to continue
        return;
      }
      
      // Check for command prompt at end of output (ready for next command)
      const lines = dataBuffer.split('\n');
      const lastLine = (lines[lines.length - 1] || '').trim();
      
      if (waitingForOutput) {
        // Wait for prompt indicating command completion
        if (lastLine.match(/[#>]\s*$/) || 
            lowerBuffer.endsWith('#') || 
            lowerBuffer.endsWith('> ') ||
            lowerBuffer.endsWith('# ')) {
          waitingForOutput = false;
          dataBuffer = '';
          
          if (!allCommandsSent) {
            // More commands to send
            setTimeout(() => sendNextCommand(), COMMAND_DELAY);
          } else {
            // All commands sent and completed
            finishSession();
          }
        }
      }
    }
    
    function startSendingCommands() {
      if (commandsStarted) return;
      commandsStarted = true;
      logger.info(`Starting to send ${commands.length} commands to ${olt.name}`);
      sendNextCommand();
    }
    
    function sendNextCommand() {
      if (commandIndex < commands.length) {
        const cmd = commands[commandIndex];
        commandIndex++;
        
        // Skip duplicate terminal length command
        if (cmd.toLowerCase() === 'terminal length 0' && commandIndex > 1) {
          sendNextCommand();
          return;
        }
        
        // Skip enable command if already in enable mode
        if (cmd.toLowerCase() === 'enable' && authenticated) {
          sendNextCommand();
          return;
        }
        
        logger.debug(`Sending command [${commandIndex}/${commands.length}]: ${cmd}`);
        socket.write(cmd + '\r\n');
        waitingForOutput = true;
        dataBuffer = '';
        
        // Set a timeout to move on if no prompt received
        setTimeout(() => {
          if (waitingForOutput && commandIndex < commands.length) {
            logger.debug(`Command timeout, moving to next command`);
            waitingForOutput = false;
            sendNextCommand();
          } else if (waitingForOutput && commandIndex >= commands.length) {
            allCommandsSent = true;
            finishSession();
          }
        }, COMMAND_WAIT);
      } else {
        allCommandsSent = true;
        finishSession();
      }
    }
    
    function finishSession() {
      if (finished) return;
      
      logger.debug(`All commands completed, closing session`);
      
      // Wait a bit for any remaining output
      setTimeout(() => {
        socket.write('exit\r\n');
        
        setTimeout(() => {
          socket.write('quit\r\n');
          
          setTimeout(() => {
            logger.info(`Telnet session complete for ${olt.name}, output length: ${output.length}`);
            socket.destroy();
            finish(output);
          }, 2000);
        }, 1000);
      }, 2000);
    }
    
    socket.on('error', (err) => {
      logger.error(`Telnet error for ${olt.ip_address}:${olt.port}:`, err.message);
      finish(null, new Error(`Telnet connection error: ${err.message}`));
    });
    
    socket.on('close', () => {
      logger.debug(`Telnet connection closed for ${olt.ip_address}, output: ${output.length} chars`);
      if (!finished) {
        finish(output);
      }
    });
    
    socket.on('timeout', () => {
      logger.warn(`Telnet socket timeout for ${olt.ip_address}`);
      socket.destroy();
      finish(null, new Error('Telnet socket timeout'));
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
