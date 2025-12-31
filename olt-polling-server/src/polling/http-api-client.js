import { logger } from '../utils/logger.js';

/**
 * OLT HTTP API Client
 * For OLTs that use web API interfaces
 * 
 * Supported Brands:
 * - VSOL: Web UI on port 8080/8085, CGI-based API
 * - DBC: REST API
 * - CDATA: REST API with token auth
 * - ECOM: CGI-based API
 * - BDCOM: REST API
 */

const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '30000');

/**
 * Execute API calls for OLTs that support HTTP/HTTPS API
 */
export async function executeAPICommands(olt) {
  const brand = olt.brand?.toUpperCase();
  
  logger.info(`Executing HTTP API commands for ${olt.name} (${brand}) on port ${olt.port}`);
  
  try {
    switch (brand) {
      case 'VSOL':
        return await fetchVSOLAPI(olt);
      case 'DBC':
        return await fetchDBCAPI(olt);
      case 'CDATA':
      case 'C-DATA':
        return await fetchCDATAAPI(olt);
      case 'ECOM':
        return await fetchECOMAPI(olt);
      case 'BDCOM':
        return await fetchBDCOMAPI(olt);
      default:
        return await fetchGenericOLTAPI(olt);
    }
  } catch (error) {
    logger.error(`API request failed for ${olt.name}:`, error.message);
    throw error;
  }
}

/**
 * VSOL OLT HTTP API
 * VSOL uses web interfaces with CGI scripts
 * Common ports: 80, 8080, 8085
 * 
 * Important: VSOL web UI is primarily for display, 
 * the actual ONU data comes from CLI commands via Telnet/SSH
 */
async function fetchVSOLAPI(olt) {
  // Try both HTTP and HTTPS
  const protocols = olt.port === 443 ? ['https'] : ['http', 'https'];
  
  for (const protocol of protocols) {
    const baseUrl = `${protocol}://${olt.ip_address}:${olt.port}`;
    
    logger.info(`Attempting VSOL API connection to ${baseUrl}`);
    
    try {
      // VSOL Web UI Authentication Methods
      const authMethods = [
        // Method 1: CGI form login
        {
          url: '/cgi-bin/login.cgi',
          method: 'POST',
          contentType: 'application/x-www-form-urlencoded',
          body: `username=${encodeURIComponent(olt.username)}&password=${encodeURIComponent(olt.password_encrypted)}`
        },
        // Method 2: GoForm login (common in Chinese OLTs)
        {
          url: '/goform/login',
          method: 'POST',
          contentType: 'application/x-www-form-urlencoded',
          body: `username=${encodeURIComponent(olt.username)}&password=${encodeURIComponent(olt.password_encrypted)}`
        },
        // Method 3: API login
        {
          url: '/api/login',
          method: 'POST',
          contentType: 'application/json',
          body: JSON.stringify({ username: olt.username, password: olt.password_encrypted })
        },
        // Method 4: Direct CGI with Basic Auth
        {
          url: '/cgi-bin/onu_status.cgi',
          method: 'GET',
          useBasicAuth: true
        }
      ];
      
      let sessionCookie = '';
      let authToken = '';
      let loginSuccess = false;
      
      // Try authentication methods
      for (const auth of authMethods) {
        if (auth.useBasicAuth) continue; // Skip auth for direct access methods
        
        try {
          const headers = {
            'Content-Type': auth.contentType,
            'User-Agent': 'OLTCare-Poller/1.0'
          };
          
          const response = await fetchWithTimeout(`${baseUrl}${auth.url}`, {
            method: auth.method,
            headers,
            body: auth.body,
          });
          
          if (response.ok || response.status === 302) {
            // Extract cookies
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
              sessionCookie = setCookie.split(';')[0];
            }
            
            // Try to get token from response
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('json')) {
              const data = await response.json();
              authToken = data.token || data.access_token || data.sessionId || '';
            }
            
            loginSuccess = true;
            logger.info(`VSOL login successful via ${auth.url}`);
            break;
          }
        } catch (err) {
          logger.debug(`VSOL auth ${auth.url} failed: ${err.message}`);
        }
      }
      
      // Build headers for data requests
      const dataHeaders = {
        'User-Agent': 'OLTCare-Poller/1.0',
        'Accept': 'application/json, text/plain, */*'
      };
      
      if (sessionCookie) {
        dataHeaders['Cookie'] = sessionCookie;
      }
      if (authToken) {
        dataHeaders['Authorization'] = `Bearer ${authToken}`;
      }
      
      // If no auth worked, try Basic Auth
      if (!loginSuccess) {
        const basicAuth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
        dataHeaders['Authorization'] = `Basic ${basicAuth}`;
      }
      
      // Data endpoints to try
      const dataEndpoints = [
        '/cgi-bin/onu_status.cgi',
        '/cgi-bin/gpon_onu.cgi',
        '/cgi-bin/epon_onu.cgi',
        '/api/onu/status',
        '/api/onu/list',
        '/api/gpon/onu',
        '/api/epon/onu',
        '/goform/getOnuList',
        '/goform/getOnuStatus',
        '/onu_status.cgi',
        '/cgi-bin/onu_optical.cgi',
        '/cgi-bin/pon_status.cgi'
      ];
      
      for (const endpoint of dataEndpoints) {
        try {
          const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: dataHeaders,
          });
          
          if (response.ok) {
            const text = await response.text();
            
            // Skip HTML login pages
            if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('login')) {
              logger.debug(`Endpoint ${endpoint} returned login page, skipping`);
              continue;
            }
            
            // Try to parse as JSON
            let parsed;
            try {
              parsed = JSON.parse(text);
            } catch {
              // If not JSON, return as raw text
              parsed = { raw: text };
            }
            
            logger.info(`VSOL data fetch successful via ${endpoint}`);
            return {
              raw: text,
              parsed: { onuStatus: parsed },
              source: 'http_api'
            };
          }
        } catch (err) {
          logger.debug(`VSOL endpoint ${endpoint} failed: ${err.message}`);
        }
      }
      
      throw new Error(`VSOL HTTP API: All endpoints failed on ${baseUrl}`);
      
    } catch (error) {
      if (protocol === protocols[protocols.length - 1]) {
        throw error;
      }
      logger.debug(`VSOL ${protocol} failed, trying next protocol...`);
    }
  }
  
  throw new Error('VSOL: All HTTP API attempts failed. Use Telnet/SSH instead.');
}

