import { logger } from '../utils/logger.js';

/**
 * OLT HTTP API Client
 * For OLTs that use web API on port 443 instead of SSH/Telnet
 */

const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '30000');

/**
 * Execute API calls for OLTs that support HTTP/HTTPS API (port 443)
 */
export async function executeAPICommands(olt) {
  const brand = olt.brand?.toUpperCase();
  
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
 */
async function fetchVSOLAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  
  // Login first
  const loginResponse = await apiRequest(`${baseUrl}/cgi-bin/login.cgi`, {
    method: 'POST',
    body: new URLSearchParams({
      username: olt.username,
      password: olt.password_encrypted,
    }),
    credentials: olt,
  });
  
  // Get session cookie from login
  const sessionCookie = loginResponse.headers?.get('set-cookie') || '';
  
  // Fetch ONU status
  const onuStatusResponse = await apiRequest(`${baseUrl}/cgi-bin/onu_status.cgi`, {
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
    },
  });
  
  // Fetch optical info
  const opticalResponse = await apiRequest(`${baseUrl}/cgi-bin/onu_optical.cgi`, {
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
    },
  });
  
  return {
    raw: JSON.stringify({ status: onuStatusResponse, optical: opticalResponse }),
    parsed: {
      onuStatus: onuStatusResponse,
      opticalInfo: opticalResponse,
    },
  };
}

/**
 * DBC OLT HTTP API
 */
async function fetchDBCAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  
  // DBC uses basic auth
  const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
  
  // Get ONU list
  const onuList = await apiRequest(`${baseUrl}/api/onu/list`, {
    method: 'GET',
    headers,
  });
  
  // Get optical info
  const opticalInfo = await apiRequest(`${baseUrl}/api/onu/optical`, {
    method: 'GET',
    headers,
  });
  
  return {
    raw: JSON.stringify({ onuList, opticalInfo }),
    parsed: {
      onuList,
      opticalInfo,
    },
  };
}

/**
 * CDATA OLT HTTP API
 */
async function fetchCDATAAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  
  // CDATA login
  const loginData = await apiRequest(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: olt.username,
      password: olt.password_encrypted,
    }),
  });
  
  const token = loginData.token || loginData.access_token;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Get ONU status
  const onuStatus = await apiRequest(`${baseUrl}/api/onu/status`, {
    method: 'GET',
    headers,
  });
  
  // Get optical power
  const opticalPower = await apiRequest(`${baseUrl}/api/onu/optical-power`, {
    method: 'GET',
    headers,
  });
  
  return {
    raw: JSON.stringify({ onuStatus, opticalPower }),
    parsed: {
      onuStatus,
      opticalPower,
    },
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
  };
  
  const onuData = await apiRequest(`${baseUrl}/cgi-bin/gpon_onu.cgi`, {
    method: 'GET',
    headers,
  });
  
  return {
    raw: JSON.stringify(onuData),
    parsed: onuData,
  };
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
  };
  
  const onuInfo = await apiRequest(`${baseUrl}/api/epon/onu-info`, {
    method: 'GET',
    headers,
  });
  
  return {
    raw: JSON.stringify(onuInfo),
    parsed: onuInfo,
  };
}

/**
 * Generic OLT HTTP API (fallback)
 */
async function fetchGenericOLTAPI(olt) {
  const baseUrl = `http://${olt.ip_address}:${olt.port}`;
  
  const auth = Buffer.from(`${olt.username}:${olt.password_encrypted}`).toString('base64');
  
  // Try common API endpoints
  const endpoints = [
    '/api/onu/status',
    '/cgi-bin/onu_status.cgi',
    '/onu/list',
    '/gpon/onu',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await apiRequest(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      
      if (response) {
        return {
          raw: JSON.stringify(response),
          parsed: response,
        };
      }
    } catch (err) {
      logger.debug(`Endpoint ${endpoint} failed: ${err.message}`);
    }
  }
  
  throw new Error('No compatible API endpoint found');
}

/**
 * Make HTTP API request with timeout
 */
async function apiRequest(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      throw new Error('API request timeout');
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
  
  try {
    // Handle different response formats
    let onuList = [];
    
    if (Array.isArray(data)) {
      onuList = data;
    } else if (data.onuList) {
      onuList = data.onuList;
    } else if (data.onuStatus) {
      onuList = Array.isArray(data.onuStatus) ? data.onuStatus : [data.onuStatus];
    } else if (data.data) {
      onuList = Array.isArray(data.data) ? data.data : [data.data];
    }
    
    for (const item of onuList) {
      onus.push({
        serial_number: item.serial || item.serialNumber || item.sn || item.mac || '',
        pon_port: item.port || item.ponPort || item.pon || '1/1',
        onu_index: parseInt(item.index || item.onuId || item.id || 1),
        status: parseOnuStatus(item.status || item.state),
        rx_power: parseFloat(item.rxPower || item.rx_power || item.rxpower) || null,
        tx_power: parseFloat(item.txPower || item.tx_power || item.txpower) || null,
        mac_address: item.mac || item.macAddress || item.mac_address || null,
        name: item.name || item.description || null,
      });
    }
  } catch (error) {
    logger.error(`Failed to parse ${brand} API response:`, error.message);
  }
  
  return onus;
}

function parseOnuStatus(status) {
  if (!status) return 'unknown';
  
  const s = String(status).toLowerCase();
  
  if (s.includes('online') || s.includes('up') || s === '1' || s === 'active') {
    return 'online';
  }
  if (s.includes('offline') || s.includes('down') || s === '0' || s === 'inactive') {
    return 'offline';
  }
  if (s.includes('warning') || s.includes('los') || s.includes('dying')) {
    return 'warning';
  }
  
  return 'unknown';
}
