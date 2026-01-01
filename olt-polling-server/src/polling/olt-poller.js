import { Client } from 'ssh2';
import { logger } from '../utils/logger.js';
import { parseZTEOutput } from './parsers/zte-parser.js';
import { parseHuaweiOutput } from './parsers/huawei-parser.js';
import { parseVSOLOutput } from './parsers/vsol-parser.js';
import { parseDBCOutput } from './parsers/dbc-parser.js';
import { parseCDATAOutput } from './parsers/cdata-parser.js';
import { parseECOMOutput } from './parsers/ecom-parser.js';
import { parseBDCOMOutput } from './parsers/bdcom-parser.js';
import { executeTelnetCommands } from './telnet-client.js';
import { executeAPICommands, parseAPIResponse } from './http-api-client.js';
import { fetchAllMikroTikData, enrichONUWithMikroTikData } from './mikrotik-client.js';
import { getAlertNotificationSettings, notifyAlert } from '../notifications/alert-notifier.js';
import net from 'net';

const SSH_TIMEOUT = parseInt(process.env.SSH_TIMEOUT_MS || '60000');
const CONNECTION_TIMEOUT = 15000;

/**
 * OLT Brand Protocol Configuration
 * Defines primary and fallback connection methods for each brand
 * 
 * IMPORTANT: ALL OLTs require Telnet/SSH CLI access for ONU data.
 * Web interfaces are only for status checking, not for ONU polling.
 * SNMP (port 161) can provide basic status but not full ONU details.
 * 
 * Port Forwarding Note: If using MikroTik to forward Telnet (e.g., 8045 -> 23),
 * configure the OLT with the external port (8045) and the system will use it for Telnet.
 */
const OLT_PROTOCOL_CONFIG = {
  ZTE: { 
    primary: 'ssh', 
    fallback: 'telnet', 
    defaultPort: 22,
    webPorts: [8080],
    supportsSnmp: true,
    hint: 'SSH port 22 or Telnet port 23 (CLI commands)'
  },
  Huawei: { 
    primary: 'ssh', 
    fallback: 'telnet', 
    defaultPort: 22,
    webPorts: [],
    supportsSnmp: true,
    hint: 'SSH port 22 or Telnet port 23 (CLI commands)'
  },
  VSOL: { 
    // VSOL EPON/GPON OLTs - Telnet CLI required for ONU data
    // Web UI has no API for ONU data extraction
    primary: 'telnet', 
    fallback: 'ssh', 
    defaultPort: 23,
    webPorts: [80, 8080, 8085, 8086, 443],
    supportsSnmp: false,
    hint: 'Telnet on any configured port (use port forwarding if needed, e.g., 8045)'
  },
  BDCOM: { 
    primary: 'telnet', 
    fallback: 'ssh', 
    defaultPort: 23,
    webPorts: [80],
    supportsSnmp: true,
    hint: 'Telnet port 23 (EPON CLI commands)'
  },
  DBC: { 
    // DBC OLTs - prefer Telnet CLI for full data
    primary: 'telnet', 
    fallback: 'http', 
    defaultPort: 23,
    webPorts: [80, 8080],
    supportsSnmp: false,
    hint: 'Telnet on configured port'
  },
  CDATA: { 
    // CDATA OLTs - prefer Telnet CLI for full data
    primary: 'telnet', 
    fallback: 'http', 
    defaultPort: 23,
    webPorts: [80, 8080],
    supportsSnmp: false,
    hint: 'Telnet on configured port'
  },
  ECOM: { 
    // ECOM OLTs - prefer Telnet CLI for full data
    primary: 'telnet', 
    fallback: 'http', 
    defaultPort: 23,
    webPorts: [80, 8080],
    supportsSnmp: false,
    hint: 'Telnet on configured port'
  },
  Fiberhome: { 
    primary: 'telnet', 
    fallback: 'ssh', 
    defaultPort: 23,
    webPorts: [],
    supportsSnmp: true,
    hint: 'Telnet port 23'
  },
  Nokia: { 
    primary: 'ssh', 
    fallback: 'snmp', 
    defaultPort: 22,
    webPorts: [],
    supportsSnmp: true,
    hint: 'SSH port 22'
  },
  Other: { 
    primary: 'telnet', 
    fallback: 'ssh', 
    defaultPort: 23,
    webPorts: [80, 8080],
    supportsSnmp: false,
    hint: 'Telnet on configured port (try SSH if Telnet fails)'
  }
};

/**
 * Determine connection method based on port number and brand
 * 
 * IMPORTANT: For ONU data extraction, ALL brands need CLI access (Telnet/SSH)
 * The configured port is treated as the Telnet port (supports port forwarding)
 * 
 * Port 22 = SSH (if explicitly set)
 * Port 23 = Telnet (standard)
 * Port 161 = SNMP (read-only status, limited data)
 * Any other port = Treated as Telnet (for port forwarding scenarios like 8045 -> 23)
 */
function getConnectionType(port, brand) {
  const config = OLT_PROTOCOL_CONFIG[brand] || OLT_PROTOCOL_CONFIG.Other;
  
  // SNMP port - limited data, only status
  if (port === 161) {
    if (config.supportsSnmp) {
      return 'snmp';
    } else {
      logger.warn(`${brand} does not support SNMP - use Telnet/SSH port instead`);
      return 'telnet'; // Fallback to try Telnet on standard port
    }
  }
  
  // SSH port - use SSH
  if (port === 22) return 'ssh';
  
  // Standard Telnet port
  if (port === 23) return 'telnet';
  
  // For ALL OLT brands, we use CLI (Telnet) for full ONU data
  // The configured port is treated as the Telnet port (supports port forwarding)
  // e.g., MikroTik forwards external 8045 to OLT's internal 23
  logger.info(`${brand} OLT on port ${port} - using CLI strategy (Telnet on configured port)`);
  return 'telnet_on_configured_port';
}

