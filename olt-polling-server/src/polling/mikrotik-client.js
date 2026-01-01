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
      // caller-id typically contains the MAC address of the connecting device (ONU)
      const callerId = session['caller-id'] || '';
      const macAddress = normalizeMac(callerId);
      
      const mapped = {
        pppoe_username: session.name || session.user,
        mac_address: macAddress,  // This is the ONU MAC from caller-id
        ip_address: session.address,
        uptime: session.uptime,
        service: session.service,
        router_name: session.comment || session.name,
        raw_caller_id: callerId,
      };
      
      logger.debug(`PPPoE session: ${mapped.pppoe_username}, caller-id: ${callerId} -> MAC: ${macAddress}`);
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
    
    return secrets.map(secret => ({
      pppoe_username: secret.name,
      pppoe_password: secret.password,
      profile: secret.profile,
      service: secret.service,
      caller_id: normalizeMac(secret['caller-id']),
      comment: secret.comment,
      router_name: secret.comment || secret.name,
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
 * Enriches ONU with router name, PPPoE username, etc.
 */
export function enrichONUWithMikroTikData(onu, pppoeData, arpData, dhcpData, pppSecretsData = []) {
  const macAddress = onu.mac_address?.toUpperCase();
  const serialNumber = onu.serial_number?.toUpperCase();
  const onuIndex = onu.onu_index;
  const ponPort = onu.pon_port;
  
  const macNormalized = macAddress?.replace(/[:-]/g, '').toUpperCase();
  
  logger.debug(`Matching ONU: MAC=${macAddress || 'N/A'}, Serial=${serialNumber || 'N/A'}, Index=${onuIndex}, PON=${ponPort}`);
  logger.debug(`Available PPPoE sessions: ${pppoeData.length}, Secrets: ${pppSecretsData.length}`);
  
  let pppoeSession = null;
  let pppSecret = null;
  let matchMethod = null;
  
  // METHOD 1: Direct MAC match on caller-id field
  if (macNormalized && macNormalized.length >= 6) {
    for (const session of pppoeData) {
      const callerId = session.mac_address;
      const callerIdNorm = callerId?.replace(/[:-]/g, '').toUpperCase();
      
      if (callerIdNorm && callerIdNorm === macNormalized) {
        pppoeSession = session;
        matchMethod = 'exact-mac';
        logger.debug(`PPPoE match (exact MAC): ${session.pppoe_username} for MAC ${macAddress}`);
        break;
      }
    }
    
    // Method 1b: Partial MAC match
    if (!pppoeSession) {
      for (const session of pppoeData) {
        const callerId = session.mac_address;
        const callerIdNorm = callerId?.replace(/[:-]/g, '').toUpperCase();
        
        if (callerIdNorm && (
          macNormalized.includes(callerIdNorm) || 
          callerIdNorm.includes(macNormalized) ||
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
  
  // METHOD 2: Serial number in PPP secrets comment
  if (!pppoeSession && serialNumber) {
    for (const secret of pppSecretsData) {
      const comment = secret.comment?.toUpperCase() || '';
      const username = secret.pppoe_username?.toUpperCase() || '';
      
      if (comment.includes(serialNumber) || serialNumber.includes(username.slice(-8))) {
        pppSecret = secret;
        matchMethod = 'serial-in-comment';
        logger.debug(`PPP Secret match (serial in comment): ${secret.pppoe_username} for serial ${serialNumber}`);
        pppoeSession = pppoeData.find(s => s.pppoe_username === secret.pppoe_username);
        break;
      }
    }
  }
  
  // METHOD 3: ONU index/PON port pattern in username
  if (!pppoeSession && ponPort && onuIndex !== undefined) {
    const patterns = [
      `${ponPort}-${onuIndex}`,
      `${ponPort}_${onuIndex}`,
      `pon${ponPort}-${onuIndex}`,
      `pon${ponPort}_${onuIndex}`,
      `p${ponPort}o${onuIndex}`,
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
  
  // METHOD 4: Check PPP secrets by caller-id
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
  if (!routerName && (pppoeSession?.pppoe_username || pppSecret?.pppoe_username)) {
    routerName = pppoeSession?.pppoe_username || pppSecret?.pppoe_username;
  }
  
  const enrichedPppoeUsername = pppoeSession?.pppoe_username || pppSecret?.pppoe_username || onu.pppoe_username;
  
  if (enrichedPppoeUsername || routerName) {
    logger.info(`MikroTik enriched ONU ${onu.mac_address || onu.serial_number}: PPPoE=${enrichedPppoeUsername || 'N/A'}, Router=${routerName || 'N/A'}, Method=${matchMethod || 'none'}`);
  }
  
  return {
    ...onu,
    pppoe_username: enrichedPppoeUsername || onu.pppoe_username,
    router_name: routerName || onu.router_name,
    mac_address: macAddress || onu.mac_address,
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
