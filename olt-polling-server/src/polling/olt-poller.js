import { Client } from 'ssh2';
import { logger } from '../utils/logger.js';
import { parseZTEOutput } from './parsers/zte-parser.js';
import { parseHuaweiOutput } from './parsers/huawei-parser.js';
import { parseVSOLOutput } from './parsers/vsol-parser.js';
import { parseDBCOutput } from './parsers/dbc-parser.js';
import { parseCDATAOutput } from './parsers/cdata-parser.js';
import { parseECOMOutput } from './parsers/ecom-parser.js';
import { executeTelnetCommands } from './telnet-client.js';
import { executeAPICommands, parseAPIResponse } from './http-api-client.js';
import { fetchMikroTikPPPoE, fetchMikroTikARP, fetchMikroTikDHCPLeases, enrichONUWithMikroTikData } from './mikrotik-client.js';
import net from 'net';

const SSH_TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '60000');
const CONNECTION_TIMEOUT = 15000;

/**
 * Determine connection method based on port number
 * Port 22 = SSH (ZTE, Huawei, Nokia)
 * Port 23 = Telnet (VSOL, DBC, CDATA, ECOM, BDCOM, Fiberhome)
 * Port 80, 443, 8080, 8041 = HTTP/HTTPS API
 * Port 161 = SNMP (read-only status)
 * Custom ports (8085, 2323, etc.) = Telnet first for Chinese brands
 */
function getConnectionType(port, brand) {
  // Standard protocol ports
  if (port === 22) return 'ssh';
  if (port === 23) return 'telnet';
  if (port === 161) return 'snmp';
  if ([80, 443, 8080, 8041].includes(port)) return 'http';
  
  // Custom ports - determine by brand
  // Chinese OLT brands (VSOL, DBC, CDATA, ECOM, BDCOM) typically use Telnet on custom ports
  const telnetBrands = ['VSOL', 'DBC', 'CDATA', 'ECOM', 'BDCOM', 'Fiberhome'];
  if (telnetBrands.includes(brand)) return 'telnet_first';
  
  // SSH-first for major brands (ZTE, Huawei, Nokia)
  const sshBrands = ['ZTE', 'Huawei', 'Nokia'];
  if (sshBrands.includes(brand)) return 'ssh_first';
  
  // Default: try both with Telnet first (most flexible)
  return 'auto_detect';
}

/**
 * Poll an OLT device via SSH/Telnet/API and sync data to database
 */