/**
 * Get protocol configuration for a brand
 */
export function getProtocolConfig(brand) {
  return OLT_PROTOCOL_CONFIG[brand] || OLT_PROTOCOL_CONFIG.Other;
}

/**
 * Poll an OLT device via SSH/Telnet and sync data to database
 * 
 * ALL OLT brands require CLI access (Telnet/SSH) for full ONU data.
 * The configured port is treated as the Telnet port (supports port forwarding).
 */
export async function pollOLT(supabase, olt) {
  const startTime = Date.now();
  let rawOutput = '';
  let connectionMethod = '';
  let errorMessage = null;
  // Get commands based on brand AND mode (EPON/GPON)
  const oltMode = olt.olt_mode || 'GPON'; // Default to GPON if not specified
  const commands = getOLTCommands(olt.brand, oltMode);
  logger.info(`OLT ${olt.name} mode: ${oltMode}, brand: ${olt.brand}`);
  
  try {
    let output = '';
    let onus = [];
    
    const connectionType = getConnectionType(olt.port, olt.brand);
    connectionMethod = connectionType;
    logger.info(`Polling ${olt.name} (${olt.ip_address}:${olt.port}) - Brand: ${olt.brand}, Method: ${connectionType}`);
    
    // Main polling logic - simplified for reliability
    switch (connectionType) {
      case 'telnet':
      case 'telnet_on_configured_port':
        // Use Telnet on the configured port (supports port forwarding like 8045 -> 23)
        logger.info(`Using Telnet on port ${olt.port} for ${olt.name}`);
        try {
          output = await executeTelnetCommands(olt, commands);
          rawOutput = output || '';
          if (output && output.length > 50) {
            logger.info(`Telnet successful, output length: ${output.length} chars`);
            // Log the full raw output for debugging
            logger.debug(`=== RAW CLI OUTPUT START ===\n${output}\n=== RAW CLI OUTPUT END ===`);
            onus = parseOLTOutput(olt.brand, output);
            logger.info(`Parsed ${onus.length} ONUs from Telnet output`);
          } else {
            throw new Error(`Insufficient Telnet output (${output?.length || 0} chars)`);
          }
        } catch (telnetErr) {
          logger.warn(`Telnet on port ${olt.port} failed: ${telnetErr.message}`);
          
          // Fallback to SSH on port 22 if Telnet fails
          logger.info(`Trying SSH fallback on port 22 for ${olt.name}`);
          connectionMethod = 'ssh_fallback';
          try {
            const sshOlt = { ...olt, port: 22 };
            output = await executeSSHCommands(sshOlt);
            rawOutput = output || '';
            if (output && output.length > 50) {
              onus = parseOLTOutput(olt.brand, output);
              logger.info(`SSH fallback successful: Found ${onus.length} ONUs`);
            }
          } catch (sshErr) {
            logger.error(`SSH fallback also failed: ${sshErr.message}`);
            throw new Error(`CLI access failed. Telnet:${olt.port} (${telnetErr.message}), SSH:22 (${sshErr.message})`);
          }
        }
        break;
        
      case 'ssh':
        // Use SSH on the configured port (usually 22)
        logger.info(`Using SSH on port ${olt.port} for ${olt.name}`);
        try {
          output = await executeSSHCommands(olt);
          rawOutput = output || '';
          if (output && output.length > 50) {
            logger.info(`SSH successful, output length: ${output.length} chars`);
            onus = parseOLTOutput(olt.brand, output);
            logger.info(`Parsed ${onus.length} ONUs from SSH output`);
          } else {
            throw new Error(`Insufficient SSH output (${output?.length || 0} chars)`);
          }
        } catch (sshErr) {
          logger.warn(`SSH on port ${olt.port} failed: ${sshErr.message}`);
          
          // Fallback to Telnet on port 23
          logger.info(`Trying Telnet fallback on port 23 for ${olt.name}`);
          connectionMethod = 'telnet_fallback';
          try {
            const telnetOlt = { ...olt, port: 23 };
            output = await executeTelnetCommands(telnetOlt, commands);
            rawOutput = output || '';
            if (output && output.length > 50) {
              onus = parseOLTOutput(olt.brand, output);
              logger.info(`Telnet fallback successful: Found ${onus.length} ONUs`);
            }
          } catch (telnetErr) {
            logger.error(`Telnet fallback also failed: ${telnetErr.message}`);
            throw new Error(`CLI access failed. SSH:${olt.port} (${sshErr.message}), Telnet:23 (${telnetErr.message})`);
          }
        }
        break;
        
      case 'snmp':
        // SNMP polling - limited data (only status, no optical power)
        logger.info(`Using SNMP on port ${olt.port} for ${olt.name}`);
        try {
          const snmpResult = await executeSNMPPoll(olt);
          onus = snmpResult;
          logger.info(`SNMP returned ${onus.length} ONUs`);
          logger.warn(`Note: SNMP provides limited data. For full ONU info (optical power, PPPoE), use Telnet/SSH.`);
        } catch (snmpErr) {
          logger.error(`SNMP polling failed: ${snmpErr.message}`);
          throw new Error(`SNMP polling failed: ${snmpErr.message}. Consider using Telnet port for full data.`);
        }
        break;
        
      default:
        // Auto-detect: Try Telnet on configured port -> Telnet on 23 -> SSH on 22
        logger.info(`Auto-detect mode for ${olt.name}`);
        const errors = [];
        let success = false;
        
        const attempts = [
          { port: olt.port, method: 'telnet', name: `Telnet:${olt.port}` },
          { port: 23, method: 'telnet', name: 'Telnet:23' },
          { port: 22, method: 'ssh', name: 'SSH:22' }
        ].filter((a, i, arr) => arr.findIndex(x => x.port === a.port && x.method === a.method) === i);
        
        for (const attempt of attempts) {
          if (success) break;
          
          try {
            if (attempt.method === 'telnet') {
              const attemptOlt = { ...olt, port: attempt.port };
              output = await executeTelnetCommands(attemptOlt, commands);
            } else {
              const attemptOlt = { ...olt, port: attempt.port };
              output = await executeSSHCommands(attemptOlt);
            }
            
            rawOutput = output || '';
            
            if (output && output.length > 50) {
              onus = parseOLTOutput(olt.brand, output);
              if (onus.length > 0) {
                success = true;
                connectionMethod = attempt.name;
                logger.info(`${attempt.name} successful: Found ${onus.length} ONUs`);
              } else {
                errors.push(`${attempt.name}: no ONUs parsed`);
              }
            } else {
              errors.push(`${attempt.name}: insufficient data`);
            }
          } catch (err) {
            errors.push(`${attempt.name}: ${err.message}`);
          }
        }
        
        if (!success && onus.length === 0) {
          throw new Error(`All connection methods failed: ${errors.join(', ')}`);
        }
        break;
    }
    
    logger.info(`Polling complete: Found ${onus.length} ONUs from ${olt.name}`);
    
    // Save debug log to database
    const duration = Date.now() - startTime;
    await saveDebugLog(supabase, olt, rawOutput, onus.length, connectionMethod, commands, null, duration);
    
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
        // Fetch all MikroTik data including PPP secrets for PPPoE credentials
        const { pppoe, arp, dhcp, secrets } = await fetchAllMikroTikData(mikrotik);
        
        logger.info(`MikroTik data: ${pppoe.length} PPPoE sessions, ${arp.length} ARP entries, ${dhcp.length} DHCP leases, ${secrets.length} PPP secrets`);
        
        // Log some sample data for debugging
        if (pppoe.length > 0) {
          logger.debug(`Sample PPPoE sessions: ${JSON.stringify(pppoe.slice(0, 3))}`);
        }
        
        // Count how many ONUs get enriched
        let enrichedCount = 0;
        
        // Track which PPPoE usernames have been matched to prevent duplicates
        const usedMatches = new Set();
        
        // Enrich ONU data with MikroTik info (router name, MAC, PPPoE username)
        // Pass usedMatches to prevent the same PPPoE user from being assigned to multiple ONUs
        onus = onus.map(onu => {
          const enriched = enrichONUWithMikroTikData(onu, pppoe, arp, dhcp, secrets, usedMatches);
          if (enriched.pppoe_username !== onu.pppoe_username || enriched.router_name !== onu.router_name) {
            enrichedCount++;
          }
          // Mark this PPPoE username as used so it won't be matched to another ONU
          if (enriched.pppoe_username) {
            usedMatches.add(enriched.pppoe_username.toLowerCase());
          }
          return enriched;
        });
        
        logger.info(`MikroTik enrichment: ${enrichedCount} of ${onus.length} ONUs got PPPoE/router data`);
      } catch (mikrotikErr) {
        logger.warn(`MikroTik data fetch failed (non-critical): ${mikrotikErr.message}`);
        // Continue without MikroTik data - ONU data from OLT is still valid
      }
    } else {
      logger.debug(`MikroTik not configured for ${olt.name} - skipping PPPoE enrichment`);
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
    
    logger.info(`Poll completed for ${olt.name} in ${duration}ms`);
    
    return { onuCount: onus.length, duration, rawOutput };
  } catch (error) {
    const duration = Date.now() - startTime;
    errorMessage = error.message;
    
    // Save debug log even on error
    await saveDebugLog(supabase, olt, rawOutput, 0, connectionMethod, commands, errorMessage, duration);
    
    logger.error(`Failed to poll OLT ${olt.name}:`, error);
    throw error;
  }
}

