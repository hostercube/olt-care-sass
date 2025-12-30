import { Client } from 'ssh2';
import { logger } from '../utils/logger.js';
import { parseZTEOutput } from './parsers/zte-parser.js';
import { parseHuaweiOutput } from './parsers/huawei-parser.js';
import { parseVSOLOutput } from './parsers/vsol-parser.js';
import { parseDBCOutput } from './parsers/dbc-parser.js';
import { parseCDATAOutput } from './parsers/cdata-parser.js';
import { parseECOMOutput } from './parsers/ecom-parser.js';
import { executeTelnetCommands } from './telnet-client.js';

const SSH_TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '60000');

/**
 * Poll an OLT device via SSH/Telnet and sync data to database
 */
export async function pollOLT(supabase, olt) {
  const startTime = Date.now();
  
  try {
    // Get commands for this OLT brand
    const commands = getOLTCommands(olt.brand);
    
    // Try SSH first, if fails try Telnet (for older OLTs or VSOL)
    let output;
    try {
      logger.info(`Attempting SSH connection to ${olt.name} (${olt.ip_address}:${olt.port})`);
      output = await executeSSHCommands(olt);
    } catch (sshError) {
      logger.warn(`SSH failed for ${olt.name}: ${sshError.message}, trying Telnet...`);
      
      // Try Telnet as fallback
      try {
        output = await executeTelnetCommands(olt, commands);
      } catch (telnetError) {
        logger.error(`Both SSH and Telnet failed for ${olt.name}`);
        throw new Error(`Connection failed - SSH: ${sshError.message}, Telnet: ${telnetError.message}`);
      }
    }
    
    // Parse output based on OLT brand
    const onus = parseOLTOutput(olt.brand, output);
    
    logger.info(`Parsed ${onus.length} ONUs from ${olt.name}`);
    
    // Sync ONUs to database
    await syncONUsToDatabase(supabase, olt.id, onus);
    
    // Update OLT status and last_polled timestamp
    await supabase
      .from('olts')
      .update({
        status: 'online',
        last_polled: new Date().toISOString(),
        active_ports: onus.filter(o => o.status === 'online').length
      })
      .eq('id', olt.id);
    
    const duration = Date.now() - startTime;
    logger.info(`Poll completed for ${olt.name} in ${duration}ms`);
    
    return { onuCount: onus.length, duration };
  } catch (error) {
    logger.error(`Failed to poll OLT ${olt.name}:`, error);
    throw error;
  }
}

/**
 * Execute SSH commands on OLT
 */
async function executeSSHCommands(olt) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';
    let commandsSent = false;
    
    const timeout = setTimeout(() => {
      logger.error(`SSH connection timeout for ${olt.ip_address}`);
      conn.end();
      reject(new Error('SSH connection timeout'));
    }, SSH_TIMEOUT);
    
    conn.on('ready', () => {
      logger.info(`SSH connected to ${olt.ip_address}:${olt.port}`);
      
      conn.shell({ term: 'vt100' }, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          logger.error(`Shell error for ${olt.ip_address}:`, err);
          reject(err);
          return;
        }
        
        stream.on('close', () => {
          clearTimeout(timeout);
          conn.end();
          logger.debug(`SSH session closed for ${olt.ip_address}, output length: ${output.length}`);
          resolve(output);
        });
        
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          logger.warn(`SSH stderr from ${olt.ip_address}: ${data.toString()}`);
        });
        
        // Wait for initial prompt before sending commands
        setTimeout(() => {
          if (!commandsSent) {
            commandsSent = true;
            const commands = getOLTCommands(olt.brand);
            logger.debug(`Sending ${commands.length} commands to ${olt.name}`);
            
            commands.forEach((cmd, index) => {
              setTimeout(() => {
                logger.debug(`Sending command to ${olt.name}: ${cmd}`);
                stream.write(cmd + '\r\n');
              }, index * 1000); // Increased delay between commands
            });
            
            // Close stream after commands with more wait time
            setTimeout(() => {
              stream.write('exit\r\n');
              setTimeout(() => {
                stream.end();
              }, 2000);
            }, commands.length * 1000 + 8000);
          }
        }, 2000); // Wait 2 seconds for initial prompt
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      logger.error(`SSH error for ${olt.ip_address}:${olt.port}:`, err.message);
      reject(err);
    });
    
    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      // Handle keyboard-interactive auth (some OLTs use this)
      logger.debug(`Keyboard-interactive auth for ${olt.ip_address}`);
      finish([olt.password_encrypted]);
    });
    
    logger.debug(`Connecting SSH to ${olt.ip_address}:${olt.port} as ${olt.username}`);
    
    conn.connect({
      host: olt.ip_address,
      port: olt.port,
      username: olt.username,
      password: olt.password_encrypted,
      readyTimeout: SSH_TIMEOUT,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      tryKeyboard: true, // Enable keyboard-interactive auth
      algorithms: {
        kex: [
          'curve25519-sha256',
          'curve25519-sha256@libssh.org',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group16-sha512',
          'diffie-hellman-group18-sha512',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com',
          'aes128-cbc',
          'aes192-cbc',
          'aes256-cbc',
          '3des-cbc'
        ],
        serverHostKey: [
          'ssh-rsa',
          'ssh-dss',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'ssh-ed25519',
          'rsa-sha2-256',
          'rsa-sha2-512'
        ],
        hmac: [
          'hmac-sha2-256',
          'hmac-sha2-512',
          'hmac-sha1',
          'hmac-md5'
        ]
      }
    });
  });
}

