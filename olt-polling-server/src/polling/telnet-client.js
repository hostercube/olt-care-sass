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
    const TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '180000'); // 3 minutes total timeout
    const LOGIN_TIMEOUT = 30000; // 30 seconds for login
    const COMMAND_OUTPUT_WAIT = 8000; // Wait 8 seconds for each command output
    const POST_COMMANDS_WAIT = 10000; // Wait 10 seconds after all commands for remaining output
    
    let output = '';
    let loginStep = 0; 
    // 0: waiting for login prompt
    // 1: sent username, waiting for password
    // 2: sent password, waiting for prompt
    // 3: in user mode (>), sent enable
    // 4: sent enable password
    // 5: authenticated in enable mode (#)
    // 6: sent terminal length 0
    // 7: commands started
    // 8: all commands sent, waiting for output
    
    let commandIndex = 0;
    let commandsSent = false;
    let finished = false;
    
    const socket = new net.Socket();
    socket.setEncoding('utf8');
    
    function finish(result, error = null) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      clearTimeout(loginTimeout);
      
      try {
        socket.destroy();
      } catch (e) {}
      
      if (error) {
        if (output.length > 200) {
          // Got significant data, return what we have
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
      logger.warn(`Telnet total timeout for ${olt.ip_address}:${olt.port} - Output: ${output.length} chars`);
      finish(output.length > 200 ? output : null, output.length <= 200 ? new Error('Telnet timeout') : null);
    }, TIMEOUT);
    
    let loginTimeout = setTimeout(() => {
      if (loginStep < 5) {
        logger.warn(`Telnet login timeout for ${olt.ip_address} at step ${loginStep}`);
        finish(null, new Error('Telnet login timeout'));
      }
    }, LOGIN_TIMEOUT);
    
    socket.on('connect', () => {
      logger.info(`Telnet connected to ${olt.ip_address}:${olt.port}`);
    });
    
    socket.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      const lowerOutput = output.toLowerCase();
      const lastLine = output.split('\n').pop()?.trim() || '';
      const lastLineLower = lastLine.toLowerCase();
      
      // Handle login sequence
      if (loginStep === 0) {
        // Wait for login prompt
        if (lowerOutput.includes('login:') || 
            lowerOutput.includes('username') || 
            lowerOutput.includes('user:') ||
            lowerOutput.match(/user\s*name/i)) {
          loginStep = 1;
          setTimeout(() => {
            socket.write(olt.username + '\r\n');
            logger.debug(`Sent username: ${olt.username}`);
          }, 300);
        }
      }
      
      if (loginStep === 1) {
        // Wait for password prompt after sending username
        if (lowerOutput.includes('password') && 
            (lowerOutput.lastIndexOf('password') > lowerOutput.lastIndexOf('login'))) {
          loginStep = 2;
          setTimeout(() => {
            socket.write(olt.password_encrypted + '\r\n');
            logger.debug(`Sent login password`);
          }, 300);
        }
      }
      
      if (loginStep === 2) {
        // Check login result
        if (lastLineLower.match(/[\w\-]+>\s*$/)) {
          // User mode - need to enable
          loginStep = 3;
          setTimeout(() => {
            socket.write('enable\r\n');
            logger.debug(`Sent enable command`);
          }, 500);
        } else if (lastLineLower.match(/[\w\-]+#\s*$/)) {
          // Already in privileged mode
          enterPrivilegedMode();
        } else if (lowerOutput.includes('invalid') || 
                   lowerOutput.includes('failed') || 
                   lowerOutput.includes('incorrect') ||
                   lowerOutput.includes('denied')) {
          finish(null, new Error('Login failed - invalid credentials'));
        }
      }
      
      if (loginStep === 3) {
        // Sent enable, check for password prompt or direct entry
        if (lastLineLower.includes('password')) {
          loginStep = 4;
          setTimeout(() => {
            socket.write(olt.password_encrypted + '\r\n');
            logger.debug(`Sent enable password`);
          }, 300);
        } else if (lastLineLower.match(/[\w\-]+#\s*$/)) {
          enterPrivilegedMode();
        }
      }
      
      if (loginStep === 4) {
        // Sent enable password, check for privileged prompt
        if (lastLineLower.match(/[\w\-]+#\s*$/)) {
          enterPrivilegedMode();
        }
      }
      
      // Handle More prompts during command execution
      if (loginStep >= 6) {
        if (lowerOutput.includes('--more--') || 
            lowerOutput.includes('-- more --') ||
            lowerOutput.includes('press any key')) {
          socket.write(' '); // Send space to continue
        }
      }
    });
    
    function enterPrivilegedMode() {
      if (loginStep >= 5) return;
      loginStep = 5;
      clearTimeout(loginTimeout);
      logger.info(`Telnet authenticated (enable mode) at ${olt.ip_address}`);
      
      // Send terminal length 0 first
      setTimeout(() => {
        socket.write('terminal length 0\r\n');
        loginStep = 6;
        logger.debug(`Sent: terminal length 0`);
        
        // Start sending commands after a delay
        setTimeout(() => {
          startSendingCommands();
        }, 2000);
      }, 1000);
    }
    
    function startSendingCommands() {
      if (commandsSent) return;
      commandsSent = true;
      loginStep = 7;
      
      // Filter out commands we already sent
      const filteredCommands = commands.filter(cmd => {
        const lower = cmd.toLowerCase().trim();
        return lower !== 'terminal length 0' && lower !== 'enable';
      });
      
      logger.info(`Starting to send ${filteredCommands.length} commands to ${olt.name}`);
      
      // Send all commands with delays between them
      filteredCommands.forEach((cmd, index) => {
        setTimeout(() => {
          logger.debug(`Sending command [${index + 1}/${filteredCommands.length}]: ${cmd}`);
          socket.write(cmd + '\r\n');
          
          // After last command, wait for output then finish
          if (index === filteredCommands.length - 1) {
            loginStep = 8;
            // Wait for all command output to arrive
            setTimeout(() => {
              finishSession();
            }, POST_COMMANDS_WAIT);
          }
        }, index * COMMAND_OUTPUT_WAIT);
      });
      
      // If no commands to send, finish immediately
      if (filteredCommands.length === 0) {
        setTimeout(finishSession, 2000);
      }
    }
    
    function finishSession() {
      if (finished) return;
      
      logger.info(`Telnet session complete for ${olt.name}, output length: ${output.length}`);
      
      // Log the full raw output for debugging (truncated for log file)
      if (output.length > 0) {
        const lines = output.split('\n');
        logger.debug(`Raw output has ${lines.length} lines`);
        // Log first 20 and last 20 lines for debugging
        const sample = lines.length <= 40 
          ? lines.join('\n')
          : [...lines.slice(0, 20), '...', ...lines.slice(-20)].join('\n');
        logger.debug(`Output sample:\n${sample}`);
      }
      
      // Send exit commands
      socket.write('exit\r\n');
      setTimeout(() => {
        socket.write('quit\r\n');
        setTimeout(() => {
          finish(output);
        }, 1000);
      }, 500);
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
      finish(null, new Error('Telnet socket timeout'));
    });
    
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
