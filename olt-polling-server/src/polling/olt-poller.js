import { Client } from 'ssh2';
import { logger } from '../utils/logger.js';
import { parseZTEOutput } from './parsers/zte-parser.js';
import { parseHuaweiOutput } from './parsers/huawei-parser.js';

const SSH_TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '30000');

/**
 * Poll an OLT device via SSH and sync data to database
 */
export async function pollOLT(supabase, olt) {
  const startTime = Date.now();
  
  try {
    // Connect to OLT via SSH
    const sshOutput = await executeSSHCommands(olt);
    
    // Parse output based on OLT brand
    const onus = parseOLTOutput(olt.brand, sshOutput);
    
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
    
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('SSH connection timeout'));
    }, SSH_TIMEOUT);
    
    conn.on('ready', () => {
      logger.debug(`SSH connected to ${olt.ip_address}`);
      
      conn.shell((err, stream) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
          return;
        }
        
        stream.on('close', () => {
          clearTimeout(timeout);
          conn.end();
          resolve(output);
        });
        
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        // Send commands based on OLT brand
        const commands = getOLTCommands(olt.brand);
        commands.forEach((cmd, index) => {
          setTimeout(() => {
            stream.write(cmd + '\n');
          }, index * 500);
        });
        
        // Close stream after commands
        setTimeout(() => {
          stream.end('exit\n');
        }, commands.length * 500 + 5000);
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    conn.connect({
      host: olt.ip_address,
      port: olt.port,
      username: olt.username,
      password: olt.password_encrypted, // In production, decrypt this
      readyTimeout: SSH_TIMEOUT,
      algorithms: {
        kex: [
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group1-sha1',
          'diffie-hellman-group14-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-cbc',
          '3des-cbc'
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
    default:
      return [
        'show onu status'
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
    default:
      logger.warn(`No parser available for brand: ${brand}`);
      return [];
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