/**
 * Save debug log to database for troubleshooting
 */
async function saveDebugLog(supabase, olt, rawOutput, parsedCount, connectionMethod, commands, errorMessage, duration) {
  try {
    // Keep only last 10 debug logs per OLT
    const { data: existingLogs } = await supabase
      .from('olt_debug_logs')
      .select('id')
      .eq('olt_id', olt.id)
      .order('created_at', { ascending: false });
    
    if (existingLogs && existingLogs.length >= 10) {
      const idsToDelete = existingLogs.slice(9).map(l => l.id);
      await supabase
        .from('olt_debug_logs')
        .delete()
        .in('id', idsToDelete);
    }
    
    // Insert new debug log
    await supabase
      .from('olt_debug_logs')
      .insert({
        olt_id: olt.id,
        olt_name: olt.name,
        raw_output: rawOutput,
        parsed_count: parsedCount,
        connection_method: connectionMethod,
        commands_sent: commands,
        error_message: errorMessage,
        duration_ms: duration
      });
      
    logger.debug(`Debug log saved for ${olt.name}`);
  } catch (err) {
    logger.warn(`Failed to save debug log: ${err.message}`);
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
            const oltMode = olt.olt_mode || 'GPON';
            const commands = getOLTCommands(olt.brand, oltMode);
            logger.debug(`Sending ${commands.length} commands to ${olt.name} (mode: ${oltMode})`);
            
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
 * Get CLI commands for specific OLT brand and mode (EPON/GPON)
 * 
 * IMPORTANT: Commands are separated by mode to ensure proper polling
 * - EPON: Uses MAC-based identification, EPON-specific CLI syntax
 * - GPON: Uses Serial Number identification, GPON-specific CLI syntax
 * 
 * @param {string} brand - OLT brand (ZTE, Huawei, VSOL, etc.)
 * @param {string} mode - OLT mode ('EPON' or 'GPON')
 * @returns {string[]} Array of CLI commands to execute
 */
function getOLTCommands(brand, mode = 'GPON') {
  logger.debug(`Getting commands for brand: ${brand}, mode: ${mode}`);
  
  // Brand-specific command sets
  const commandSets = {
    // ============= ZTE OLT Commands =============
    ZTE: {
      EPON: [
        'terminal length 0',
        'show epon onu state',
        'show epon onu detail-info',
        'show epon optical-transceiver-diagnosis'
      ],
      GPON: [
        'terminal length 0',
        'show gpon onu state',
        'show gpon onu detail-info',
        'show gpon onu optical-info'
      ]
    },
    
    // ============= Huawei OLT Commands =============
    Huawei: {
      EPON: [
        'screen-length 0 temporary',
        'display epon ont info all',
        'display epon optical-info all'
      ],
      GPON: [
        'screen-length 0 temporary',
        'display ont info summary all',
        'display ont optical-info all'
      ]
    },
    
    // ============= Fiberhome OLT Commands =============
    Fiberhome: {
      EPON: [
        'show epon onu state',
        'show epon onu list',
        'show epon optical-info'
      ],
      GPON: [
        'show gpon onu state',
        'show gpon onu list',
        'show gpon optical-info'
      ]
    },
    
    // ============= VSOL OLT Commands =============
    // VSOL supports both EPON and GPON modes
    // Key insight: 'show onu opm-diag all' works in CONFIG mode
    VSOL: {
      EPON: [
        'terminal length 0',                    // Disable pagination
        'enable',                               // Enter privileged mode
        'show run',                             // Running config - ONU MAC info
        'show running-config',                  // Alternative format
        'show version',                         // Firmware version
        'configure terminal',                   // Enter config mode
        // EPON optical power commands (IN CONFIG MODE)
        'show onu opm-diag all',                // Shows all ONU optical power + temperature
        'show epon optical-transceiver-diagnosis epon 0/1',
        'show epon optical-transceiver-diagnosis epon 0/2',
        'show epon optical-transceiver-diagnosis epon 0/3',
        'show epon optical-transceiver-diagnosis epon 0/4',
        // Per-ONU optical power
        'show onu 0/1 optical-info',
        'show onu 0/2 optical-info',
        'show onu 0/3 optical-info',
        'show onu 0/4 optical-info',
        // EPON onu-information commands
        'show epon onu-information interface epon 0/1',
        'show epon onu-information interface epon 0/2',
        'show epon onu-information interface epon 0/3',
        'show epon onu-information interface epon 0/4',
        // ONU status commands
        'show epon active-onu',
        'show epon inactive-onu',
        'show epon onu status all',
        // Offline reason (deregister log)
        'show onu deregister-log',
        'show epon onu deregister-log',
        // Distance info (if supported)
        'show epon onu distance',
        'show onu distance all',
        'exit'
      ],
      GPON: [
        'terminal length 0',                    // Disable pagination
        'enable',                               // Enter privileged mode
        'show run',                             // Running config - ONU binding info
        'show running-config',                  // Alternative format
        'show version',                         // Firmware version
        'configure terminal',                   // Enter config mode
        // GPON ONU info and optical power commands
        'show gpon onu info',
        'show gpon onu state',
        'show gpon onu optical-info',
        // Per-interface GPON commands
        'show gpon onu optical-info interface gpon 0/1',
        'show gpon onu optical-info interface gpon 0/2',
        'show gpon onu optical-info interface gpon 0/3',
        'show gpon onu optical-info interface gpon 0/4',
        'show gpon onu state interface gpon 0/1',
        'show gpon onu state interface gpon 0/2',
        'show gpon onu state interface gpon 0/3',
        'show gpon onu state interface gpon 0/4',
        // ONU detail info
        'show gpon onu detail-info',
        // Temperature and distance (if supported)
        'show gpon onu distance',
        'exit'
      ]
    },
    
    // ============= DBC OLT Commands =============
    DBC: {
      EPON: [
        'terminal length 0',
        'show epon onu status',
        'show epon onu optical-power',
        'show epon onu list',
        'show onu status',
        'show onu optical-power'
      ],
      GPON: [
        'terminal length 0',
        'show gpon onu status',
        'show gpon onu optical-power',
        'show gpon onu list',
        'show onu status',
        'show onu optical-power'
      ]
    },
    
    // ============= CDATA OLT Commands =============
    CDATA: {
      EPON: [
        'terminal length 0',
        'show epon onu status all',
        'show epon onu optical-info all',
        'show epon onu list',
        'show onu status all',
        'show onu optical-info all'
      ],
      GPON: [
        'terminal length 0',
        'show gpon onu status all',
        'show gpon onu optical-info all',
        'show gpon onu list',
        'show onu status all',
        'show onu optical-info all'
      ]
    },
    
    // ============= ECOM OLT Commands =============
    ECOM: {
      EPON: [
        'terminal length 0',
        'show epon onu state',
        'show epon onu optical',
        'show epon onu info'
      ],
      GPON: [
        'terminal length 0',
        'show gpon onu state',
        'show gpon onu optical',
        'show gpon onu info'
      ]
    },
    
    // ============= BDCOM OLT Commands (EPON-focused) =============
    BDCOM: {
      EPON: [
        'terminal length 0',
        'show epon onu-info',
        'show epon optical-transceiver-diagnosis interface',
        'show epon onu-status'
      ],
      GPON: [
        'terminal length 0',
        'show gpon onu-info',
        'show gpon optical-transceiver-diagnosis interface',
        'show gpon onu-status',
        // Fallback to EPON if GPON not supported
        'show epon onu-info'
      ]
    },
    
    // ============= Nokia OLT Commands =============
    Nokia: {
      EPON: [
        'environment no more',
        'show equipment epon ont status',
        'show equipment epon ont optics'
      ],
      GPON: [
        'environment no more',
        'show equipment ont status',
        'show equipment ont optics'
      ]
    },
    
    // ============= Default/Other OLT Commands =============
    Other: {
      EPON: [
        'terminal length 0',
        'show epon onu status',
        'show epon onu list',
        'show onu status',
        'show onu list'
      ],
      GPON: [
        'terminal length 0',
        'show gpon onu status',
        'show gpon onu list',
        'show onu status',
        'show onu list'
      ]
    }
  };
  
  // Get commands for the specified brand and mode
  const brandCommands = commandSets[brand] || commandSets.Other;
  const modeCommands = brandCommands[mode] || brandCommands.GPON;
  
  logger.debug(`Returning ${modeCommands.length} commands for ${brand} ${mode}`);
  return modeCommands;
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
      return parseBDCOMOutput(output);
    case 'Nokia':
      return parseVSOLOutput(output);
    default:
      logger.warn(`No parser available for brand: ${brand}, trying generic parser`);
      return parseVSOLOutput(output);
  }
}

/**
 * Generate a unique key for ONU deduplication
 * Priority: olt_id + pon_port + onu_index (most reliable for uniqueness)
 */
function getONUKey(oltId, onu) {
  return `${oltId}:${onu.pon_port}:${onu.onu_index}`;
}

/**
 * Sync parsed ONUs to database with proper deduplication
 * Uses olt_id + pon_port + onu_index as the unique key (not serial_number)
 * Includes automatic duplicate detection and cleanup
 */
async function syncONUsToDatabase(supabase, oltId, onus) {
  // Load system notification settings once per sync
  const settings = await getAlertNotificationSettings(supabase);
  const rxThreshold = settings.rxPowerThreshold;
  const offlineDelayMinutes = settings.offlineThreshold;

  // Deduplicate incoming ONUs by pon_port + onu_index (keep most complete entry)
  const onuMap = new Map();
  for (const onu of onus) {
    const key = `${onu.pon_port}:${onu.onu_index}`;
    const existing = onuMap.get(key);
    if (!existing) {
      onuMap.set(key, onu);
    } else {
      // Merge: prefer non-null values from both
      onuMap.set(key, {
        ...existing,
        ...onu,
        rx_power: onu.rx_power ?? existing.rx_power,
        tx_power: onu.tx_power ?? existing.tx_power,
        temperature: onu.temperature ?? existing.temperature,
        distance: onu.distance ?? existing.distance,
        mac_address: onu.mac_address || existing.mac_address,
        serial_number: onu.serial_number || existing.serial_number,
        router_name: onu.router_name || existing.router_name,
        router_mac: onu.router_mac || existing.router_mac,
        pppoe_username: onu.pppoe_username || existing.pppoe_username,
      });
    }
  }
  const deduplicatedOnus = Array.from(onuMap.values());
  logger.info(`Deduplicated ${onus.length} parsed ONUs to ${deduplicatedOnus.length} unique entries`);

  // Fetch existing ONUs for this OLT - use pon_port + onu_index as key
  const { data: existingONUs } = await supabase
    .from('onus')
    .select('id, serial_number, pon_port, onu_index, status, name, router_name, router_mac, mac_address, pppoe_username, last_offline, updated_at')
    .eq('olt_id', oltId);

  // AUTOMATIC DUPLICATE DETECTION AND CLEANUP
  // Group existing ONUs by pon_port:onu_index to find duplicates
  const existingByKey = new Map();
  for (const onu of existingONUs || []) {
    const key = `${onu.pon_port}:${onu.onu_index}`;
    if (!existingByKey.has(key)) {
      existingByKey.set(key, []);
    }
    existingByKey.get(key).push(onu);
  }

  // Find and delete duplicates (keep the most recently updated one)
  let duplicatesDeleted = 0;
  for (const [key, group] of existingByKey) {
    if (group.length > 1) {
      // Sort by updated_at descending, keep the newest
      group.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const idsToDelete = group.slice(1).map(o => o.id);
      
      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from('onus')
          .delete()
          .in('id', idsToDelete);
        
        if (!error) {
          duplicatesDeleted += idsToDelete.length;
          logger.info(`Auto-deleted ${idsToDelete.length} duplicate ONUs for key ${key}`);
        } else {
          logger.warn(`Failed to delete duplicates for key ${key}: ${error.message}`);
        }
      }
    }
  }

  if (duplicatesDeleted > 0) {
    logger.info(`Automatic cleanup: Deleted ${duplicatesDeleted} duplicate ONU records`);
  }

  // Rebuild the map with only the kept entries (one per key)
  const existingMap = new Map();
  for (const [key, group] of existingByKey) {
    // After deletion, only the first (newest) remains
    existingMap.set(key, group[0]);
  }

  // Preload recent alerts to avoid spamming duplicates
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('device_id, type, created_at')
    .gte('created_at', since)
    .in('type', ['onu_offline', 'power_drop']);

  const lastAlertMap = new Map();
  for (const a of recentAlerts || []) {
    const key = `${a.device_id}:${a.type}`;
    const prev = lastAlertMap.get(key);
    if (!prev || (a.created_at && a.created_at > prev)) lastAlertMap.set(key, a.created_at);
  }

  const createAlert = async ({ type, severity, title, message, device_id, device_name }) => {
    const { error } = await supabase.from('alerts').insert({
      type,
      severity,
      title,
      message,
      device_id,
      device_name,
    });

    if (error) {
      logger.warn(`Failed to insert alert (${type}) for device ${device_id}: ${error.message}`);
      return;
    }

    await notifyAlert(supabase, settings, { type, severity, device_name, message });
  };

  let updatedCount = 0;
  let insertedCount = 0;

  for (const onu of deduplicatedOnus) {
    const key = `${onu.pon_port}:${onu.onu_index}`;
    const existing = existingMap.get(key);

    if (existing) {
      // Update existing ONU
      const wasOffline = existing.status === 'offline';
      const isNowOnline = onu.status === 'online';
      const wasOnline = existing.status === 'online';
      const isNowOffline = onu.status === 'offline';

      const updateData = {
        status: onu.status,
        rx_power: onu.rx_power,
        tx_power: onu.tx_power,
        pon_port: onu.pon_port,
        onu_index: onu.onu_index,
        temperature: onu.temperature || null,
        distance: onu.distance || null,
        offline_reason: onu.offline_reason || null,
        updated_at: new Date().toISOString(),
      };

      // Only update name if we have a new value and it's not a generated placeholder
      if (onu.name && !onu.name.startsWith('ONU-') && onu.name !== existing.name) {
        updateData.name = onu.name;
      }

      // Update MAC address if we have a new one
      if (onu.mac_address && onu.mac_address !== existing.mac_address) {
        updateData.mac_address = onu.mac_address;
      }

      // Update router name if we have a new one
      if (onu.router_name && onu.router_name !== existing.router_name) {
        updateData.router_name = onu.router_name;
      }

      // Update PPPoE username if we have a new one
      if (onu.pppoe_username && onu.pppoe_username !== existing.pppoe_username) {
        updateData.pppoe_username = onu.pppoe_username;
      }

      // Update router MAC if we have a new one (from PPPoE session caller-id)
      if (onu.router_mac && onu.router_mac !== existing.router_mac) {
        updateData.router_mac = onu.router_mac;
      }

      if (wasOffline && isNowOnline) {
        updateData.last_online = new Date().toISOString();
      }

      if (wasOnline && isNowOffline) {
        updateData.last_offline = new Date().toISOString();
      }

      await supabase.from('onus').update(updateData).eq('id', existing.id);
      updatedCount++;

      // Record power reading ONLY when we have both RX and TX (avoid wrong 0 values)
      if (onu.rx_power !== null && onu.rx_power !== undefined && onu.tx_power !== null && onu.tx_power !== undefined) {
        await supabase.from('power_readings').insert({
          onu_id: existing.id,
          rx_power: Number(onu.rx_power),
          tx_power: Number(onu.tx_power),
        });
      }

      // --- Alerts + notifications ---

      // Offline alert with delay + dedupe
      if (settings.onuOfflineAlerts) {
        const now = Date.now();
        const lastOfflineIso = (isNowOffline ? updateData.last_offline : existing.last_offline) || null;
        const lastOfflineMs = lastOfflineIso ? new Date(lastOfflineIso).getTime() : null;
        const offlineForMinutes = lastOfflineMs ? (now - lastOfflineMs) / 60000 : 0;

        const shouldTriggerOfflineAlert =
          (isNowOffline && offlineDelayMinutes <= 0) ||
          (onu.status === 'offline' && lastOfflineMs && offlineForMinutes >= offlineDelayMinutes);

        if (shouldTriggerOfflineAlert) {
          const key = `${existing.id}:onu_offline`;
          const lastAlertAt = lastAlertMap.get(key);

          // If we already alerted after this offline started, do nothing
          const alreadyAlerted =
            lastAlertAt && lastOfflineIso && new Date(lastAlertAt).getTime() >= new Date(lastOfflineIso).getTime();

          if (!alreadyAlerted) {
            await createAlert({
              type: 'onu_offline',
              severity: 'warning',
              title: `ONU Offline: ${onu.name || onu.serial_number}`,
              message:
                offlineDelayMinutes > 0
                  ? `ONU ${onu.serial_number} on port ${onu.pon_port} is offline for ${Math.round(offlineForMinutes)} min (delay: ${offlineDelayMinutes} min)`
                  : `ONU ${onu.serial_number} on port ${onu.pon_port} went offline`,
              device_id: existing.id,
              device_name: onu.name || onu.serial_number,
            });
          }
        }
      }

      // Low power alert (settings-based threshold + dedupe)
      if (settings.powerDropAlerts && onu.rx_power !== null && onu.rx_power !== undefined && Number(onu.rx_power) < rxThreshold) {
        const key = `${existing.id}:power_drop`;
        const lastAlertAt = lastAlertMap.get(key);

        // Dedupe: at most once per 6 hours per ONU
        const recentlyAlerted = lastAlertAt && Date.now() - new Date(lastAlertAt).getTime() < 6 * 60 * 60 * 1000;

        if (!recentlyAlerted) {
          await createAlert({
            type: 'power_drop',
            severity: 'warning',
            title: `Low RX Power: ${onu.name || onu.serial_number}`,
            message: `RX power is ${onu.rx_power} dBm (threshold: ${rxThreshold} dBm)`,
            device_id: existing.id,
            device_name: onu.name || onu.serial_number,
          });
        }
      }
    } else {
      // Insert new ONU with all available fields
      const { error } = await supabase
        .from('onus')
        .insert({
          olt_id: oltId,
          name: onu.name || `ONU-${onu.pon_port}:${onu.onu_index}`,
          serial_number: onu.serial_number,
          pon_port: onu.pon_port,
          onu_index: onu.onu_index,
          status: onu.status,
          rx_power: onu.rx_power,
          tx_power: onu.tx_power,
          mac_address: onu.mac_address,
          router_name: onu.router_name,
          router_mac: onu.router_mac,
          pppoe_username: onu.pppoe_username,
          temperature: onu.temperature || null,
          distance: onu.distance || null,
          offline_reason: onu.offline_reason || null,
          last_online: onu.status === 'online' ? new Date().toISOString() : null,
        });

      if (error) {
        logger.error(`Failed to insert ONU ${onu.serial_number}: ${error.message}`);
      } else {
        insertedCount++;
        logger.info(`New ONU discovered: ${onu.serial_number} on ${onu.pon_port}`);
      }
    }
  }

  logger.info(`ONU sync complete for OLT ${oltId}: ${insertedCount} inserted, ${updatedCount} updated`);
}

