import { logger } from '../utils/logger.js';

/**
 * MikroTik RouterOS API Client
 * Connects to MikroTik routers to fetch PPPoE sessions, MAC addresses, router info
 * Supports both REST API (RouterOS 7.x) and plain API (older versions)
 */

const MIKROTIK_TIMEOUT = parseInt(process.env.MIKROTIK_TIMEOUT_MS || '30000');

/**
 * Fetch PPPoE active sessions from MikroTik
 * Returns session details including MAC, username, IP, uptime
 */
export async function fetchMikroTikPPPoE(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    logger.debug('MikroTik not configured, skipping PPPoE fetch...');
    return [];
  }

  try {
    const sessions = await callMikroTikAPI(mikrotik, '/ppp/active/print');
    
    logger.debug(`MikroTik PPPoE: Got ${sessions.length} active sessions`);
    
    // Transform to our format
    return sessions.map(session => ({
      pppoe_username: session.name || session.user,
      mac_address: normalizeMac(session['caller-id'] || session['mac-address']),
      ip_address: session.address,
      uptime: session.uptime,
      service: session.service,
      // Router identity from comment or service name
      router_name: session.comment || session.name,
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
    
    logger.debug(`MikroTik ARP: Got ${arpEntries.length} entries`);
    
    return arpEntries.map(entry => ({
      ip_address: entry.address,
      mac_address: normalizeMac(entry['mac-address']),
      interface: entry.interface,
      dynamic: entry.dynamic === 'true',
      comment: entry.comment,
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik ARP data:`, error.message);
    return [];
  }
}

/**
 * Fetch DHCP leases from MikroTik
 * Contains hostname/router name info
 */
export async function fetchMikroTikDHCPLeases(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return [];
  }

  try {
    const leases = await callMikroTikAPI(mikrotik, '/ip/dhcp-server/lease/print');
    
    logger.debug(`MikroTik DHCP: Got ${leases.length} leases`);
    
    return leases.map(lease => ({
      ip_address: lease.address,
      mac_address: normalizeMac(lease['mac-address']),
      hostname: lease['host-name'] || lease.comment,
      router_name: lease['host-name'] || lease.comment,
      status: lease.status,
      expires_after: lease['expires-after'],
      comment: lease.comment,
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik DHCP leases:`, error.message);
    return [];
  }
}

/**
 * Fetch PPP secrets (PPPoE credentials database) from MikroTik
 * Contains username/password configurations
 */
export async function fetchMikroTikPPPSecrets(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return [];
  }

  try {
    const secrets = await callMikroTikAPI(mikrotik, '/ppp/secret/print');
    
    logger.debug(`MikroTik PPP Secrets: Got ${secrets.length} secrets`);
    
    return secrets.map(secret => ({
      pppoe_username: secret.name,
      pppoe_password: secret.password, // Usually hidden, but worth trying
      profile: secret.profile,
      service: secret.service,
      caller_id: normalizeMac(secret['caller-id']),
      comment: secret.comment,
      router_name: secret.comment || secret.name,
      // Remote address assignment
      remote_address: secret['remote-address'],
      local_address: secret['local-address'],
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik PPP secrets:`, error.message);
    return [];
  }
}

/**
 * Fetch router identity and system info
 */
export async function fetchMikroTikIdentity(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return null;
  }

  try {
    const identity = await callMikroTikAPI(mikrotik, '/system/identity/print');
    const resource = await callMikroTikAPI(mikrotik, '/system/resource/print');
    
    return {
      name: identity[0]?.name || 'MikroTik',
      version: resource[0]?.version,
      uptime: resource[0]?.uptime,
      board_name: resource[0]?.['board-name'],
    };
  } catch (error) {
    logger.error(`Failed to fetch MikroTik identity:`, error.message);
    return null;
  }
}

/**
 * Normalize MAC address to uppercase XX:XX:XX:XX:XX:XX format
 */
function normalizeMac(mac) {
  if (!mac) return null;
  // Remove any separators and convert to uppercase
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();
  if (cleaned.length !== 12) return mac?.toUpperCase();
  // Add colons
  return cleaned.match(/.{2}/g).join(':');
}

/**
 * Make a call to MikroTik API
 * Tries REST API first (RouterOS 7.x), falls back to plain API
 */
async function callMikroTikAPI(mikrotik, endpoint) {
  const { ip, port = 8728, username, password } = mikrotik;
  
  // Try REST API first (RouterOS 7.x with www-ssl or www enabled)
  try {
    const restResult = await callMikroTikREST(mikrotik, endpoint);
    if (restResult && restResult.length >= 0) {
      logger.debug(`MikroTik REST API success for ${endpoint}`);
      return restResult;
    }
  } catch (err) {
    logger.debug(`REST API failed for ${endpoint}: ${err.message}`);
  }
  
  // Fall back to plain API connection
  try {
    const plainResult = await callMikroTikPlainAPI(mikrotik, endpoint);
    logger.debug(`MikroTik Plain API success for ${endpoint}`);
    return plainResult;
  } catch (err) {
    logger.debug(`Plain API failed for ${endpoint}: ${err.message}`);
    throw err;
  }
}

/**
 * Call MikroTik REST API (RouterOS 7.1+)
 */
async function callMikroTikREST(mikrotik, endpoint) {
  const { ip, username, password } = mikrotik;
  // REST API is typically on port 443 (HTTPS) or 80 (HTTP)
  // If mikrotik.port is 8728/8729 (API ports), use 443 for REST
  const restPort = (mikrotik.port === 8728 || mikrotik.port === 8729) ? 443 : (mikrotik.port || 443);
  
  const url = `https://${ip}:${restPort}/rest${endpoint}`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MIKROTIK_TIMEOUT);
  
  try {
    // Dynamic import for https agent
    const https = await import('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      agent: agent,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Call MikroTik Plain API (port 8728/8729)
 * Implements RouterOS API protocol
 */
async function callMikroTikPlainAPI(mikrotik, endpoint) {
  const net = await import('net');
  
  const { ip, port = 8728, username, password } = mikrotik;
  
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const responses = [];
    let buffer = Buffer.alloc(0);
    let loginComplete = false;
    
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('MikroTik API timeout'));
    }, MIKROTIK_TIMEOUT);
    
    socket.connect(port, ip, () => {
      logger.debug(`Connected to MikroTik API at ${ip}:${port}`);
      
      // Send login command using new API login method
      sendCommand(socket, ['/login', `=name=${username}`, `=password=${password}`]);
    });
    
    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      // Parse complete sentences from buffer
      while (buffer.length > 0) {
        const parsed = parseSentence(buffer);
        if (!parsed) break;
        
        const { sentence, bytesRead } = parsed;
        buffer = buffer.slice(bytesRead);
        
        if (sentence.length === 0) continue;
        
        const reply = sentence[0];
        
        if (reply === '!done') {
          if (!loginComplete) {
            loginComplete = true;
            // Send the actual command
            sendCommand(socket, [endpoint]);
          } else {
            clearTimeout(timeout);
            socket.end();
            resolve(responses);
          }
        } else if (reply === '!trap') {
          // Error response - still try to complete
          const errorMsg = sentence.find(s => s.startsWith('=message='));
          logger.debug(`MikroTik API trap: ${errorMsg || 'Unknown error'}`);
        } else if (reply === '!re') {
          // Parse result entry
          const entry = {};
          for (const word of sentence.slice(1)) {
            if (word.startsWith('=')) {
              const eqIdx = word.indexOf('=', 1);
              if (eqIdx > 0) {
                const key = word.substring(1, eqIdx);
                const value = word.substring(eqIdx + 1);
                entry[key] = value;
              }
            }
          }
          if (Object.keys(entry).length > 0) {
            responses.push(entry);
          }
        } else if (reply === '!fatal') {
          clearTimeout(timeout);
          socket.destroy();
          reject(new Error('MikroTik API fatal error'));
        }
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
 * Send a command as API sentence
 */
function sendCommand(socket, words) {
  for (const word of words) {
    socket.write(encodeWord(word));
  }
  // Empty word to end the sentence
  socket.write(Buffer.from([0]));
}

/**
 * Encode a word for MikroTik API protocol
 */
function encodeWord(word) {
  const wordBuf = Buffer.from(word);
  const len = wordBuf.length;
  let lenBuf;
  
  if (len < 0x80) {
    lenBuf = Buffer.from([len]);
  } else if (len < 0x4000) {
    lenBuf = Buffer.from([
      ((len >> 8) & 0x3f) | 0x80,
      len & 0xff
    ]);
  } else if (len < 0x200000) {
    lenBuf = Buffer.from([
      ((len >> 16) & 0x1f) | 0xc0,
      (len >> 8) & 0xff,
      len & 0xff
    ]);
  } else if (len < 0x10000000) {
    lenBuf = Buffer.from([
      ((len >> 24) & 0x0f) | 0xe0,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff
    ]);
  } else {
    lenBuf = Buffer.from([
      0xf0,
      (len >> 24) & 0xff,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff
    ]);
  }
  
  return Buffer.concat([lenBuf, wordBuf]);
}

/**
 * Parse a sentence from the buffer
 * Returns { sentence: string[], bytesRead: number } or null if incomplete
 */
function parseSentence(buffer) {
  const words = [];
  let offset = 0;
  
  while (offset < buffer.length) {
    const lenInfo = decodeLength(buffer, offset);
    if (!lenInfo) return null; // Incomplete length
    
    const { length, bytesUsed } = lenInfo;
    offset += bytesUsed;
    
    if (length === 0) {
      // End of sentence
      return { sentence: words, bytesRead: offset };
    }
    
    if (offset + length > buffer.length) {
      return null; // Incomplete word
    }
    
    const word = buffer.slice(offset, offset + length).toString();
    words.push(word);
    offset += length;
  }
  
  return null; // No complete sentence
}

/**
 * Decode length from buffer
 */
function decodeLength(buffer, offset) {
  if (offset >= buffer.length) return null;
  
  const b1 = buffer[offset];
  
  if ((b1 & 0x80) === 0) {
    return { length: b1, bytesUsed: 1 };
  } else if ((b1 & 0xc0) === 0x80) {
    if (offset + 1 >= buffer.length) return null;
    const length = ((b1 & 0x3f) << 8) | buffer[offset + 1];
    return { length, bytesUsed: 2 };
  } else if ((b1 & 0xe0) === 0xc0) {
    if (offset + 2 >= buffer.length) return null;
    const length = ((b1 & 0x1f) << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2];
    return { length, bytesUsed: 3 };
  } else if ((b1 & 0xf0) === 0xe0) {
    if (offset + 3 >= buffer.length) return null;
    const length = ((b1 & 0x0f) << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
    return { length, bytesUsed: 4 };
  } else if (b1 === 0xf0) {
    if (offset + 4 >= buffer.length) return null;
    const length = (buffer[offset + 1] << 24) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 8) | buffer[offset + 4];
    return { length, bytesUsed: 5 };
  }
  
  return { length: 0, bytesUsed: 1 };
}

/**
 * Match ONU data with MikroTik PPPoE/DHCP data
 * Enriches ONU with router name, PPPoE username, etc.
 */
export function enrichONUWithMikroTikData(onu, pppoeData, arpData, dhcpData, pppSecretsData = []) {
  // Try to match by MAC address
  const macAddress = onu.mac_address?.toUpperCase();
  
  if (!macAddress) return onu;
  
  // Find PPPoE session (active connection)
  const pppoeSession = pppoeData.find(
    p => p.mac_address === macAddress
  );
  
  // Find ARP entry
  const arpEntry = arpData.find(
    a => a.mac_address === macAddress
  );
  
  // Find DHCP lease
  const dhcpLease = dhcpData.find(
    d => d.mac_address === macAddress
  );
  
  // Find PPP secret by caller-id (MAC) or by matching username
  const pppSecret = pppSecretsData.find(
    s => s.caller_id === macAddress || 
         (pppoeSession && s.pppoe_username === pppoeSession.pppoe_username)
  );
  
  // Determine router name from various sources
  let routerName = onu.router_name;
  if (!routerName && dhcpLease?.hostname) {
    routerName = dhcpLease.hostname;
  }
  if (!routerName && pppoeSession?.router_name) {
    routerName = pppoeSession.router_name;
  }
  if (!routerName && arpEntry?.comment) {
    routerName = arpEntry.comment;
  }
  if (!routerName && pppSecret?.comment) {
    routerName = pppSecret.comment;
  }
  
  return {
    ...onu,
    pppoe_username: pppoeSession?.pppoe_username || pppSecret?.pppoe_username || onu.pppoe_username,
    router_name: routerName,
    mac_address: macAddress,
    // Status can be inferred from PPPoE session
    status: pppoeSession ? 'online' : onu.status,
  };
}

/**
 * Fetch all MikroTik data at once
 */
export async function fetchAllMikroTikData(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    logger.debug('MikroTik not configured, skipping...');
    return {
      pppoe: [],
      arp: [],
      dhcp: [],
      secrets: [],
    };
  }
  
  logger.info(`Fetching MikroTik data from ${mikrotik.ip}:${mikrotik.port || 8728}...`);
  
  // Fetch all data in parallel
  const [pppoe, arp, dhcp, secrets] = await Promise.all([
    fetchMikroTikPPPoE(mikrotik),
    fetchMikroTikARP(mikrotik),
    fetchMikroTikDHCPLeases(mikrotik),
    fetchMikroTikPPPSecrets(mikrotik),
  ]);
  
  logger.info(`MikroTik data: ${pppoe.length} PPPoE, ${arp.length} ARP, ${dhcp.length} DHCP, ${secrets.length} secrets`);
  
  return { pppoe, arp, dhcp, secrets };
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
      const https = await import('https');
      const agent = new https.Agent({ rejectUnauthorized: false });
      
      const restUrl = `https://${mikrotik.ip}:${mikrotik.port === 8728 ? 443 : mikrotik.port || 443}/rest/system/resource`;
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
        agent: agent,
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          duration: Date.now() - startTime,
          method: 'REST API',
          version: data.version || data[0]?.version,
        };
      }
    } catch (restErr) {
      logger.debug(`REST test failed: ${restErr.message}`);
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