export async function pollOLT(supabase, olt) {
  const startTime = Date.now();
  
  try {
    const commands = getOLTCommands(olt.brand);
    let output;
    let onus = [];
    
    const connectionType = getConnectionType(olt.port, olt.brand);
    logger.info(`Polling ${olt.name} (${olt.ip_address}:${olt.port}) - Connection type: ${connectionType}`);
    
    switch (connectionType) {
      case 'http':
        logger.info(`Using HTTP API for ${olt.name}`);
        const apiResponse = await executeAPICommands(olt);
        onus = parseAPIResponse(olt.brand, apiResponse);
        break;
        
      case 'ssh':
        logger.info(`Using SSH for ${olt.name}`);
        output = await executeSSHCommands(olt);
        onus = parseOLTOutput(olt.brand, output);
        break;
        
      case 'telnet':
        logger.info(`Using Telnet for ${olt.name}`);
        output = await executeTelnetCommands(olt, commands);
        onus = parseOLTOutput(olt.brand, output);
        break;
        
      case 'telnet_first':
        // Try Telnet first, fallback to SSH
        try {
          logger.info(`Trying Telnet first for ${olt.name}`);
          output = await executeTelnetCommands(olt, commands);
        } catch (telnetError) {
          logger.warn(`Telnet failed for ${olt.name}: ${telnetError.message}, trying SSH...`);
          output = await executeSSHCommands(olt);
        }
        onus = parseOLTOutput(olt.brand, output);
        break;
        
      case 'ssh_first':
        // Try SSH first, fallback to Telnet
        try {
          logger.info(`Trying SSH first for ${olt.name}`);
          output = await executeSSHCommands(olt);
        } catch (sshError) {
          logger.warn(`SSH failed for ${olt.name}: ${sshError.message}, trying Telnet...`);
          output = await executeTelnetCommands(olt, commands);
        }
        onus = parseOLTOutput(olt.brand, output);
        break;
        
      case 'snmp':
        logger.info(`Using SNMP for ${olt.name}`);
        // SNMP polling (basic status only)
        const snmpResult = await executeSNMPPoll(olt);
        onus = snmpResult;
        break;
        
      case 'auto_detect':
      default:
        // Auto-detect: Try Telnet -> SSH -> HTTP
        try {
          logger.info(`Auto-detect: Trying Telnet for ${olt.name}`);
          output = await executeTelnetCommands(olt, commands);
          onus = parseOLTOutput(olt.brand, output);
        } catch (telnetErr) {
          logger.warn(`Telnet failed, trying SSH for ${olt.name}...`);
          try {
            output = await executeSSHCommands(olt);
            onus = parseOLTOutput(olt.brand, output);
          } catch (sshErr) {
            logger.warn(`SSH failed, trying HTTP API for ${olt.name}...`);
            const apiResponse = await executeAPICommands(olt);
            onus = parseAPIResponse(olt.brand, apiResponse);
          }
        }
        break;
    }
    
    logger.info(`Parsed ${onus.length} ONUs from ${olt.name}`);
    
    // Enrich with MikroTik data if configured
    if (olt.mikrotik_ip && olt.mikrotik_username) {
      logger.info(`Fetching MikroTik data for ${olt.name}...`);
      const mikrotik = {
        ip: olt.mikrotik_ip,
        port: olt.mikrotik_port || 8728,
        username: olt.mikrotik_username,
        password: olt.mikrotik_password_encrypted,
      };
      
      try {
        const [pppoeData, arpData, dhcpData] = await Promise.all([
          fetchMikroTikPPPoE(mikrotik),
          fetchMikroTikARP(mikrotik),
          fetchMikroTikDHCPLeases(mikrotik),
        ]);
        
        onus = onus.map(onu => enrichONUWithMikroTikData(onu, pppoeData, arpData, dhcpData));
        logger.info(`Enriched ${onus.length} ONUs with MikroTik data`);
      } catch (mtError) {
        logger.warn(`MikroTik enrichment failed: ${mtError.message}`);
      }
    }
    
    await syncONUsToDatabase(supabase, olt.id, onus);
    
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
              }, index * 1000);
            });
            
            // Close stream after commands
            setTimeout(() => {
              stream.write('exit\r\n');
              setTimeout(() => {
                stream.end();
              }, 2000);
            }, commands.length * 1000 + 8000);
          }
        }, 2000);
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      logger.error(`SSH error for ${olt.ip_address}:${olt.port}:`, err.message);
      reject(err);
    });
    
    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
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
      tryKeyboard: true,
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
    case 'Nokia':
      return [
        'environment no more',
        'show equipment ont status',
        'show equipment ont optics'
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
      return parseVSOLOutput(output);
    case 'DBC':
      return parseDBCOutput(output);
    case 'CDATA':
      return parseCDATAOutput(output);
    case 'ECOM':
      return parseECOMOutput(output);
    case 'BDCOM':
      return parseVSOLOutput(output);
    case 'Nokia':
      return parseVSOLOutput(output);
    default:
      logger.warn(`No parser available for brand: ${brand}, trying generic parser`);
      return parseVSOLOutput(output);
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

/**
 * Test OLT connection without polling data
 */
export async function testOLTConnection(olt) {
  const startTime = Date.now();
  const connectionType = getConnectionType(olt.port, olt.brand);
  
  logger.info(`Testing connection to ${olt.ip_address}:${olt.port} (${connectionType})`);
  
  try {
    switch (connectionType) {
      case 'http':
        return await testHTTPConnection(olt);
        
      case 'ssh':
        return await testSSHConnection(olt);
        
      case 'telnet':
        return await testTelnetConnection(olt);
        
      case 'telnet_first':
        // Try Telnet first
        try {
          return await testTelnetConnection(olt);
        } catch (telnetErr) {
          logger.warn(`Telnet failed, trying SSH fallback`);
          try {
            return await testSSHConnection(olt);
          } catch (sshErr) {
            throw new Error(`Telnet: ${telnetErr.message}, SSH: ${sshErr.message}`);
          }
        }
        
      case 'ssh_first':
        // Try SSH first
        try {
          return await testSSHConnection(olt);
        } catch (sshErr) {
          logger.warn(`SSH failed, trying Telnet fallback`);
          try {
            return await testTelnetConnection(olt);
          } catch (telnetErr) {
            throw new Error(`SSH: ${sshErr.message}, Telnet: ${telnetErr.message}`);
          }
        }
        
      case 'snmp':
        return await testSNMPConnection(olt);
        
      case 'auto_detect':
      default:
        // Auto-detect: Try Telnet -> SSH -> HTTP
        try {
          return await testTelnetConnection(olt);
        } catch (telnetErr) {
          try {
            return await testSSHConnection(olt);
          } catch (sshErr) {
            try {
              return await testHTTPConnection(olt);
            } catch (httpErr) {
              throw new Error(`Telnet: ${telnetErr.message}, SSH: ${sshErr.message}, HTTP: ${httpErr.message}`);
            }
          }
        }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      duration: Date.now() - startTime 
    };
  }
}

/**
 * Test HTTP/HTTPS API connection
 */
async function testHTTPConnection(olt) {
  const startTime = Date.now();
  const protocol = olt.port === 443 || olt.port === 8041 ? 'https' : 'http';
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const response = await fetch(`${protocol}://${olt.ip_address}:${olt.port}/`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'text/html,application/json' },
    });
    
    clearTimeout(timeout);
    
    return { 
      success: true, 
      duration: Date.now() - startTime,
      method: 'HTTP API'
    };
  } catch (fetchError) {
    clearTimeout(timeout);
    throw new Error(`HTTP API unreachable: ${fetchError.message}`);
  }
}