/**
 * Test OLT connection without polling data
 */
export async function testOLTConnection(olt) {
  const startTime = Date.now();
  const connectionType = getConnectionType(olt.port, olt.brand);
  const config = OLT_PROTOCOL_CONFIG[olt.brand] || OLT_PROTOCOL_CONFIG.Other;
  
  logger.info(`Testing connection to ${olt.ip_address}:${olt.port} (${connectionType})`);
  
  try {
    // Handle http_first_* connection types (most common for VSOL, DBC, CDATA, ECOM)
    if (connectionType.startsWith('http_first_')) {
      const fallbackMethod = connectionType.replace('http_first_', '');
      const telnetPort = config.telnetPort || 23;
      
      // Try HTTP first on the specified port
      try {
        logger.info(`Testing HTTP on port ${olt.port}`);
        const httpResult = await testHTTPConnection(olt);
        if (httpResult.success) {
          return httpResult;
        }
      } catch (httpErr) {
        logger.warn(`HTTP failed on port ${olt.port}: ${httpErr.message}`);
      }
      
      // Try fallback method
      if (fallbackMethod === 'telnet') {
        try {
          logger.info(`Testing Telnet fallback on port ${telnetPort}`);
          const telnetOlt = { ...olt, port: telnetPort };
          const telnetResult = await testTelnetConnection(telnetOlt);
          if (telnetResult.success) {
            return { ...telnetResult, note: `HTTP failed, Telnet on port ${telnetPort} works` };
          }
        } catch (telnetErr) {
          logger.warn(`Telnet failed on port ${telnetPort}: ${telnetErr.message}`);
        }
        
        // Try SSH as last resort
        try {
          logger.info(`Testing SSH fallback on port 22`);
          const sshOlt = { ...olt, port: 22 };
          const sshResult = await testSSHConnection(sshOlt);
          if (sshResult.success) {
            return { ...sshResult, note: 'HTTP and Telnet failed, SSH on port 22 works' };
          }
        } catch (sshErr) {
          throw new Error(`All protocols failed - HTTP:${olt.port}, Telnet:${telnetPort}, SSH:22`);
        }
      } else if (fallbackMethod === 'ssh') {
        try {
          logger.info(`Testing SSH fallback on port 22`);
          const sshOlt = { ...olt, port: 22 };
          const sshResult = await testSSHConnection(sshOlt);
          if (sshResult.success) {
            return { ...sshResult, note: 'HTTP failed, SSH on port 22 works' };
          }
        } catch (sshErr) {
          throw new Error(`All protocols failed - HTTP:${olt.port}, SSH:22`);
        }
      }
      
      throw new Error(`Connection failed on all protocols`);
    }
    
    // Standard connection types
    switch (connectionType) {
      case 'http':
        return await testHTTPConnection(olt);
        
      case 'ssh':
        return await testSSHConnection(olt);
        
      case 'telnet':
        return await testTelnetConnection(olt);
        
      case 'http_first':
        // Try HTTP first, then Telnet, then SSH
        try {
          return await testHTTPConnection(olt);
        } catch (httpErr) {
          logger.warn(`HTTP failed, trying Telnet fallback`);
          try {
            const telnetOlt = { ...olt, port: config.telnetPort || 23 };
            return await testTelnetConnection(telnetOlt);
          } catch (telnetErr) {
            logger.warn(`Telnet failed, trying SSH fallback`);
            try {
              const sshOlt = { ...olt, port: 22 };
              return await testSSHConnection(sshOlt);
            } catch (sshErr) {
              throw new Error(`HTTP: ${httpErr.message}, Telnet: ${telnetErr.message}, SSH: ${sshErr.message}`);
            }
          }
        }
        
      case 'telnet_first':
        // Try Telnet first
        try {
          return await testTelnetConnection(olt);
        } catch (telnetErr) {
          logger.warn(`Telnet failed, trying SSH fallback`);
          try {
            const sshOlt = { ...olt, port: 22 };
            return await testSSHConnection(sshOlt);
          } catch (sshErr) {
            throw new Error(`Telnet: ${telnetErr.message}, SSH: ${sshErr.message}`);
          }
        }
        
      case 'telnet_first_custom':
        // Try Telnet on the custom/provided port first (for port forwarding)
        try {
          logger.info(`Testing Telnet on custom port ${olt.port}`);
          const result = await testTelnetConnection(olt);
          if (result.success) {
            return { ...result, note: `Telnet on port ${olt.port} works` };
          }
        } catch (telnetErr) {
          logger.warn(`Telnet on custom port ${olt.port} failed, trying HTTP fallback`);
        }
        
        // Try HTTP on the same port
        try {
          logger.info(`Testing HTTP fallback on port ${olt.port}`);
          const httpResult = await testHTTPConnection(olt);
          if (httpResult.success) {
            return { ...httpResult, note: `HTTP on port ${olt.port} works` };
          }
        } catch (httpErr) {
          logger.warn(`HTTP on port ${olt.port} failed, trying SSH`);
        }
        
        // Try SSH on port 22
        try {
          logger.info(`Testing SSH fallback on port 22`);
          const sshOlt = { ...olt, port: 22 };
          const sshResult = await testSSHConnection(sshOlt);
          if (sshResult.success) {
            return { ...sshResult, note: 'SSH on port 22 works' };
          }
        } catch (sshErr) {
          // All failed
        }
        
        throw new Error(`All protocols failed on port ${olt.port} and fallbacks`);
        
      case 'ssh_first':
        // Try SSH first
        try {
          return await testSSHConnection(olt);
        } catch (sshErr) {
          logger.warn(`SSH failed, trying Telnet fallback`);
          try {
            const telnetOlt = { ...olt, port: config.telnetPort || 23 };
            return await testTelnetConnection(telnetOlt);
          } catch (telnetErr) {
            throw new Error(`SSH: ${sshErr.message}, Telnet: ${telnetErr.message}`);
          }
        }
        
      case 'snmp':
        return await testSNMPConnection(olt);
        
      case 'auto_detect':
      default:
        // Auto-detect: Try HTTP -> Telnet -> SSH -> SNMP
        try {
          return await testHTTPConnection(olt);
        } catch (httpErr) {
          try {
            const telnetOlt = { ...olt, port: config.telnetPort || olt.port };
            return await testTelnetConnection(telnetOlt);
          } catch (telnetErr) {
            try {
              const sshOlt = { ...olt, port: 22 };
              return await testSSHConnection(sshOlt);
            } catch (sshErr) {
              // Try SNMP as last resort
              try {
                const snmpOlt = { ...olt, port: 161 };
                return await testSNMPConnection(snmpOlt);
              } catch (snmpErr) {
                throw new Error(`All protocols failed - HTTP, Telnet, SSH, SNMP`);
              }
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
 * Test all protocols and return which ones work
 */
export async function testAllProtocols(olt) {
  const config = OLT_PROTOCOL_CONFIG[olt.brand] || OLT_PROTOCOL_CONFIG.Other;
  const results = {
    http: null,
    telnet: null,
    ssh: null,
    snmp: null,
    recommended: null
  };
  
  // Test HTTP on common web ports
  const httpPorts = [olt.port, 80, 8080, 8085, 443].filter((v, i, a) => a.indexOf(v) === i);
  for (const port of httpPorts) {
    try {
      const httpOlt = { ...olt, port };
      const result = await testHTTPConnection(httpOlt);
      if (result.success) {
        results.http = { success: true, port, ...result };
        break;
      }
    } catch (e) {
      // Continue trying other ports
    }
  }
  if (!results.http) {
    results.http = { success: false, error: 'No HTTP ports responded' };
  }
  
  // Test Telnet on both the provided port AND port 23
  const telnetPorts = [olt.port, config.telnetPort || 23, 23].filter((v, i, a) => a.indexOf(v) === i);
  for (const port of telnetPorts) {
    try {
      const telnetOlt = { ...olt, port };
      const result = await testTelnetConnection(telnetOlt);
      if (result.success) {
        results.telnet = { success: true, port, ...result };
        break;
      }
    } catch (e) {
      // Continue trying other ports
    }
  }
  if (!results.telnet) {
    results.telnet = { success: false, error: 'No Telnet ports responded' };
  }
  
  // Test SSH on port 22
  try {
    const sshOlt = { ...olt, port: 22 };
    results.ssh = await testSSHConnection(sshOlt);
    results.ssh.port = 22;
  } catch (e) {
    results.ssh = { success: false, error: e.message };
  }
  
  // Test SNMP on port 161
  try {
    const snmpOlt = { ...olt, port: 161 };
    results.snmp = await testSNMPConnection(snmpOlt);
    results.snmp.port = 161;
  } catch (e) {
    results.snmp = { success: false, error: e.message };
  }
  
  // Determine recommended protocol
  if (results.http?.success) {
    results.recommended = { protocol: 'HTTP', port: results.http.port };
  } else if (results.telnet?.success) {
    results.recommended = { protocol: 'Telnet', port: results.telnet.port };
  } else if (results.ssh?.success) {
    results.recommended = { protocol: 'SSH', port: 22 };
  } else if (results.snmp?.success) {
    results.recommended = { protocol: 'SNMP', port: 161, note: 'Limited data - status only' };
  } else {
    results.recommended = null;
  }
  
  return results;
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
    
    // Check if we got a response (even a login page is success for connection test)
    if (response.ok || response.status === 401 || response.status === 403 || response.status === 302) {
      return { 
        success: true, 
        duration: Date.now() - startTime,
        method: 'HTTP API',
        note: response.status === 401 || response.status === 403 ? 'Auth required' : 'Web interface accessible'
      };
    }
    
    // Even if we get HTML response, it means connection works
    const text = await response.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      return { 
        success: true, 
        duration: Date.now() - startTime,
        method: 'HTTP API',
        note: 'Web interface accessible (login page detected)'
      };
    }
    
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