/**
 * DBC OLT HTTP API
 */
async function fetchDBCAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'OLTCare-Poller/1.0'
  };
  
  // Try multiple API endpoints
  const endpoints = [
    { url: '/api/onu/list', name: 'onuList' },
    { url: '/api/onu/status', name: 'onuStatus' },
    { url: '/api/onu/optical', name: 'opticalInfo' },
    { url: '/api/gpon/onu', name: 'gponOnu' },
    { url: '/api/epon/onu', name: 'eponOnu' },
    { url: '/cgi-bin/onu_list.cgi', name: 'cgiOnuList' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${endpoint.url}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        results[endpoint.name] = data;
        logger.info(`DBC endpoint ${endpoint.url} successful`);
      }
    } catch (err) {
      logger.debug(`DBC endpoint ${endpoint.url} failed: ${err.message}`);
    }
  }
  
  if (Object.keys(results).length === 0) {
    throw new Error('DBC: No API endpoints returned valid data');
  }
  
  return {
    raw: JSON.stringify(results),
    parsed: results,
    source: 'http_api'
  };
}

/**
 * CDATA OLT HTTP API
 */
async function fetchCDATAAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  
  // Try token-based auth first
  let token = '';
  
  const loginEndpoints = [
    '/api/login',
    '/api/auth',
    '/login'
  ];
  
  for (const endpoint of loginEndpoints) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'OLTCare-Poller/1.0'
        },
        body: JSON.stringify({
          username: olt.username,
          password: olt.password_encrypted,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        token = data.token || data.access_token || data.sessionId || '';
        if (token) {
          logger.info(`CDATA login successful via ${endpoint}`);
          break;
        }
      }
    } catch (err) {
      logger.debug(`CDATA login ${endpoint} failed: ${err.message}`);
    }
  }
  
  // Build auth headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'OLTCare-Poller/1.0'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }
  
  // Data endpoints
  const dataEndpoints = [
    '/api/onu/status',
    '/api/onu/list',
    '/api/onu/optical-power',
    '/cgi-bin/onu_status.cgi'
  ];
  
  const results = {};
  
  for (const endpoint of dataEndpoints) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        results[endpoint] = data;
      }
    } catch (err) {
      logger.debug(`CDATA endpoint ${endpoint} failed: ${err.message}`);
    }
  }
  
  if (Object.keys(results).length === 0) {
    throw new Error('CDATA: No API endpoints returned valid data');
  }
  
  return {
    raw: JSON.stringify(results),
    parsed: results,
    source: 'http_api'
  };
}

/**
 * ECOM OLT HTTP API
 */
async function fetchECOMAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'OLTCare-Poller/1.0'
  };
  
  const endpoints = [
    '/cgi-bin/gpon_onu.cgi',
    '/cgi-bin/epon_onu.cgi',
    '/cgi-bin/onu_status.cgi',
    '/api/onu/status',
    '/api/onu/list'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const text = await response.text();
        
        // Skip HTML pages
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          continue;
        }
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
        
        return {
          raw: text,
          parsed,
          source: 'http_api'
        };
      }
    } catch (err) {
      logger.debug(`ECOM endpoint ${endpoint} failed: ${err.message}`);
    }
  }
  
  throw new Error('ECOM: No API endpoints returned valid data');
}

/**
 * BDCOM OLT HTTP API
 */
