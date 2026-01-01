import { logger } from '../utils/logger.js';

/**
 * MikroTik RouterOS API Client
 * Supports BOTH RouterOS 6.x (Plain API) and RouterOS 7.x (REST API)
 * 
 * RouterOS 6.x: Uses Plain API protocol on port 8728 (default) or custom port
 * RouterOS 7.x: Uses REST API on www-ssl (443), www (80), or custom port
 * 
 * Detection Strategy:
 * 1. First detect RouterOS version via quick probe
 * 2. Use appropriate API based on version
 */

const MIKROTIK_TIMEOUT = parseInt(process.env.MIKROTIK_TIMEOUT_MS || '30000');

// Store detected connection method per device
const deviceConnectionCache = new Map();

/**
 * Normalize MAC address to uppercase XX:XX:XX:XX:XX:XX format
 */
function normalizeMac(mac) {
  if (!mac) return null;

  // Extract first MAC-like pattern from any string (e.g. "AA:BB:CC:DD:EE:FF", "aabb.ccdd.eeff", "AA:BB:...@pppoe")
  const raw = String(mac).trim();
  const match = raw.match(/([0-9A-Fa-f]{2}([:\-\.]?)){5}[0-9A-Fa-f]{2}/);
  const candidate = match ? match[0] : raw;

  // Remove separators and convert to uppercase
  const cleaned = candidate.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (cleaned.length !== 12) return raw.toUpperCase();

  return cleaned.match(/.{2}/g).join(':');
}

/**
 * Detect RouterOS version and best API method
 * Returns: { version: string, majorVersion: number, method: 'rest' | 'plain', port: number, protocol: 'http' | 'https' }
 */
async function detectRouterOSVersion(mikrotik) {
  const { ip, port = 8728, username, password } = mikrotik;
  const cacheKey = `${ip}:${port}`;
  
  // Check cache first (valid for 5 minutes)
  const cached = deviceConnectionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < 300000) {
    logger.debug(`Using cached connection method for ${cacheKey}: ${cached.method} v${cached.version} on port ${cached.port}`);
    return cached;
  }
  
  logger.info(`Detecting RouterOS version for ${ip} (configured port: ${port})...`);
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  // Build ordered list of ports to try
  // Priority: custom port first, then default API ports, then web ports
  const customPort = port;
  const isCustomPort = customPort && ![8728, 8729, 80, 443].includes(customPort);
  
  // Define all port/method combinations to try
  const attempts = [];
  
  // 1. If custom port provided, try ALL methods on it first
  if (isCustomPort) {
    attempts.push({ type: 'rest', port: customPort, protocol: 'http', label: `Custom port ${customPort} REST HTTP` });
    attempts.push({ type: 'rest', port: customPort, protocol: 'https', label: `Custom port ${customPort} REST HTTPS` });
    attempts.push({ type: 'plain', port: customPort, label: `Custom port ${customPort} Plain API` });
  }
  
  // 2. Default API ports (Plain API - RouterOS 6.x standard)
  attempts.push({ type: 'plain', port: 8728, label: 'Default Plain API 8728' });
  attempts.push({ type: 'plain', port: 8729, label: 'Default Plain API-SSL 8729' });
  
  // 3. Standard REST ports (RouterOS 7.x)
  attempts.push({ type: 'rest', port: 443, protocol: 'https', label: 'REST HTTPS 443' });
  attempts.push({ type: 'rest', port: 80, protocol: 'http', label: 'REST HTTP 80' });
  
  // 4. If custom port was same as default, we already covered it, but add configured port to fallback
  if (customPort === 8728 || customPort === 8729) {
    // Already covered above
  }
  
  for (const attempt of attempts) {
    try {
      logger.debug(`Trying ${attempt.label}...`);
      
      let result = null;
      if (attempt.type === 'rest') {
        result = await tryRESTAPI(ip, attempt.port, auth, attempt.protocol);
      } else {
        result = await tryPlainAPIVersion(ip, attempt.port, username, password);
      }
      
      if (result) {
        const connectionInfo = { 
          ...result, 
          timestamp: Date.now(),
          configuredPort: customPort,
          detectedPort: attempt.port,
        };
        deviceConnectionCache.set(cacheKey, connectionInfo);
        logger.info(`RouterOS detected via ${attempt.label}: v${result.version} (method: ${result.method})`);
        return connectionInfo;
      }
    } catch (err) {
      logger.debug(`${attempt.label} failed: ${err.message}`);
    }
  }

  // Fallback: assume v6 Plain API on configured port or 8728
  logger.warn(`Could not detect RouterOS version for ${ip}, assuming v6 Plain API`);
  const fallbackPort = isCustomPort ? customPort : 8728;
  const fallback = { 
    version: '6.x', 
    majorVersion: 6, 
    method: 'plain', 
    port: fallbackPort,
    configuredPort: customPort,
    detectedPort: fallbackPort,
  };
  deviceConnectionCache.set(cacheKey, { ...fallback, timestamp: Date.now() });
  return fallback;
}

/**
 * Try REST API and get version
 */
