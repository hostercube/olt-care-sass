import net from 'net';
import { logger } from '../utils/logger.js';

/**
 * Execute Telnet commands on OLT
 * Enhanced for VSOL, DBC, CDATA, ECOM and other Chinese OLTs
 * 
 * IMPORTANT: Uses prompt-based command execution - waits for each command
 * to return a prompt before sending the next command.
 */
export async function executeTelnetCommands(olt, commands) {
  return new Promise((resolve, reject) => {
    const TOTAL_TIMEOUT = 300000; // 5 minutes total timeout
    const LOGIN_TIMEOUT = 30000;
    const COMMAND_TIMEOUT = 30000; // 30 seconds per command
    const PROMPT_CHECK_INTERVAL = 500; // Check for prompt every 500ms
    
    let output = '';
    let commandOutput = ''; // Output since last command
    let loginStep = 0;
    let commandIndex = 0;
    let commandsSent = false;
    let finished = false;
    let filteredCommands = [];
    let lastDataTime = Date.now();
    
    const socket = new net.Socket();
    socket.setEncoding('utf8');
    
    function finish(result, error = null) {
      if (finished) return;
      finished = true;
      clearTimeout(totalTimeout);
      clearTimeout(loginTimeout);
      
      try {
        socket.destroy();
      } catch (e) {}
      
      if (error) {
        if (output.length > 500) {
          logger.warn(`Telnet error but returning partial output: ${output.length} chars`);
          resolve(output);
        } else {
          reject(error);
        }
      } else {
        resolve(result);
      }
    }
    
    const totalTimeout = setTimeout(() => {
      logger.warn(`Telnet total timeout for ${olt.ip_address}:${olt.port} - Output: ${output.length} chars`);
      // Log what we got
      logRawOutput();
      finish(output.length > 500 ? output : null, output.length <= 500 ? new Error('Telnet timeout') : null);
    }, TOTAL_TIMEOUT);
    
    let loginTimeout = setTimeout(() => {
      if (loginStep < 5) {
        logger.warn(`Telnet login timeout at step ${loginStep}`);
        finish(null, new Error('Telnet login timeout'));
      }
    }, LOGIN_TIMEOUT);
    
    function logRawOutput() {
      logger.info(`=== RAW CLI OUTPUT START (${output.length} chars) ===`);
      console.log(output);
      logger.info(`=== RAW CLI OUTPUT END ===`);
    }
    
    function isPrompt(text) {
      const lastLine = text.split('\n').pop()?.trim() || '';
      // Check for common OLT prompts: hostname#, hostname>, OLT#, etc.
      return /[\w\-\(\)\/]+[#>]\s*$/.test(lastLine) && lastLine.length < 80;
    }
    
    function hasError(text) {
      const lower = text.toLowerCase();
      return lower.includes('invalid') || 
             lower.includes('unknown command') ||
             lower.includes('command not found') ||
             lower.includes('% unrecognized');
    }
    
    socket.on('connect', () => {
      logger.info(`Telnet connected to ${olt.ip_address}:${olt.port}`);
    });
    
    socket.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      commandOutput += chunk;
      lastDataTime = Date.now();
      
      const lowerOutput = output.toLowerCase();
      const lastLine = output.split('\n').pop()?.trim() || '';
      const lastLineLower = lastLine.toLowerCase();
      
      // Handle --More-- prompts immediately
      if (chunk.toLowerCase().includes('--more--') || 
          chunk.toLowerCase().includes('-- more --') ||
          chunk.toLowerCase().includes('press any key')) {
        socket.write(' ');
        return;
      }
      
      // Login state machine
      if (loginStep === 0) {
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
      
      if (loginStep === 1 && lowerOutput.includes('password')) {
        const lastPassIdx = lowerOutput.lastIndexOf('password');
        const lastLoginIdx = Math.max(lowerOutput.lastIndexOf('login'), lowerOutput.lastIndexOf('username'));
        if (lastPassIdx > lastLoginIdx) {
          loginStep = 2;
          setTimeout(() => {
            socket.write(olt.password_encrypted + '\r\n');
            logger.debug(`Sent login password`);
          }, 300);
        }
      }
      
      if (loginStep === 2) {
        if (lastLineLower.match(/[\w\-]+>\s*$/)) {
          loginStep = 3;
          setTimeout(() => {
            socket.write('enable\r\n');
            logger.debug(`Sent enable command`);
          }, 500);
        } else if (lastLineLower.match(/[\w\-]+#\s*$/)) {
          enterPrivilegedMode();
        } else if (lowerOutput.includes('invalid') || lowerOutput.includes('failed')) {
          finish(null, new Error('Login failed'));
        }
      }
      
      if (loginStep === 3) {
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
      
      if (loginStep === 4 && lastLineLower.match(/[\w\-]+#\s*$/)) {
        enterPrivilegedMode();
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
        
        setTimeout(() => {
          startSendingCommands();
        }, 2000);
      }, 1000);
    }
    
    function startSendingCommands() {
      if (commandsSent) return;
      commandsSent = true;
      
      // Filter commands
      filteredCommands = commands.filter(cmd => {
        const lower = cmd.toLowerCase().trim();
        return lower !== 'terminal length 0' && lower !== 'enable';
      });
      
      logger.info(`Sending ${filteredCommands.length} commands to ${olt.name}`);
      commandIndex = 0;
      commandOutput = '';
      
      sendNextCommand();
    }
    
    function sendNextCommand() {
      if (finished) return;
      
      if (commandIndex >= filteredCommands.length) {
        // All commands sent, wait a bit then finish
        logger.info(`All commands sent to ${olt.name}, waiting for final output...`);
        setTimeout(() => {
          finishSession();
        }, 5000);
        return;
      }
      
      const cmd = filteredCommands[commandIndex];
      logger.debug(`[${commandIndex + 1}/${filteredCommands.length}] Sending: ${cmd}`);
      
      commandOutput = '';
      socket.write(cmd + '\r\n');
      
      // Wait for command to complete (prompt appears) or timeout
      waitForCommandComplete(cmd);
    }
    
    function waitForCommandComplete(cmd) {
      let elapsed = 0;
      let lastLength = 0;
      let stableCount = 0;
      
      const checkInterval = setInterval(() => {
        if (finished) {
          clearInterval(checkInterval);
          return;
        }
        
        elapsed += PROMPT_CHECK_INTERVAL;
        
        // Check if output is stable (no new data for 2+ checks) and has a prompt
        if (commandOutput.length === lastLength) {
          stableCount++;
        } else {
          stableCount = 0;
          lastLength = commandOutput.length;
        }
        
        // If stable for 1.5s and we see a prompt, move to next command
        if (stableCount >= 3 && isPrompt(commandOutput)) {
          clearInterval(checkInterval);
          commandIndex++;
          setTimeout(sendNextCommand, 500);
          return;
        }
        
        // Timeout for this command
        if (elapsed >= COMMAND_TIMEOUT) {
          clearInterval(checkInterval);
          logger.warn(`Command timeout: ${cmd}`);
          commandIndex++;
          setTimeout(sendNextCommand, 500);
          return;
        }
      }, PROMPT_CHECK_INTERVAL);
    }
    
    function finishSession() {
      if (finished) return;
      
      logger.info(`Telnet session complete for ${olt.name}, output length: ${output.length}`);
      
      // Log full raw output for debugging
      logRawOutput();
      
      // Send exit
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
      logger.debug(`Telnet connection closed, output: ${output.length} chars`);
      if (!finished) {
        finish(output);
      }
    });
    
    socket.on('timeout', () => {
      logger.warn(`Telnet socket timeout`);
      finish(null, new Error('Telnet socket timeout'));
    });
    
    socket.setTimeout(TOTAL_TIMEOUT);
    
    logger.debug(`Connecting Telnet to ${olt.ip_address}:${olt.port}`);
    socket.connect(olt.port, olt.ip_address);
  });
}

/**
 * Test if Telnet port is open
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