/**
 * Get CLI commands for specific OLT brand
 */
function getOLTCommands(brand) {
  switch (brand) {
    case 'ZTE':
      return [
        'terminal length 0',
        'show gpon onu state',
        'show gpon onu detail-info',
        'show gpon onu optical-info'
      ];
    case 'Huawei':
      return [
        'screen-length 0 temporary',
        'display ont info summary all',
        'display ont optical-info all'
      ];
    case 'Fiberhome':
      return [
        'show gpon onu state',
        'show gpon onu list'
      ];
    case 'VSOL':
      return [
        'terminal length 0',
        'show onu status all',
        'show onu optical-info all',
        'show onu info all'
      ];
    case 'DBC':
      return [
        'terminal length 0',
        'show onu status',
        'show onu optical-power',
        'show onu list'
      ];
    case 'CDATA':
      return [
        'terminal length 0',
        'show onu status all',
        'show onu optical-info all',
        'show onu list'
      ];
    case 'ECOM':
      return [
        'terminal length 0',
        'show gpon onu state',
        'show gpon onu optical',
        'show gpon onu info'
      ];
    case 'BDCOM':
      return [
        'terminal length 0',
        'show epon onu-info',
        'show epon optical-transceiver-diagnosis interface'
      ];
    default:
      return [
        'show onu status',
        'show onu list'
      ];
  }
}

/**
 * Parse OLT output based on brand
 */
function parseOLTOutput(brand, output) {
  switch (brand) {
    case 'ZTE':
      return parseZTEOutput(output);
    case 'Huawei':
      return parseHuaweiOutput(output);
    case 'VSOL':
      return parseVSOLOutput(output);
    case 'Fiberhome':
      return parseVSOLOutput(output); // Similar format to VSOL
    case 'DBC':
      return parseDBCOutput(output);
    case 'CDATA':
      return parseCDATAOutput(output);
    case 'ECOM':
      return parseECOMOutput(output);
    case 'BDCOM':
      return parseVSOLOutput(output); // Try VSOL parser for BDCOM
    default:
      logger.warn(`No parser available for brand: ${brand}, trying generic parser`);
      return parseVSOLOutput(output); // Try VSOL parser as generic fallback
  }
}

/**
 * Sync parsed ONUs to database
 */
async function syncONUsToDatabase(supabase, oltId, onus) {
  // Get existing ONUs for this OLT
  const { data: existingONUs } = await supabase
    .from('onus')
    .select('id, serial_number, status')
    .eq('olt_id', oltId);
  
  const existingMap = new Map(existingONUs?.map(o => [o.serial_number, o]) || []);
  
  for (const onu of onus) {
    const existing = existingMap.get(onu.serial_number);
    
    if (existing) {
      // Update existing ONU
      const wasOffline = existing.status === 'offline';
      const isNowOnline = onu.status === 'online';
      const wasOnline = existing.status === 'online';
      const isNowOffline = onu.status === 'offline';
      
      const updateData = {
        name: onu.name || existing.name,
        status: onu.status,
        rx_power: onu.rx_power,
        tx_power: onu.tx_power,
        updated_at: new Date().toISOString()
      };
      
      if (wasOffline && isNowOnline) {
        updateData.last_online = new Date().toISOString();
      }
      if (wasOnline && isNowOffline) {
        updateData.last_offline = new Date().toISOString();
        
        // Create alert for ONU going offline
        await supabase.from('alerts').insert({
          type: 'onu_offline',
          severity: 'warning',
          title: `ONU Offline: ${onu.name || onu.serial_number}`,
          message: `ONU ${onu.serial_number} on port ${onu.pon_port} went offline`,
          device_id: existing.id,
          device_name: onu.name || onu.serial_number
        });
      }
      
      await supabase
        .from('onus')
        .update(updateData)
        .eq('id', existing.id);
      
      // Record power reading
      if (onu.rx_power !== null || onu.tx_power !== null) {
        await supabase.from('power_readings').insert({
          onu_id: existing.id,
          rx_power: onu.rx_power || 0,
          tx_power: onu.tx_power || 0
        });
      }
      
      // Check for low power
      if (onu.rx_power && onu.rx_power < -28) {
        await supabase.from('alerts').insert({
          type: 'power_drop',
          severity: 'warning',
          title: `Low RX Power: ${onu.name || onu.serial_number}`,
          message: `RX power is ${onu.rx_power} dBm (threshold: -28 dBm)`,
          device_id: existing.id,
          device_name: onu.name || onu.serial_number
        });
      }
    } else {
      // Insert new ONU
      const { data: newONU } = await supabase
        .from('onus')
        .insert({
          olt_id: oltId,
          name: onu.name || `ONU-${onu.serial_number}`,
          serial_number: onu.serial_number,
          pon_port: onu.pon_port,
          onu_index: onu.onu_index,
          status: onu.status,
          rx_power: onu.rx_power,
          tx_power: onu.tx_power,
          mac_address: onu.mac_address,
          last_online: onu.status === 'online' ? new Date().toISOString() : null
        })
        .select()
        .single();
      
      logger.info(`New ONU discovered: ${onu.serial_number}`);
    }
  }
}