async function tryRESTAPI(ip, port, auth, protocol) {
  const url = `${protocol}://${ip}:${port}/rest/system/resource`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
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
    
    // For HTTPS, ignore self-signed certs
    if (protocol === 'https') {
      const https = await import('https');
      options.agent = new https.Agent({ rejectUnauthorized: false });
    }
    
    logger.debug(`Probing REST API: ${url}`);
    const response = await fetch(url, options);
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      const versionStr = data.version || data[0]?.version || '';
      const majorMatch = versionStr.match(/^(\d+)/);
      const majorVersion = majorMatch ? parseInt(majorMatch[1]) : 7;
      
      return {
        version: versionStr,
        majorVersion,
        method: 'rest',
        port,
        protocol,
      };
    }
    
    // 401/403 means API is there but auth failed - still REST
    if (response.status === 401 || response.status === 403) {
      logger.warn(`REST API auth failed on ${ip}:${port} - check credentials`);
      return null;
    }
    
    return null;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Try Plain API and get version
 */
async function tryPlainAPIVersion(ip, port, username, password) {
  const net = await import('net');
  
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);
    let loginComplete = false;
    let version = null;
    
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Plain API timeout'));
    }, 8000);
    
    socket.connect(port, ip, () => {
      logger.debug(`Plain API connected to ${ip}:${port}, sending login...`);
      sendPlainCommand(socket, ['/login', `=name=${username}`, `=password=${password}`]);
    });
    
    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      while (buffer.length > 0) {
        const parsed = parsePlainSentence(buffer);
        if (!parsed) break;
        
        const { sentence, bytesRead } = parsed;
        buffer = buffer.slice(bytesRead);
        
        if (sentence.length === 0) continue;
        
        const reply = sentence[0];
        
        if (reply === '!done') {
          if (!loginComplete) {
            loginComplete = true;
            // Get system resource for version
            sendPlainCommand(socket, ['/system/resource/print']);
          } else {
            clearTimeout(timeout);
            socket.end();
            
            const majorMatch = version?.match(/^(\d+)/);
            const majorVersion = majorMatch ? parseInt(majorMatch[1]) : 6;
            
            resolve({
              version: version || '6.x',
              majorVersion,
              method: 'plain',
              port,
            });
          }
        } else if (reply === '!re') {
          // Parse version from resource
          for (const word of sentence) {
            if (word.startsWith('=version=')) {
              version = word.substring(9);
              break;
            }
          }
        } else if (reply === '!trap' || reply === '!fatal') {
          clearTimeout(timeout);
          socket.destroy();
          reject(new Error('Plain API auth failed'));
        }
      }
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Fetch PPPoE active sessions from MikroTik
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
      // caller-id typically contains the MAC address of the connecting device (router behind ONU)
      const callerId = session['caller-id'] || '';
      const macAddress = normalizeMac(callerId);
      const pppoeUsername = session.name || session.user;
      
      // IMPORTANT: Only use comment as router_name if it exists and is NOT the same as username
      // DO NOT fall back to session.name (which is the PPPoE username)
      let routerName = null;
      if (session.comment && session.comment.trim().length > 0) {
        const comment = session.comment.trim();
        // Skip if comment is same as username or looks like metadata
        const looksLikeUsername = comment.toLowerCase() === pppoeUsername?.toLowerCase();
        const looksLikeMetadata = comment.includes('[ONU:') || comment.includes('SN=') || comment.includes('MAC=');
        if (!looksLikeUsername && !looksLikeMetadata) {
          routerName = comment;
        }
      }
      
      const mapped = {
        pppoe_username: pppoeUsername,
        mac_address: macAddress,  // This is the router MAC from caller-id
        ip_address: session.address,
        uptime: session.uptime,
        service: session.service,
        router_name: routerName,  // Only set if we have a valid device name, NOT username
        raw_caller_id: callerId,
      };
      
      logger.debug(`PPPoE session: ${mapped.pppoe_username}, caller-id: ${callerId} -> MAC: ${macAddress}, router: ${routerName || 'N/A'}`);
      return mapped;
    });
    
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
 * Fetch PPP secrets from MikroTik
 */
