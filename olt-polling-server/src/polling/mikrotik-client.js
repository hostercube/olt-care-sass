import { logger } from '../utils/logger.js';

/**
 * MikroTik RouterOS API Client
 * Connects to MikroTik routers to fetch PPPoE sessions, MAC addresses, and router info
 */

const MIKROTIK_TIMEOUT = parseInt(process.env.MIKROTIK_TIMEOUT_MS || '30000');

/**
 * Fetch PPPoE active sessions from MikroTik
 */
export async function fetchMikroTikPPPoE(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    logger.debug('MikroTik not configured, skipping...');
    return [];
  }

  try {
    const sessions = await callMikroTikAPI(mikrotik, '/ppp/active/print');
    
    // Transform to our format
    return sessions.map(session => ({
      pppoe_username: session.name || session.user,
      mac_address: session['caller-id'] || session['mac-address'],
      ip_address: session.address,
      uptime: session.uptime,
      service: session.service,
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik PPPoE data:`, error.message);
    return [];
  }
}

/**
 * Fetch ARP table from MikroTik for MAC-IP mapping
 */
export async function fetchMikroTikARP(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return [];
  }

  try {
    const arpEntries = await callMikroTikAPI(mikrotik, '/ip/arp/print');
    
    return arpEntries.map(entry => ({
      ip_address: entry.address,
      mac_address: entry['mac-address'],
      interface: entry.interface,
      dynamic: entry.dynamic === 'true',
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik ARP data:`, error.message);
    return [];
  }
}

/**
 * Fetch DHCP leases from MikroTik
 */
export async function fetchMikroTikDHCPLeases(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return [];
  }

  try {
    const leases = await callMikroTikAPI(mikrotik, '/ip/dhcp-server/lease/print');
    
    return leases.map(lease => ({
      ip_address: lease.address,
      mac_address: lease['mac-address'],
      hostname: lease['host-name'] || lease.comment,
      status: lease.status,
      expires_after: lease['expires-after'],
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik DHCP leases:`, error.message);
    return [];
  }
}

/**
 * Make a call to MikroTik REST API (RouterOS 7.x)
 * Falls back to plain API if REST is not available
 */
async function callMikroTikAPI(mikrotik, endpoint) {
  const { ip, port = 8728, username, password } = mikrotik;
  
  // Try REST API first (RouterOS 7.x with www-ssl or www enabled)
  try {
    const restResult = await callMikroTikREST(mikrotik, endpoint);
    if (restResult) return restResult;
  } catch (err) {
    logger.debug(`REST API failed, trying plain API: ${err.message}`);
  }
  
  // Fall back to plain API connection
  return await callMikroTikPlainAPI(mikrotik, endpoint);
}

/**
 * Call MikroTik REST API (RouterOS 7.1+)
 */
async function callMikroTikREST(mikrotik, endpoint) {
  const { ip, username, password } = mikrotik;
  const port = mikrotik.port || 443; // REST API typically on 443 or 8729
  
  const url = `https://${ip}:${port}/rest${endpoint}`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MIKROTIK_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // Skip TLS verification for self-signed certs
      ...(typeof process !== 'undefined' && { 
        agent: new (await import('https')).Agent({ rejectUnauthorized: false })
      }),
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Call MikroTik Plain API (port 8728/8729)
 * This is a simplified implementation - for production use the 'routeros-client' npm package
 */
async function callMikroTikPlainAPI(mikrotik, endpoint) {
  const net = await import('net');
  const crypto = await import('crypto');
  
  const { ip, port = 8728, username, password } = mikrotik;
  
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const responses = [];
    let buffer = '';
    
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('MikroTik API timeout'));
    }, MIKROTIK_TIMEOUT);
    
    socket.connect(port, ip, () => {
      logger.debug(`Connected to MikroTik API at ${ip}:${port}`);
      
      // Send login command
      const loginCmd = `/login\n=name=${username}\n=password=${password}\n\n`;
      socket.write(encodeAPIWord(loginCmd));
    });
    
    socket.on('data', (data) => {
      buffer += data.toString();
      
      // Parse API responses
      const words = parseAPIResponse(buffer);
      
      if (words.includes('!done')) {
        // After login, send the command
        if (responses.length === 0) {
          const cmd = `${endpoint}\n\n`;
          socket.write(encodeAPIWord(cmd));
        } else {
          clearTimeout(timeout);
          socket.end();
          resolve(responses);
        }
      } else if (words.includes('!trap')) {
        clearTimeout(timeout);
        socket.end();
        reject(new Error('MikroTik API error'));
      } else if (words.includes('!re')) {
        // Parse result entry
        const entry = parseAPIEntry(buffer);
        if (entry) responses.push(entry);
      }
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    socket.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Encode word for MikroTik API protocol
 */
function encodeAPIWord(word) {
  const len = Buffer.byteLength(word);
  let encoded;
  
  if (len < 0x80) {
    encoded = Buffer.alloc(len + 1);
    encoded[0] = len;
    encoded.write(word, 1);
  } else if (len < 0x4000) {
    encoded = Buffer.alloc(len + 2);
    encoded[0] = (len >> 8) | 0x80;
    encoded[1] = len & 0xff;
    encoded.write(word, 2);
  } else {
    encoded = Buffer.alloc(len + 4);
    encoded[0] = (len >> 24) | 0xe0;
    encoded[1] = (len >> 16) & 0xff;
    encoded[2] = (len >> 8) & 0xff;
    encoded[3] = len & 0xff;
    encoded.write(word, 4);
  }
  
  return encoded;
}

/**
 * Parse MikroTik API response
 */
function parseAPIResponse(buffer) {
  return buffer.split('\n').filter(line => line.startsWith('!'));
}

/**
 * Parse a single API entry from response
 */
function parseAPIEntry(buffer) {
  const lines = buffer.split('\n');
  const entry = {};
  
  for (const line of lines) {
    if (line.startsWith('=')) {
      const [key, ...valueParts] = line.substring(1).split('=');
      entry[key] = valueParts.join('=');
    }
  }
  
  return Object.keys(entry).length > 0 ? entry : null;
}

/**
 * Match ONU data with MikroTik PPPoE/DHCP data
 */
export function enrichONUWithMikroTikData(onu, pppoeData, arpData, dhcpData) {
  // Try to match by MAC address
  const macAddress = onu.mac_address?.toLowerCase();
  
  if (!macAddress) return onu;
  
  // Find PPPoE session
  const pppoeSession = pppoeData.find(
    p => p.mac_address?.toLowerCase() === macAddress
  );
  
  // Find ARP entry
  const arpEntry = arpData.find(
    a => a.mac_address?.toLowerCase() === macAddress
  );
  
  // Find DHCP lease
  const dhcpLease = dhcpData.find(
    d => d.mac_address?.toLowerCase() === macAddress
  );
  
  return {
    ...onu,
    pppoe_username: pppoeSession?.pppoe_username || onu.pppoe_username,
    router_name: dhcpLease?.hostname || pppoeSession?.service || onu.router_name,
    // Keep the original MAC or update if found
    mac_address: macAddress || onu.mac_address,
  };
}

/**
 * Test MikroTik connection
 */
export async function testMikrotikConnection(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username) {
    return { success: false, error: 'Missing MikroTik credentials' };
  }

  const startTime = Date.now();

  try {
    // Try REST API first (port 443)
    try {
      const restUrl = `https://${mikrotik.ip}:${mikrotik.port || 443}/rest/system/resource`;
      const auth = Buffer.from(`${mikrotik.username}:${mikrotik.password}`).toString('base64');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(restUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        return { 
          success: true, 
          duration: Date.now() - startTime,
          method: 'REST API'
        };
      }
    } catch (restErr) {
      // REST failed, try plain API
    }

    // Try plain API (port 8728)
    const net = await import('net');
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ success: false, error: 'MikroTik API connection timeout' });
      }, 10000);
      
      socket.connect(mikrotik.port || 8728, mikrotik.ip, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ 
          success: true, 
          duration: Date.now() - startTime,
          method: 'Plain API'
        });
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: `MikroTik API: ${err.message}` });
      });
    });
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      duration: Date.now() - startTime 
    };
  }
}