/**
 * Test SSH connection
 */
async function testSSHConnection(olt) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const conn = new Client();
    
    const timeout = setTimeout(() => {
      conn.end();
      resolve({ success: false, error: 'SSH connection timeout' });
    }, CONNECTION_TIMEOUT);
    
    conn.on('ready', () => {
      clearTimeout(timeout);
      conn.end();
      resolve({ 
        success: true, 
        duration: Date.now() - startTime,
        method: 'SSH'
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: `SSH: ${err.message}` });
    });
    
    conn.connect({
      host: olt.ip_address,
      port: olt.port,
      username: olt.username,
      password: olt.password_encrypted,
      readyTimeout: CONNECTION_TIMEOUT,
      tryKeyboard: true,
      algorithms: {
        kex: [
          'diffie-hellman-group14-sha1', 
          'diffie-hellman-group1-sha1', 
          'diffie-hellman-group14-sha256',
          'curve25519-sha256'
        ],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', '3des-cbc'],
        serverHostKey: ['ssh-rsa', 'ssh-dss', 'ssh-ed25519'],
        hmac: ['hmac-sha2-256', 'hmac-sha1', 'hmac-md5']
      }
    });
  });
}

/**
 * Test Telnet connection
 */
async function testTelnetConnection(olt) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ success: false, error: 'Telnet connection timeout' });
    }, CONNECTION_TIMEOUT);
    
    socket.connect(olt.port, olt.ip_address, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ 
        success: true, 
        duration: Date.now() - startTime,
        method: 'Telnet'
      });
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: `Telnet: ${err.message}` });
    });
  });
}

/**
 * Test SNMP connection
 */
async function testSNMPConnection(olt) {
  const startTime = Date.now();
  
  // Basic SNMP connectivity test via UDP port 161
  return new Promise((resolve) => {
    const dgram = require('dgram');
    const socket = dgram.createSocket('udp4');
    
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ success: false, error: 'SNMP connection timeout' });
    }, CONNECTION_TIMEOUT);
    
    // Simple SNMP GET request for sysDescr.0
    const snmpGetRequest = Buffer.from([
      0x30, 0x26, 0x02, 0x01, 0x01, 0x04, 0x06, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x63,
      0xa0, 0x19, 0x02, 0x04, 0x00, 0x00, 0x00, 0x01, 0x02, 0x01, 0x00, 0x02, 0x01,
      0x00, 0x30, 0x0b, 0x30, 0x09, 0x06, 0x05, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x05, 0x00
    ]);
    
    socket.on('message', () => {
      clearTimeout(timeout);
      socket.close();
      resolve({ 
        success: true, 
        duration: Date.now() - startTime,
        method: 'SNMP'
      });
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.close();
      resolve({ success: false, error: `SNMP: ${err.message}` });
    });
    
    socket.send(snmpGetRequest, 161, olt.ip_address);
  });
}

/**
 * Execute SNMP polling (basic ONU status)
 */
async function executeSNMPPoll(olt) {
  // SNMP polling returns basic status only
  logger.warn(`SNMP polling for ${olt.name} - limited data available`);
  
  // For SNMP, we can only get basic connectivity status
  // Full ONU data requires CLI access (SSH/Telnet)
  return [];
}