export async function fetchMikroTikPPPSecrets(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return [];
  }

  try {
    const secrets = await callMikroTikAPI(mikrotik, '/ppp/secret/print');
    
    logger.debug(`MikroTik PPP Secrets: Got ${secrets.length} secrets`);
    
    return secrets.map(secret => {
      const pppoeUsername = secret.name;
      // Only use comment as router_name if it's NOT the same as username and not metadata
      let routerName = null;
      if (secret.comment && secret.comment.trim().length > 0) {
        const comment = secret.comment.trim();
        const looksLikeUsername = comment.toLowerCase() === pppoeUsername?.toLowerCase();
        const looksLikeMetadata = comment.includes('[ONU:') || comment.includes('SN=') || comment.includes('MAC=');
        if (!looksLikeUsername && !looksLikeMetadata) {
          routerName = comment;
        }
      }
      
      return {
        pppoe_username: pppoeUsername,
        pppoe_password: secret.password,
        profile: secret.profile,
        service: secret.service,
        caller_id: normalizeMac(secret['caller-id']),
        comment: secret.comment,
        router_name: routerName,  // Only valid device names, NOT fallback to username
        remote_address: secret['remote-address'],
        local_address: secret['local-address'],
      };
    });
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
 * Main API call function - auto-detects version and uses appropriate method
 */
async function callMikroTikAPI(mikrotik, endpoint) {
  const { ip, port = 8728 } = mikrotik;

  // Detect version and best connection method
  const connectionInfo = await detectRouterOSVersion(mikrotik);

  logger.debug(
    `MikroTik API call to ${ip}:${connectionInfo.port || port} using ${connectionInfo.method} (v${connectionInfo.version}) - endpoint: ${endpoint}`
  );

  try {
    if (connectionInfo.method === 'rest') {
      return await callMikroTikREST(mikrotik, endpoint, connectionInfo);
    }

    return await callMikroTikPlainAPI(mikrotik, endpoint, connectionInfo);
  } catch (error) {
    logger.warn(`MikroTik API call failed for ${endpoint}: ${error.message}`);
    return [];
  }
}

/**
 * Call MikroTik REST API (RouterOS 7.1+)
 */
async function callMikroTikREST(mikrotik, endpoint, connectionInfo) {
  const { ip, username, password } = mikrotik;
  const { port, protocol } = connectionInfo;

  // RouterOS REST paths do NOT use "/print" suffix
  const restEndpoint = endpoint.replace(/\/print$/, '');
  
  const url = `${protocol}://${ip}:${port}/rest${restEndpoint}`;
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
    logger.debug(`REST API response: ${Array.isArray(data) ? data.length : 1} items`);
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
 */
async function callMikroTikPlainAPI(mikrotik, endpoint, connectionInfo) {
  const net = await import('net');
  
  const { ip, username, password } = mikrotik;
  const port = connectionInfo?.port || mikrotik.port || 8728;
  
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
      sendPlainCommand(socket, ['/login', `=name=${username}`, `=password=${password}`]);
    });
    
    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      while (buffer.length > 0) {
        const parsed = parsePlainSentence(buffer);
        if (!parsed) break;
        
        const { sentence, bytesRead } = parsed;
        buffer = buffer.slice(bytesRead);
        
        if (sentence.length === 0) continue;
        
        const reply = sentence[0];
        
        if (reply === '!done') {
          if (!loginComplete) {
            loginComplete = true;
            sendPlainCommand(socket, [endpoint]);
          } else {
            clearTimeout(timeout);
            socket.end();
            resolve(responses);
          }
        } else if (reply === '!trap') {
          const errorMsg = sentence.find(s => s.startsWith('=message='));
          logger.debug(`MikroTik API trap: ${errorMsg || 'Unknown error'}`);
        } else if (reply === '!re') {
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
function sendPlainCommand(socket, words) {
  for (const word of words) {
    socket.write(encodePlainWord(word));
  }
  socket.write(Buffer.from([0]));
}

/**
 * Encode a word for MikroTik API protocol
 */
function encodePlainWord(word) {
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
 */
function parsePlainSentence(buffer) {
  const words = [];
  let offset = 0;
  
  while (offset < buffer.length) {
    const lenInfo = decodePlainLength(buffer, offset);
    if (!lenInfo) return null;
    
    const { length, bytesUsed } = lenInfo;
    offset += bytesUsed;
    
    if (length === 0) {
      return { sentence: words, bytesRead: offset };
    }
    
    if (offset + length > buffer.length) {
      return null;
    }
    
    const word = buffer.slice(offset, offset + length).toString();
    words.push(word);
    offset += length;
  }
  
  return null;
}

/**
 * Decode length from buffer
 */
function decodePlainLength(buffer, offset) {
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
 * 
 * IMPORTANT: ONU MAC != Router MAC!
 * - ONU MAC: The OLT-side device MAC (parsed from OLT CLI)
 * - Router MAC: The CPE/router MAC behind the ONU (appears in PPPoE sessions)
 * 
 * Matching strategies:
 * 1. Serial number in PPP secret name/comment/caller-id (most reliable for EPON)
 * 2. ONU name/description containing PPPoE username
 * 3. PON port + ONU index pattern in PPP secret
 * 4. Last 6 chars of serial matching caller-id (some ISPs use this)
 */
export function enrichONUWithMikroTikData(onu, pppoeData, arpData, dhcpData, pppSecretsData = [], usedMatches = new Set()) {
  const macAddress = onu.mac_address?.toUpperCase();
  const serialNumber = onu.serial_number?.toUpperCase();
  const onuIndex = onu.onu_index;
  const ponPort = onu.pon_port;
  const onuName = onu.name?.toUpperCase() || '';
  
  const macNormalized = macAddress?.replace(/[:-]/g, '').toUpperCase();
  // For EPON, serial is often the MAC without colons
  const serialNormalized = serialNumber?.replace(/[:-]/g, '').toUpperCase();
  // Last 6 chars for partial matching
  const macLast6 = macNormalized?.slice(-6);
  const serialLast6 = serialNormalized?.slice(-6);
  
  let pppoeSession = null;
  let pppSecret = null;
  let matchMethod = null;
  
  // Helper to check if a PPPoE username is already used by another ONU
  const isAlreadyMatched = (username) => usedMatches.has(username?.toLowerCase());
  
  // Extract meaningful parts from ONU name for matching
  // e.g., "ONU-0/4:39" -> "39", "customer_john" -> "john"
  const onuNameClean = onuName.replace(/[^A-Z0-9]/g, '').toLowerCase();
  const onuIndexStr = String(onuIndex).padStart(2, '0');
  
  // ======================================================================
  // METHOD 1: ONU Index-based matching (most reliable for structured networks)
  // Match PPP secret name or comment containing the ONU index AND PON port
  // e.g., ONU index 39 on PON 0/4 -> matches secret named "pon04_user39" or comment "PON 0/4 ONU 39"
  // ======================================================================
  if (!pppoeSession && onuIndex !== undefined && ponPort) {
    // Normalize PON port for matching (e.g., "0/4" -> "04", "0-4", etc.)
    const ponNormalized = ponPort.replace(/[/:]/g, '');
    
    for (const secret of pppSecretsData) {
      if (isAlreadyMatched(secret.pppoe_username)) continue;
      
      const secretName = secret.pppoe_username?.toLowerCase() || '';
      const comment = (secret.comment || '').toLowerCase();
      const searchStr = `${secretName}|${comment}`;
      
      // Look for patterns that include BOTH PON port AND ONU index (more specific = less false positives)
      const specificPatterns = [
        `${ponPort}:${onuIndex}`,           // 0/4:39
        `${ponPort}_${onuIndex}`,           // 0/4_39
        `${ponNormalized}_${onuIndex}`,     // 04_39
        `pon${ponNormalized}_${onuIndex}`,  // pon04_39
        `p${ponNormalized}o${onuIndex}`,    // p04o39
      ].map(p => p.toLowerCase());
      
      for (const pattern of specificPatterns) {
        if (searchStr.includes(pattern)) {
          pppSecret = secret;
          matchMethod = 'pon-onu-specific';
          pppoeSession = pppoeData.find(s => s.pppoe_username === secret.pppoe_username);
          break;
        }
      }
      if (pppSecret) break;
    }
  }
  
  // ======================================================================
  // METHOD 2: Serial/MAC in PPP Secret name, comment, or caller-id
  // ======================================================================
  if (!pppoeSession && (serialNormalized || macNormalized)) {
    for (const secret of pppSecretsData) {
      if (isAlreadyMatched(secret.pppoe_username)) continue;
      
      const secretName = secret.pppoe_username?.toUpperCase() || '';
      const comment = secret.comment?.toUpperCase() || '';
      const callerId = secret.caller_id?.replace(/[:-]/g, '').toUpperCase() || '';
      
      // Check if serial/MAC appears anywhere in secret
      const searchFields = `${secretName}|${comment}|${callerId}`;
      
      if (serialNormalized && (
        searchFields.includes(serialNormalized) ||
        searchFields.includes(serialLast6) ||
        callerId === serialNormalized
      )) {
        pppSecret = secret;
        matchMethod = 'serial-in-secret';
        pppoeSession = pppoeData.find(s => s.pppoe_username === secret.pppoe_username);
        break;
      }
      
      if (macNormalized && (
        searchFields.includes(macNormalized) ||
        searchFields.includes(macLast6) ||
        callerId === macNormalized
      )) {
        pppSecret = secret;
        matchMethod = 'mac-in-secret';
        pppoeSession = pppoeData.find(s => s.pppoe_username === secret.pppoe_username);
        break;
      }
    }
  }
  
  // ======================================================================
  // METHOD 3: ONU name contains PPPoE username or vice versa
  // e.g., ONU named "customer_john" matches PPPoE user "john"
  // ======================================================================
  if (!pppoeSession && onuName && onuName !== 'N/A' && !onuName.startsWith('ONU-')) {
    for (const secret of pppSecretsData) {
      if (isAlreadyMatched(secret.pppoe_username)) continue;
      
      const username = secret.pppoe_username?.toUpperCase() || '';
      const usernameClean = username.replace(/[^A-Z0-9]/g, '');
      
      if (usernameClean.length >= 3 && onuNameClean.length >= 3) {
        if (onuNameClean.includes(usernameClean) || usernameClean.includes(onuNameClean)) {
          pppSecret = secret;
          matchMethod = 'name-match';
          pppoeSession = pppoeData.find(s => s.pppoe_username === secret.pppoe_username);
          break;
        }
      }
    }
  }
  
  // ======================================================================
  // METHOD 4: PON port + ONU index pattern in username/comment (SKIP - merged into METHOD 1)
  // ======================================================================
  
  // ======================================================================
  // METHOD 5: Direct match on active PPPoE session's caller-id
  // ======================================================================
  if (!pppoeSession && macNormalized) {
    for (const session of pppoeData) {
      if (isAlreadyMatched(session.pppoe_username)) continue;
      
      const callerId = session.mac_address?.replace(/[:-]/g, '').toUpperCase() || '';
      
      if (callerId === macNormalized) {
        pppoeSession = session;
        matchMethod = 'session-caller-id-exact';
        break;
      }
    }
  }
  
  // ======================================================================
  // METHOD 6: Partial MAC match (last 6 chars) - DISABLED (too many false positives)
  // ======================================================================
  // Skipped: partial MAC matching causes incorrect associations
  
  // ======================================================================
  // METHOD 7: Fuzzy name matching - DISABLED (too many false positives)
  // ======================================================================
  // Skipped: fuzzy matching causes same username to match multiple ONUs
  
  // ======================================================================
  // METHOD 8: Sequential index matching - DISABLED (unreliable)
  // ======================================================================
  // Skipped: comment-based location matching is unreliable
  
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
  
  // Determine router name
  // Priority: DHCP hostname (by router MAC) > ARP comment > PPP secret comment
  // NEVER use PPPoE username as router name!
  // IMPORTANT: If current router_name looks like a PPPoE username, clear it
  let routerName = onu.router_name;
  
  // Check if existing router_name looks like a PPPoE username (should be cleared)
  const enrichedPppoeUsername = pppoeSession?.pppoe_username || pppSecret?.pppoe_username || onu.pppoe_username;
  if (routerName && enrichedPppoeUsername) {
    const routerNameLower = routerName.toLowerCase();
    const usernameLower = enrichedPppoeUsername.toLowerCase();
    // If router_name equals pppoe_username, it's wrong - clear it
    if (routerNameLower === usernameLower) {
      logger.debug(`Clearing bad router_name "${routerName}" (matches PPPoE username "${enrichedPppoeUsername}")`);
      routerName = null;
    }
  }
  const routerMacForDhcp = pppoeSession?.mac_address?.replace(/[:-]/g, '').toUpperCase() 
    || pppSecret?.caller_id?.replace(/[:-]/g, '').toUpperCase();
  
  // DHCP hostname lookup - use ROUTER MAC, not ONU MAC!
  // This is how we get TP-Link, Tenda, NATIS, etc. device names
  let routerDhcpLease = null;
  if (routerMacForDhcp) {
    for (const lease of dhcpData) {
      const leaseMac = lease.mac_address?.replace(/[:-]/g, '').toUpperCase();
      if (leaseMac && leaseMac === routerMacForDhcp) {
        routerDhcpLease = lease;
        break;
      }
    }
  }
  
  // DHCP hostname from router MAC is the most reliable source for device names
  if (!routerName && routerDhcpLease?.hostname && routerDhcpLease.hostname.length > 1) {
    routerName = routerDhcpLease.hostname;
    logger.debug(`Router name from DHCP (router MAC ${routerMacForDhcp}): ${routerName}`);
  }
  
  // Fallback: DHCP hostname from ONU MAC (less reliable but might work)
  if (!routerName && dhcpLease?.hostname && dhcpLease.hostname.length > 1) {
    routerName = dhcpLease.hostname;
  }
  
  // PPPoE session router_name - only use if it looks like a device name, not a username
  if (!routerName && pppoeSession?.router_name && pppoeSession.router_name.length > 0) {
    const sessionName = pppoeSession.router_name;
    // Skip if it looks like a username (same as pppoe_username) or metadata
    const looksLikeUsername = sessionName === pppoeSession.pppoe_username;
    const looksLikeMetadata = sessionName.includes('[ONU:') || sessionName.includes('SN=') || sessionName.includes('MAC=');
    if (!looksLikeUsername && !looksLikeMetadata) {
      routerName = sessionName;
    }
  }
  
  // ARP entry lookup by router MAC for comments
  let routerArpEntry = null;
  if (routerMacForDhcp) {
    for (const entry of arpData) {
      const arpMac = entry.mac_address?.replace(/[:-]/g, '').toUpperCase();
      if (arpMac && arpMac === routerMacForDhcp) {
        routerArpEntry = entry;
        break;
      }
    }
  }
  
  // ARP comment from router MAC - only use if it looks like a device name
  if (!routerName && routerArpEntry?.comment && routerArpEntry.comment.length > 2) {
    const arpComment = routerArpEntry.comment;
    const looksLikeMetadata = arpComment.includes('[ONU:') || arpComment.includes('SN=') || arpComment.includes('MAC=');
    if (!looksLikeMetadata) {
      routerName = arpComment;
    }
  }
  
  // Fallback ARP comment from ONU MAC
  if (!routerName && arpEntry?.comment && arpEntry.comment.length > 2) {
    const arpComment = arpEntry.comment;
    const looksLikeMetadata = arpComment.includes('[ONU:') || arpComment.includes('SN=') || arpComment.includes('MAC=');
    if (!looksLikeMetadata) {
      routerName = arpComment;
    }
  }
  
  // PPP secret comment - strip tags and only use if it looks like a real name
  if (!routerName && pppSecret?.comment && pppSecret.comment.length > 0) {
    const cleaned = pppSecret.comment.replace(/\s*\[ONU:[^\]]*\]\s*/gi, ' ').trim();
    // Only use if it's not the same as username and looks like a device name
    if (cleaned && cleaned.length >= 2 && cleaned !== pppSecret.pppoe_username) {
      routerName = cleaned;
    }
  }
  
  // DO NOT fall back to PPPoE username - it's not a router name!
  
  // Router MAC - from PPPoE session caller-id (this is the CPE/router MAC, NOT the ONU MAC)
  let routerMac = null;
  if (pppoeSession?.mac_address) {
    routerMac = normalizeMac(pppoeSession.mac_address);
  } else if (pppSecret?.caller_id) {
    routerMac = normalizeMac(pppSecret.caller_id);
  }
  
  if (enrichedPppoeUsername || routerName || routerMac) {
    logger.info(`MikroTik enriched ONU ${onu.mac_address || onu.serial_number}: PPPoE=${enrichedPppoeUsername || 'N/A'}, Router=${routerName || 'N/A'}, RouterMAC=${routerMac || 'N/A'}, Method=${matchMethod || 'none'}`);
  }
  
  return {
    ...onu,
    pppoe_username: enrichedPppoeUsername || onu.pppoe_username,
    router_name: routerName || onu.router_name,
    router_mac: routerMac || onu.router_mac,
    mac_address: macAddress || onu.mac_address,
    status: pppoeSession ? 'online' : onu.status,
    match_method: matchMethod || null,
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
  
  // First detect version to log it
  const connectionInfo = await detectRouterOSVersion(mikrotik);
  logger.info(`MikroTik RouterOS version: ${connectionInfo.version}, using ${connectionInfo.method} API on port ${connectionInfo.detectedPort || connectionInfo.port}`);
  
  // Fetch all data in parallel
  const [pppoe, arp, dhcp, secrets] = await Promise.all([
    fetchMikroTikPPPoE(mikrotik),
    fetchMikroTikARP(mikrotik),
    fetchMikroTikDHCPLeases(mikrotik),
    fetchMikroTikPPPSecrets(mikrotik),
  ]);
  
  logger.info(`MikroTik data: ${pppoe.length} PPPoE sessions, ${arp.length} ARP entries, ${dhcp.length} DHCP leases, ${secrets.length} PPP secrets`);
  
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
 * Update a PPP Secret in MikroTik (set comment and/or caller-id)
 * 
 * @param {object} mikrotik - MikroTik connection config
 * @param {string} secretId - The .id of the PPP secret to update (e.g., "*1A")
 * @param {object} updates - Fields to update: { comment?: string, callerId?: string }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updatePPPSecret(mikrotik, secretId, updates) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return { success: false, error: 'Missing MikroTik credentials' };
  }

  if (!secretId) {
    return { success: false, error: 'Missing secret ID' };
  }

  try {
    const connectionInfo = await detectRouterOSVersion(mikrotik);
    logger.info(`Updating PPP secret ${secretId} via ${connectionInfo.method} API`);

    if (connectionInfo.method === 'rest') {
      return await updatePPPSecretREST(mikrotik, secretId, updates, connectionInfo);
    } else {
      return await updatePPPSecretPlain(mikrotik, secretId, updates, connectionInfo);
    }
  } catch (error) {
    logger.error(`Failed to update PPP secret ${secretId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update PPP Secret via REST API (RouterOS 7+)
 */
async function updatePPPSecretREST(mikrotik, secretId, updates, connectionInfo) {
  const { ip, username, password } = mikrotik;
  const { port, protocol } = connectionInfo;

  const url = `${protocol}://${ip}:${port}/rest/ppp/secret/${encodeURIComponent(secretId)}`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const body = {};
  if (updates.comment !== undefined) body.comment = updates.comment;
  if (updates.callerId !== undefined) body['caller-id'] = updates.callerId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MIKROTIK_TIMEOUT);

  try {
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    };

    if (protocol === 'https') {
      const https = await import('https');
      options.agent = new https.Agent({ rejectUnauthorized: false });
    }

    logger.debug(`REST API PATCH: ${url} with body:`, body);
    const response = await fetch(url, options);
    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
    }

    logger.info(`PPP secret ${secretId} updated successfully via REST`);
    return { success: true };
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Update PPP Secret via Plain API (RouterOS 6.x)
 */
async function updatePPPSecretPlain(mikrotik, secretId, updates, connectionInfo) {
  const net = await import('net');
  const { ip, username, password } = mikrotik;
  const port = connectionInfo?.port || mikrotik.port || 8728;

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);
    let loginComplete = false;
    let commandSent = false;

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('MikroTik API timeout'));
    }, MIKROTIK_TIMEOUT);

    socket.connect(port, ip, () => {
      logger.debug(`Plain API connected to ${ip}:${port} for PPP secret update`);
      sendPlainCommand(socket, ['/login', `=name=${username}`, `=password=${password}`]);
    });

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length > 0) {
        const parsed = parsePlainSentence(buffer);
        if (!parsed) break;

        const { sentence, bytesRead } = parsed;
        buffer = buffer.slice(bytesRead);

        if (sentence.length === 0) continue;

        const reply = sentence[0];

        if (reply === '!done') {
          if (!loginComplete) {
            loginComplete = true;
            // Build the set command
            const cmd = ['/ppp/secret/set', `=.id=${secretId}`];
            if (updates.comment !== undefined) cmd.push(`=comment=${updates.comment}`);
            if (updates.callerId !== undefined) cmd.push(`=caller-id=${updates.callerId}`);
            logger.debug(`Plain API set command:`, cmd);
            sendPlainCommand(socket, cmd);
            commandSent = true;
          } else {
            clearTimeout(timeout);
            socket.end();
            logger.info(`PPP secret ${secretId} updated successfully via Plain API`);
            resolve({ success: true });
          }
        } else if (reply === '!trap') {
          const errorMsg = sentence.find(s => s.startsWith('=message='));
          clearTimeout(timeout);
          socket.destroy();
          reject(new Error(errorMsg ? errorMsg.substring(9) : 'Unknown MikroTik error'));
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
 * Fetch all PPP Secrets with their IDs for bulk operations
 */
export async function fetchPPPSecretsWithIds(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return [];
  }

  try {
    const secrets = await callMikroTikAPI(mikrotik, '/ppp/secret/print');

    logger.debug(`MikroTik PPP Secrets with IDs: Got ${secrets.length} secrets`);

    return secrets.map(secret => ({
      id: secret['.id'],
      pppoe_username: secret.name,
      profile: secret.profile,
      service: secret.service,
      caller_id: normalizeMac(secret['caller-id']),
      comment: secret.comment || '',
      remote_address: secret['remote-address'],
      local_address: secret['local-address'],
    }));
  } catch (error) {
    logger.error(`Failed to fetch MikroTik PPP secrets with IDs:`, error.message);
    return [];
  }
}

/**
 * Bulk tag PPP secrets with ONU identifiers for better matching
 * 
 * @param {object} mikrotik - MikroTik connection config
 * @param {array} onus - Array of ONU objects with mac_address, serial_number, pppoe_username, pon_port, onu_index
 * @param {object} options - { mode: 'append'|'overwrite'|'empty_only', target: 'comment'|'caller-id'|'both' }
 * @returns {Promise<{ success: boolean, results: array, tagged: number, failed: number, skipped: number }>}
 */
export async function bulkTagPPPSecrets(mikrotik, onus, options = {}) {
  const { mode = 'append', target = 'both' } = options;

  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return { success: false, error: 'Missing MikroTik credentials', results: [] };
  }

  logger.info(`Starting bulk PPP secret tagging for ${onus.length} ONUs (mode: ${mode}, target: ${target})`);

  // Fetch all PPP secrets with IDs
  const secrets = await fetchPPPSecretsWithIds(mikrotik);
  if (secrets.length === 0) {
    return { success: false, error: 'No PPP secrets found in MikroTik', results: [] };
  }

  logger.info(`Found ${secrets.length} PPP secrets to process`);

  const results = [];
  let tagged = 0;
  let failed = 0;
  let skipped = 0;

  for (const onu of onus) {
    const mac = onu.mac_address?.toUpperCase()?.replace(/[:-]/g, '') || '';
    const serial = onu.serial_number?.toUpperCase()?.replace(/[:-]/g, '') || '';
    const ponPort = onu.pon_port || '';
    const onuIndex = onu.onu_index;

    if (!mac && !serial) {
      results.push({ onu_id: onu.id, onu_name: onu.name, status: 'skipped', reason: 'No MAC or serial' });
      skipped++;
      continue;
    }

    // Try to find matching PPP secret using existing enrichment logic
    let matchedSecret = null;
    let matchMethod = null;

    // Try different matching strategies
    // 1. Direct PPPoE username match
    if (onu.pppoe_username) {
      matchedSecret = secrets.find(s => s.pppoe_username?.toLowerCase() === onu.pppoe_username?.toLowerCase());
      if (matchedSecret) matchMethod = 'pppoe-username';
    }

    // 2. ONU index pattern in secret name
    if (!matchedSecret && onuIndex !== undefined) {
      const patterns = [
        new RegExp(`(^|[^0-9])${onuIndex}($|[^0-9])`),
        new RegExp(`onu[_-]?${onuIndex}$`, 'i'),
        new RegExp(`^${onuIndex}[_-]`),
      ];
      matchedSecret = secrets.find(s => {
        const secretName = s.pppoe_username?.toLowerCase() || '';
        const comment = s.comment?.toLowerCase() || '';
        return patterns.some(p => p.test(secretName) || p.test(comment));
      });
      if (matchedSecret) matchMethod = 'onu-index';
    }

    // 3. Serial/MAC already in secret (just update if needed)
    if (!matchedSecret && (serial || mac)) {
      matchedSecret = secrets.find(s => {
        const searchFields = `${s.pppoe_username}|${s.comment}|${s.caller_id}`.toUpperCase();
        return (serial && searchFields.includes(serial.slice(-6))) || 
               (mac && searchFields.includes(mac.slice(-6)));
      });
      if (matchedSecret) matchMethod = 'partial-identifier';
    }

    // 4. PON port + ONU index pattern
    if (!matchedSecret && ponPort && onuIndex !== undefined) {
      const ponNormalized = ponPort.replace(/[/:]/g, '');
      const patterns = [
        `${ponPort}:${onuIndex}`,
        `${ponPort}_${onuIndex}`,
        `${ponNormalized}${onuIndex}`,
        `pon${ponNormalized}_${onuIndex}`,
      ].map(p => p.toLowerCase());

      matchedSecret = secrets.find(s => {
        const searchStr = `${s.pppoe_username}|${s.comment}`.toLowerCase();
        return patterns.some(p => searchStr.includes(p));
      });
      if (matchedSecret) matchMethod = 'pon-onu-pattern';
    }

    // 5. ONU name contains username or vice versa
    if (!matchedSecret && onu.name && onu.name.length > 3 && !onu.name.startsWith('ONU-')) {
      const onuNameClean = onu.name.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (onuNameClean.length >= 4) {
        matchedSecret = secrets.find(s => {
          const usernameClean = (s.pppoe_username || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
          return usernameClean.length >= 4 && (
            usernameClean.startsWith(onuNameClean.substring(0, 4)) ||
            onuNameClean.startsWith(usernameClean.substring(0, 4))
          );
        });
        if (matchedSecret) matchMethod = 'name-fuzzy';
      }
    }

    if (!matchedSecret) {
      results.push({ 
        onu_id: onu.id, 
        onu_name: onu.name, 
        status: 'no_match', 
        reason: 'Could not find matching PPP secret' 
      });
      skipped++;
      continue;
    }

    // Build the ONU tag
    const tag = `[ONU: ${serial ? `SN=${serial}` : ''}${serial && mac ? ', ' : ''}${mac ? `MAC=${mac}` : ''}]`;

    // Determine what to update
    const updates = {};
    let shouldUpdate = false;

    // Handle comment field
    if (target === 'comment' || target === 'both') {
      const existingComment = matchedSecret.comment || '';
      if (mode === 'append') {
        if (!existingComment.includes('[ONU:')) {
          updates.comment = existingComment ? `${existingComment} ${tag}` : tag;
          shouldUpdate = true;
        }
      } else if (mode === 'overwrite') {
        updates.comment = tag;
        shouldUpdate = true;
      } else if (mode === 'empty_only' && !existingComment) {
        updates.comment = tag;
        shouldUpdate = true;
      }
    }

    // Handle caller-id field (only if empty or in 'both' mode)
    if (target === 'caller-id' || target === 'both') {
      const existingCallerId = matchedSecret.caller_id || '';
      // For caller-id, use raw MAC format (XX:XX:XX:XX:XX:XX)
      const macFormatted = mac ? mac.match(/.{2}/g)?.join(':') : null;

      if (target === 'both') {
        // Only fill caller-id if empty (to not break existing auth)
        if (!existingCallerId && macFormatted) {
          updates.callerId = macFormatted;
          shouldUpdate = true;
        }
      } else if (target === 'caller-id') {
        if (mode === 'overwrite' && macFormatted) {
          updates.callerId = macFormatted;
          shouldUpdate = true;
        } else if (mode === 'empty_only' && !existingCallerId && macFormatted) {
          updates.callerId = macFormatted;
          shouldUpdate = true;
        } else if (mode === 'append' && !existingCallerId && macFormatted) {
          updates.callerId = macFormatted;
          shouldUpdate = true;
        }
      }
    }

    if (!shouldUpdate) {
      results.push({ 
        onu_id: onu.id, 
        onu_name: onu.name, 
        pppoe: matchedSecret.pppoe_username,
        status: 'skipped', 
        reason: 'Already tagged or no update needed',
        match_method: matchMethod
      });
      skipped++;
      continue;
    }

    // Apply the update
    try {
      const updateResult = await updatePPPSecret(mikrotik, matchedSecret.id, updates);

      if (updateResult.success) {
        results.push({ 
          onu_id: onu.id, 
          onu_name: onu.name, 
          pppoe: matchedSecret.pppoe_username,
          secret_id: matchedSecret.id,
          status: 'tagged', 
          updates,
          match_method: matchMethod
        });
        tagged++;
        logger.info(`Tagged PPP secret ${matchedSecret.pppoe_username} for ONU ${onu.name} (${matchMethod})`);
      } else {
        results.push({ 
          onu_id: onu.id, 
          onu_name: onu.name, 
          pppoe: matchedSecret.pppoe_username,
          status: 'failed', 
          error: updateResult.error,
          match_method: matchMethod
        });
        failed++;
      }
    } catch (error) {
      results.push({ 
        onu_id: onu.id, 
        onu_name: onu.name, 
        status: 'failed', 
        error: error.message 
      });
      failed++;
    }
  }

  logger.info(`Bulk tagging complete: ${tagged} tagged, ${failed} failed, ${skipped} skipped`);

  return {
    success: true,
    results,
    tagged,
    failed,
    skipped,
    total: onus.length,
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
    // Clear cache to force fresh detection
    clearMikroTikCache(mikrotik.ip, mikrotik.port);
    
    const connectionInfo = await detectRouterOSVersion(mikrotik);
    
    return { 
      success: true, 
      duration: Date.now() - startTime,
      method: `${connectionInfo.method === 'rest' ? 'REST' : 'Plain'} API`,
      version: connectionInfo.version,
      configuredPort: connectionInfo.configuredPort || mikrotik.port,
      detectedPort: connectionInfo.detectedPort || connectionInfo.port,
      protocol: connectionInfo.protocol || 'tcp',
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      duration: Date.now() - startTime,
      configuredPort: mikrotik.port,
    };
  }
}

/**
 * Clear connection cache for a device (useful when credentials change)
 */
export function clearMikroTikCache(ip, port) {
  const cacheKey = `${ip}:${port}`;
  deviceConnectionCache.delete(cacheKey);
  logger.info(`Cleared MikroTik connection cache for ${cacheKey}`);
}

/**
 * Fetch system health metrics (CPU, RAM, uptime) from MikroTik
 * Returns: { cpu: number, memory: number, uptime: string, freeMemory: number, totalMemory: number }
 */
export async function fetchMikroTikHealth(mikrotik) {
  if (!mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    logger.debug('MikroTik not configured, skipping health fetch...');
    return null;
  }

  try {
    const resource = await callMikroTikAPI(mikrotik, '/system/resource/print');
    
    if (!resource || resource.length === 0) {
      return null;
    }
    
    const data = Array.isArray(resource) ? resource[0] : resource;
    
    // Parse memory values (they come as strings like "1073741824")
    const freeMemory = parseInt(data['free-memory'] || data['free-hdd-space'] || 0);
    const totalMemory = parseInt(data['total-memory'] || data['total-hdd-space'] || 1);
    const memoryPercent = totalMemory > 0 ? Math.round(((totalMemory - freeMemory) / totalMemory) * 100) : 0;
    
    // CPU load
    const cpuLoad = parseInt(data['cpu-load'] || 0);
    
    // Uptime (comes as string like "1w2d3h4m5s")
    const uptime = data.uptime || 'unknown';
    
    // Parse uptime to seconds
    let uptimeSeconds = 0;
    const uptimeStr = uptime.toString();
    const weekMatch = uptimeStr.match(/(\d+)w/);
    const dayMatch = uptimeStr.match(/(\d+)d/);
    const hourMatch = uptimeStr.match(/(\d+)h/);
    const minMatch = uptimeStr.match(/(\d+)m/);
    const secMatch = uptimeStr.match(/(\d+)s/);
    
    if (weekMatch) uptimeSeconds += parseInt(weekMatch[1]) * 7 * 24 * 3600;
    if (dayMatch) uptimeSeconds += parseInt(dayMatch[1]) * 24 * 3600;
    if (hourMatch) uptimeSeconds += parseInt(hourMatch[1]) * 3600;
    if (minMatch) uptimeSeconds += parseInt(minMatch[1]) * 60;
    if (secMatch) uptimeSeconds += parseInt(secMatch[1]);
    
    const result = {
      cpu: cpuLoad,
      memory: memoryPercent,
      uptime: uptime,
      uptimeSeconds: uptimeSeconds,
      freeMemory: freeMemory,
      totalMemory: totalMemory,
      version: data.version,
      boardName: data['board-name'],
      platform: data.platform,
    };
    
    logger.debug(`MikroTik health: CPU=${cpuLoad}%, Memory=${memoryPercent}%, Uptime=${uptime}`);
    return result;
  } catch (error) {
    logger.error(`Failed to fetch MikroTik health from ${mikrotik.ip}:${mikrotik.port}:`, error.message);
    return null;
  }
}
