import { logger } from '../utils/logger.js';

/**
 * MikroTik RouterOS API Client
 * Supports BOTH RouterOS 6.x (Plain API) and RouterOS 7.x (REST API)
 * Handles custom port-forwarded ports (like 8090)
 */

const MIKROTIK_TIMEOUT = parseInt(process.env.MIKROTIK_TIMEOUT_MS || '30000');

/**
 * Fetch PPPoE active sessions from MikroTik
 * Returns session details including MAC, username, IP, uptime
 * 
 * IMPORTANT: The caller-id field contains the ONU MAC address
 * This is the key field for matching PPPoE sessions to ONU devices
 */
export async function fetchMikroTikPPPoE(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    logger.debug('MikroTik not configured, skipping PPPoE fetch...');
    return [];
  }

  try {
    const sessions = await callMikroTikAPI(mikrotik, '/ppp/active/print');
    
    logger.info(`MikroTik PPPoE: Got ${sessions.length} active sessions from ${mikrotik.ip}:${mikrotik.port}`);
    
    // Transform to our format - caller-id is the ONU MAC address
    const result = sessions.map(session => {
      // caller-id typically contains the MAC address of the connecting device (ONU)
      const callerId = session['caller-id'] || '';
      const macAddress = normalizeMac(callerId);
      
      const mapped = {
        pppoe_username: session.name || session.user,
        mac_address: macAddress,  // This is the ONU MAC from caller-id
        ip_address: session.address,
        uptime: session.uptime,
        service: session.service,
        // Router identity from comment or username
        router_name: session.comment || session.name,
        // Keep raw caller-id for debugging
        raw_caller_id: callerId,
      };
      
      logger.debug(`PPPoE session: ${mapped.pppoe_username}, caller-id: ${callerId} -> MAC: ${macAddress}`);
      return mapped;
    });
    
    // Log sample for debugging
    if (result.length > 0) {
      logger.info(`Sample PPPoE: username=${result[0].pppoe_username}, mac=${result[0].mac_address}, caller-id=${result[0].raw_caller_id}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Failed to fetch MikroTik PPPoE data from ${mikrotik.ip}:${mikrotik.port}:`, error.message);
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
 * Supports both REST API (RouterOS 7.x) and Plain API (RouterOS 6.x)
 * 
 * Strategy for custom ports like 8090:
 * 1. Try REST API with HTTP first (most common for port-forwarded setups)
 * 2. Try REST API with HTTPS
 * 3. Fall back to Plain API on the same port
 */
async function callMikroTikAPI(mikrotik, endpoint) {
  const { ip, port = 8728, username, password } = mikrotik;
  
  logger.info(`MikroTik API call to ${ip}:${port} - endpoint: ${endpoint}`);
  
  const isStandardPlainPort = [8728, 8729].includes(port);
  const errors = [];
  
  if (!isStandardPlainPort) {
    // Custom port (like 8090) - likely REST API port-forwarded
    
    // Strategy 1: REST API with HTTP first (common for port forwarding)
    try {
      logger.debug(`Trying REST API (HTTP) on port ${port}...`);
      const result = await callMikroTikREST(mikrotik, endpoint, port, 'http');
      if (result && result.length >= 0) {
        logger.info(`MikroTik REST API (HTTP) success on port ${port} - got ${result.length} items`);
        return result;
      }
    } catch (err) {
      errors.push(`REST-HTTP:${port}: ${err.message}`);
      logger.debug(`REST API (HTTP) failed on port ${port}: ${err.message}`);
    }
    
    // Strategy 2: REST API with HTTPS
    try {
      logger.debug(`Trying REST API (HTTPS) on port ${port}...`);
      const result = await callMikroTikREST(mikrotik, endpoint, port, 'https');
      if (result && result.length >= 0) {
        logger.info(`MikroTik REST API (HTTPS) success on port ${port} - got ${result.length} items`);
        return result;
      }
    } catch (err) {
      errors.push(`REST-HTTPS:${port}: ${err.message}`);
      logger.debug(`REST API (HTTPS) failed on port ${port}: ${err.message}`);
    }
    
    // Strategy 3: Plain API on the same port (in case it's a port-forwarded Plain API)
    try {
      logger.debug(`Trying Plain API on port ${port}...`);
      const result = await callMikroTikPlainAPI(mikrotik, endpoint);
      logger.info(`MikroTik Plain API success on port ${port} - got ${result.length} items`);
      return result;
    } catch (err) {
      errors.push(`Plain:${port}: ${err.message}`);
      logger.debug(`Plain API failed on port ${port}: ${err.message}`);
    }
    
    // Strategy 4: Try standard Plain API port 8728 as fallback
    if (port !== 8728) {
      try {
        logger.debug(`Trying Plain API on default port 8728...`);
        const result = await callMikroTikPlainAPI({ ...mikrotik, port: 8728 }, endpoint);
        logger.info(`MikroTik Plain API success on 8728 - got ${result.length} items`);
        return result;
      } catch (err) {
        errors.push(`Plain:8728: ${err.message}`);
        logger.debug(`Plain API failed on port 8728: ${err.message}`);
      }
    }
    
    throw new Error(`All MikroTik API attempts failed: ${errors.join(', ')}`);
  } else {
    // Standard Plain API port (8728/8729)
    try {
      logger.debug(`Trying Plain API on port ${port}...`);
      const result = await callMikroTikPlainAPI(mikrotik, endpoint);
      logger.info(`MikroTik Plain API success - got ${result.length} items`);
      return result;
    } catch (err) {
      errors.push(`Plain:${port}: ${err.message}`);
      logger.debug(`Plain API failed: ${err.message}`);
      
      // Fallback to REST API on HTTPS 443
      try {
        logger.debug(`Trying REST API on port 443 as fallback...`);
        const result = await callMikroTikREST(mikrotik, endpoint, 443, 'https');
        if (result && result.length >= 0) {
          logger.info(`MikroTik REST API fallback success - got ${result.length} items`);
          return result;
        }
      } catch (restErr) {
        errors.push(`REST:443: ${restErr.message}`);
        logger.debug(`REST API fallback failed: ${restErr.message}`);
      }
      
      throw new Error(`All MikroTik API attempts failed: ${errors.join(', ')}`);
    }
  }
}

/**
 * Call MikroTik REST API (RouterOS 7.1+)
 * REST API can run on custom ports (like 8090) when port forwarding is used
 * 
 * @param {object} mikrotik - MikroTik connection info
 * @param {string} endpoint - API endpoint like /ppp/active/print
 * @param {number} restPort - Port number for REST API
 * @param {string} protocol - 'http' or 'https'
 */
async function callMikroTikREST(mikrotik, endpoint, restPort, protocol = 'http') {
  const { ip, username, password } = mikrotik;

  // RouterOS REST paths do NOT use "/print" suffix
  const restEndpoint = endpoint.replace(/\/print$/, '');

  const url = `${protocol}://${ip}:${restPort}/rest${restEndpoint}`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MIKROTIK_TIMEOUT);

  try {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    };
    
    // Add agent for HTTPS to ignore self-signed certs
    if (protocol === 'https') {
      const https = await import('https');
      options.agent = new https.Agent({ rejectUnauthorized: false });
    }

    logger.debug(`REST API request: ${url}`);
    const response = await fetch(url, options);

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    logger.debug(`REST API response (${Array.isArray(data) ? data.length : 1} items): ${JSON.stringify(data).slice(0, 300)}...`);
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Call MikroTik Plain API (RouterOS 6.x and 7.x)
 * Implements RouterOS API protocol over TCP socket
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
      logger.debug(`Connected to MikroTik Plain API at ${ip}:${port}`);
      
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
 * 
 * IMPORTANT: PPPoE caller-id in MikroTik contains the ONU MAC address
 * This is the PRIMARY way to link ONU devices to their PPPoE sessions
 * 
 * FALLBACK: If no MAC match, try ONU serial or index based matching
 */
export function enrichONUWithMikroTikData(onu, pppoeData, arpData, dhcpData, pppSecretsData = []) {
  // Try to match by MAC address first
  const macAddress = onu.mac_address?.toUpperCase();
  const serialNumber = onu.serial_number?.toUpperCase();
  const onuIndex = onu.onu_index;
  const ponPort = onu.pon_port;
  
  // Normalize MAC for comparison (remove colons/dashes, uppercase)
  const macNormalized = macAddress?.replace(/[:-]/g, '').toUpperCase();
  
  // Log for debugging
  logger.debug(`Matching ONU: MAC=${macAddress || 'N/A'}, Serial=${serialNumber || 'N/A'}, Index=${onuIndex}, PON=${ponPort}`);
  logger.debug(`Available PPPoE sessions: ${pppoeData.length}, Secrets: ${pppSecretsData.length}`);
  
  let pppoeSession = null;
  let pppSecret = null;
  let matchMethod = null;
  
  // ============= METHOD 1: Direct MAC match on caller-id field =============
  if (macNormalized && macNormalized.length >= 6) {
    for (const session of pppoeData) {
      const callerId = session.mac_address; // Already normalized in fetchMikroTikPPPoE
      const callerIdNorm = callerId?.replace(/[:-]/g, '').toUpperCase();
      
      if (callerIdNorm && callerIdNorm === macNormalized) {
        pppoeSession = session;
        matchMethod = 'exact-mac';
        logger.debug(`PPPoE match (exact MAC): ${session.pppoe_username} for MAC ${macAddress}`);
        break;
      }
    }
    
    // Method 1b: Partial MAC match (for cases where caller-id has extra chars)
    if (!pppoeSession) {
      for (const session of pppoeData) {
        const callerId = session.mac_address;
        const callerIdNorm = callerId?.replace(/[:-]/g, '').toUpperCase();
        
        if (callerIdNorm && (
          macNormalized.includes(callerIdNorm) || 
          callerIdNorm.includes(macNormalized) ||
          // Check last 6 chars (last 3 bytes of MAC) which are usually unique
          (macNormalized.length >= 6 && callerIdNorm.length >= 6 && 
           macNormalized.slice(-6) === callerIdNorm.slice(-6))
        )) {
          pppoeSession = session;
          matchMethod = 'partial-mac';
          logger.debug(`PPPoE match (partial MAC): ${session.pppoe_username} for MAC ${macAddress}`);
          break;
        }
      }
    }
  }
  
  // ============= METHOD 2: Serial number in PPP secrets comment =============
  if (!pppoeSession && serialNumber) {
    // Check if serial appears in PPP secrets comment or username
    for (const secret of pppSecretsData) {
      const comment = secret.comment?.toUpperCase() || '';
      const username = secret.pppoe_username?.toUpperCase() || '';
      
      if (comment.includes(serialNumber) || serialNumber.includes(username.slice(-8))) {
        pppSecret = secret;
        matchMethod = 'serial-in-comment';
        logger.debug(`PPP Secret match (serial in comment): ${secret.pppoe_username} for serial ${serialNumber}`);
        // Find active session for this secret
        pppoeSession = pppoeData.find(s => s.pppoe_username === secret.pppoe_username);
        break;
      }
    }
  }
  
  // ============= METHOD 3: ONU index/PON port pattern in username =============
  if (!pppoeSession && ponPort && onuIndex !== undefined) {
    // Many ISPs use patterns like: user_pon1_onu5, pon1-5, 1-5, etc.
    const patterns = [
      `${ponPort}-${onuIndex}`,           // 1-5
      `${ponPort}_${onuIndex}`,           // 1_5
      `pon${ponPort}-${onuIndex}`,        // pon1-5
      `pon${ponPort}_${onuIndex}`,        // pon1_5
      `p${ponPort}o${onuIndex}`,          // p1o5
    ];
    
    for (const session of pppoeData) {
      const username = session.pppoe_username?.toLowerCase() || '';
      for (const pattern of patterns) {
        if (username.includes(pattern.toLowerCase())) {
          pppoeSession = session;
          matchMethod = 'pon-onu-pattern';
          logger.debug(`PPPoE match (PON/ONU pattern): ${session.pppoe_username} for PON ${ponPort} ONU ${onuIndex}`);
          break;
        }
      }
      if (pppoeSession) break;
    }
  }
  
  // ============= METHOD 4: Check PPP secrets by caller-id =============
  if (!pppSecret) {
    for (const secret of pppSecretsData) {
      const callerId = secret.caller_id;
      const callerIdNorm = callerId?.replace(/[:-]/g, '').toUpperCase();
      
      if (macNormalized && callerIdNorm && (
        callerIdNorm === macNormalized || 
        macNormalized.includes(callerIdNorm) || 
        callerIdNorm.includes(macNormalized)
      )) {
        pppSecret = secret;
        matchMethod = matchMethod || 'secret-caller-id';
        logger.debug(`PPP Secret match (caller-id): ${secret.pppoe_username} for MAC ${macAddress}`);
        break;
      }
    }
  }
  
  // Also check if we have a PPPoE session username that matches a secret
  if (!pppSecret && pppoeSession) {
    pppSecret = pppSecretsData.find(s => s.pppoe_username === pppoeSession.pppoe_username);
  }
  
  // Find ARP entry
  let arpEntry = null;
  if (macNormalized) {
    for (const entry of arpData) {
      const arpMac = entry.mac_address?.replace(/[:-]/g, '').toUpperCase();
      if (arpMac && arpMac === macNormalized) {
        arpEntry = entry;
        break;
      }
    }
  }
  
  // Find DHCP lease
  let dhcpLease = null;
  if (macNormalized) {
    for (const lease of dhcpData) {
      const leaseMac = lease.mac_address?.replace(/[:-]/g, '').toUpperCase();
      if (leaseMac && leaseMac === macNormalized) {
        dhcpLease = lease;
        break;
      }
    }
  }
  
  // Determine router name from various sources (priority order)
  let routerName = onu.router_name;
  if (!routerName && dhcpLease?.hostname) {
    routerName = dhcpLease.hostname;
  }
  if (!routerName && pppSecret?.comment && pppSecret.comment.length > 0) {
    routerName = pppSecret.comment;
  }
  if (!routerName && pppoeSession?.router_name && pppoeSession.router_name.length > 0) {
    routerName = pppoeSession.router_name;
  }
  if (!routerName && arpEntry?.comment && arpEntry.comment.length > 0) {
    routerName = arpEntry.comment;
  }
  // Use PPPoE username as router name fallback (common pattern in ISPs)
  if (!routerName && (pppoeSession?.pppoe_username || pppSecret?.pppoe_username)) {
    routerName = pppoeSession?.pppoe_username || pppSecret?.pppoe_username;
  }
  
  const enrichedPppoeUsername = pppoeSession?.pppoe_username || pppSecret?.pppoe_username || onu.pppoe_username;
  
  // Log enrichment result
  if (enrichedPppoeUsername || routerName) {
    logger.info(`MikroTik enriched ONU ${onu.mac_address || onu.serial_number}: PPPoE=${enrichedPppoeUsername || 'N/A'}, Router=${routerName || 'N/A'}, Method=${matchMethod || 'none'}`);
  }
  
  return {
    ...onu,
    pppoe_username: enrichedPppoeUsername || onu.pppoe_username,
    router_name: routerName || onu.router_name,
    mac_address: macAddress || onu.mac_address,
    // Status can be inferred from PPPoE session (if active, ONU is online)
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
  
  logger.info(`Connecting to MikroTik at ${mikrotik.ip}:${mikrotik.port || 8728} (user: ${mikrotik.username})...`);
  
  // Fetch all data in parallel
  const [pppoe, arp, dhcp, secrets] = await Promise.all([
    fetchMikroTikPPPoE(mikrotik),
    fetchMikroTikARP(mikrotik),
    fetchMikroTikDHCPLeases(mikrotik),
    fetchMikroTikPPPSecrets(mikrotik),
  ]);
  
  logger.info(`MikroTik data fetched: ${pppoe.length} PPPoE, ${arp.length} ARP, ${dhcp.length} DHCP, ${secrets.length} secrets`);
  
  // Log sample caller-ids for debugging
  if (pppoe.length > 0) {
    const samples = pppoe.slice(0, 5).map(p => `${p.pppoe_username}:${p.mac_address}`).join(', ');
    logger.info(`Sample PPPoE sessions (username:mac): ${samples}`);
  }
  if (secrets.length > 0) {
    const samples = secrets.slice(0, 5).map(s => `${s.pppoe_username}:${s.caller_id || 'no-caller-id'}`).join(', ');
    logger.info(`Sample PPP secrets (username:caller-id): ${samples}`);
  }
  
  return { pppoe, arp, dhcp, secrets };
}

/**
 * Test MikroTik connection - supports both v6 and v7
 */
export async function testMikrotikConnection(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username) {
    return { success: false, error: 'Missing MikroTik credentials' };
  }

  const startTime = Date.now();
  const apiPort = mikrotik.port || 8728;
  const isStandardPlainPort = [8728, 8729].includes(apiPort);

  try {
    // For custom ports, try REST API first (most likely scenario)
    if (!isStandardPlainPort) {
      // Try HTTP REST first
      try {
        const url = `http://${mikrotik.ip}:${apiPort}/rest/system/resource`;
        const auth = Buffer.from(`${mikrotik.username}:${mikrotik.password}`).toString('base64');
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            duration: Date.now() - startTime,
            method: `REST API HTTP (port ${apiPort})`,
            version: data.version || data[0]?.version,
          };
        }
      } catch (err) {
        logger.debug(`REST HTTP test failed on port ${apiPort}: ${err.message}`);
      }
      
      // Try HTTPS REST
      try {
        const https = await import('https');
        const agent = new https.Agent({ rejectUnauthorized: false });
        
        const url = `https://${mikrotik.ip}:${apiPort}/rest/system/resource`;
        const auth = Buffer.from(`${mikrotik.username}:${mikrotik.password}`).toString('base64');
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
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
        
        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            duration: Date.now() - startTime,
            method: `REST API HTTPS (port ${apiPort})`,
            version: data.version || data[0]?.version,
          };
        }
      } catch (err) {
        logger.debug(`REST HTTPS test failed on port ${apiPort}: ${err.message}`);
      }
    }

    // Try plain API on the configured port
    const net = await import('net');
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ success: false, error: `MikroTik API timeout on port ${apiPort}` });
      }, 10000);
      
      socket.connect(apiPort, mikrotik.ip, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          success: true, 
          duration: Date.now() - startTime,
          method: `Plain API (port ${apiPort})`
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