async function fetchBDCOMAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json',
    'User-Agent': 'OLTCare-Poller/1.0'
  };
  
  const endpoints = [
    '/api/epon/onu-info',
    '/api/epon/onu-status',
    '/api/onu/list',
    '/cgi-bin/epon_onu.cgi'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
      });
      
      if (response.ok) {
        const text = await response.text();
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
        
        return {
          raw: text,
          parsed,
          source: 'http_api'
        };
      }
    } catch (err) {
      logger.debug(`BDCOM endpoint ${endpoint} failed: ${err.message}`);
    }
  }
  
  throw new Error('BDCOM: No API endpoints returned valid data');
}

/**
 * Generic OLT HTTP API (fallback)
 */
async function fetchGenericOLTAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
  
  const endpoints = [
    '/api/onu/status',
    '/api/onu/list',
    '/cgi-bin/onu_status.cgi',
    '/onu/list',
    '/gpon/onu',
    '/epon/onu'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'OLTCare-Poller/1.0'
        },
      });
      
      if (response.ok) {
        const text = await response.text();
        
        // Skip HTML pages
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          continue;
        }
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
        
        return {
          raw: text,
          parsed,
          source: 'http_api'
        };
      }
    } catch (err) {
      logger.debug(`Generic endpoint ${endpoint} failed: ${err.message}`);
    }
  }
  
  throw new Error('No compatible API endpoint found');
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects automatically
    });
    
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      throw new Error(`API request timeout (${API_TIMEOUT}ms)`);
    }
    
    throw error;
  }
}

/**
 * Parse API response to ONU list format
 */
export function parseAPIResponse(brand, response) {
  const onus = [];
  const data = response.parsed || response;
  
  logger.debug(`Parsing ${brand} API response: ${JSON.stringify(data).substring(0, 500)}`);
  
  try {
    // Handle different response formats
    let onuList = [];
    
    // Find the ONU array in various possible locations
    if (Array.isArray(data)) {
      onuList = data;
    } else if (data.onuList) {
      onuList = Array.isArray(data.onuList) ? data.onuList : [];
    } else if (data.onuStatus) {
      onuList = Array.isArray(data.onuStatus) ? data.onuStatus : [data.onuStatus];
    } else if (data.data) {
      onuList = Array.isArray(data.data) ? data.data : [data.data];
    } else if (data.onus) {
      onuList = Array.isArray(data.onus) ? data.onus : [];
    } else if (data.result) {
      onuList = Array.isArray(data.result) ? data.result : [];
    } else if (data.rows) {
      onuList = Array.isArray(data.rows) ? data.rows : [];
    } else {
      // Try to find any array in the response
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          onuList = data[key];
          logger.debug(`Found ONU array in field: ${key}`);
          break;
        }
      }
    }
    
    logger.info(`Found ${onuList.length} ONUs in API response`);
    
    for (const item of onuList) {
      if (!item || typeof item !== 'object') continue;
      
      const onu = {
        serial_number: item.serial || item.serialNumber || item.sn || item.SN || 
                       item.serial_number || item.serialNo || item.mac || item.MAC || '',
        pon_port: item.port || item.ponPort || item.pon_port || item.pon || 
                  item.ponId || item.pon_id || 'default',
        onu_index: parseInt(item.index || item.onuId || item.onu_id || item.id || 
                           item.onuIndex || item.onu_index || 1),
        status: parseOnuStatus(item.status || item.state || item.Status || item.State),
        rx_power: parseFloat(item.rxPower || item.rx_power || item.rxpower || 
                            item.RxPower || item.rxdbm) || null,
        tx_power: parseFloat(item.txPower || item.tx_power || item.txpower || 
                            item.TxPower || item.txdbm) || null,
        mac_address: item.mac || item.macAddress || item.mac_address || 
                     item.MAC || item.macAddr || null,
        name: item.name || item.description || item.desc || item.Name || 
              item.onuName || item.onu_name || null,
      };
      
      // Generate name if missing
      if (!onu.name) {
        onu.name = onu.serial_number ? 
          `ONU-${onu.serial_number.substring(0, 8)}` : 
          `ONU-${onu.pon_port}:${onu.onu_index}`;
      }
      
      onus.push(onu);
    }
  } catch (error) {
    logger.error(`Failed to parse ${brand} API response:`, error.message);
  }
  
  return onus;
}

function parseOnuStatus(status) {
  if (!status) return 'unknown';
  
  const s = String(status).toLowerCase().trim();
  
  // Online statuses
  if (s.includes('online') || s.includes('up') || s === '1' || 
      s === 'active' || s.includes('working') || s === 'registered') {
    return 'online';
  }
  
  // Offline statuses
  if (s.includes('offline') || s.includes('down') || s === '0' || 
      s === 'inactive' || s.includes('deregistered') || s.includes('los')) {
    return 'offline';
  }
  
  // Warning statuses
  if (s.includes('warning') || s.includes('dying') || s.includes('gasp') ||
      s.includes('low') || s.includes('critical')) {
    return 'warning';
  }
  
  return 'unknown';
}
