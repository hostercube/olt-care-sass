import net from 'net';
import { logger } from '../utils/logger.js';

/**
 * Execute Telnet commands on OLT
 * Some OLTs (especially older ones or VSOL) may use Telnet instead of SSH
 */
export async function executeTelnetCommands(olt, commands) {
  return new Promise((resolve, reject) => {
    const TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '60000');
    let output = '';
    let authenticated = false;
    let commandIndex = 0;
    let loginStep = 0; // 0: waiting for username prompt, 1: waiting for password prompt, 2: logged in
    
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      logger.error(`Telnet connection timeout for ${olt.ip_address}`);
      socket.destroy();
      reject(new Error('Telnet connection timeout'));
    }, TIMEOUT);
    
    socket.on('connect', () => {
      logger.info(`Telnet connected to ${olt.ip_address}:${olt.port}`);
    });
    
    socket.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      const lowerChunk = chunk.toLowerCase();
      
      // Handle login sequence
      if (!authenticated) {
        if (loginStep === 0 && (lowerChunk.includes('username') || lowerChunk.includes('login') || lowerChunk.includes('user:'))) {
          loginStep = 1;
          socket.write(olt.username + '\r\n');
          logger.debug(`Sent username to ${olt.ip_address}`);
        } else if (loginStep === 1 && lowerChunk.includes('password')) {
          loginStep = 2;
          socket.write(olt.password_encrypted + '\r\n');
          logger.debug(`Sent password to ${olt.ip_address}`);
        } else if (loginStep === 2 && (lowerChunk.includes('#') || lowerChunk.includes('>') || lowerChunk.includes('$'))) {
          authenticated = true;
          logger.info(`Telnet authenticated to ${olt.ip_address}`);
          
          // Start sending commands
          sendNextCommand();
        }
      } else {
        // Check if ready for next command
        if (lowerChunk.includes('#') || lowerChunk.includes('>') || lowerChunk.includes('$')) {
          sendNextCommand();
        }
      }
    });
    
    function sendNextCommand() {
      if (commandIndex < commands.length) {
        const cmd = commands[commandIndex];
        commandIndex++;
        setTimeout(() => {
          logger.debug(`Sending Telnet command to ${olt.name}: ${cmd}`);
          socket.write(cmd + '\r\n');
        }, 500);
      } else if (commandIndex === commands.length) {
        commandIndex++; // Prevent sending exit multiple times
        setTimeout(() => {
          socket.write('exit\r\n');
          setTimeout(() => {
            clearTimeout(timeout);
            socket.end();
            resolve(output);
          }, 2000);
        }, 1000);
      }
    }
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      logger.error(`Telnet error for ${olt.ip_address}:`, err.message);
      reject(err);
    });
    
    socket.on('close', () => {
      clearTimeout(timeout);
      logger.debug(`Telnet connection closed for ${olt.ip_address}, output length: ${output.length}`);
    });
    
    logger.debug(`Connecting Telnet to ${olt.ip_address}:${olt.port}`);
    socket.connect(olt.port, olt.ip_address);
  });
}
