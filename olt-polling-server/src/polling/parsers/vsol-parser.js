import { logger } from '../../utils/logger.js';

/**
 * Parse VSOL OLT CLI output to extract ONU information
 * Supports VSOL EPON/GPON OLT series with multiple output formats
 * 
 * Common VSOL CLI output formats:
 * - show onu status all
 * - show onu optical-info all
 * - show onu info all
 * - show gpon onu state
 */
export function parseVSOLOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  let inOnuSection = false;
  
  logger.debug(`VSOL parser processing ${lines.length} lines of output`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines and common separators
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.startsWith('***') ||
        trimmedLine.length < 3) {
      continue;
    }
    
    // Detect PON port context from headers
    // Format: "PON port 1/1" or "EPON port 0/1" or "gpon-onu 1/1"
    let ponMatch = trimmedLine.match(/(?:PON|EPON|GPON|pon|epon|gpon)[\s-]*(?:port|onu)?\s*[:=]?\s*(\d+\/\d+(?:\/\d+)?)/i);
    if (ponMatch) {
      currentPonPort = ponMatch[1];
      inOnuSection = true;
      continue;
    }
    
    // Pattern 1: Table format with headers (very common in VSOL)
    // Index  MAC/SN           Status    RxPower   TxPower
    // 1      VSOL12345678     online    -21.5     2.1
    const tableMatch = trimmedLine.match(/^(\d+)\s+([A-Za-z0-9]{8,20})\s+(online|offline|dying[-_]?gasp|los|unknown)\s*([-\d.]+)?\s*([-\d.]+)?/i);
    if (tableMatch) {
      const onuIndex = parseInt(tableMatch[1]);
      const serialOrMac = tableMatch[2].toUpperCase();
      const status = parseStatus(tableMatch[3]);
      const rxPower = tableMatch[4] ? parseFloat(tableMatch[4]) : null;
      const txPower = tableMatch[5] ? parseFloat(tableMatch[5]) : null;
      const ponPort = currentPonPort || 'default';
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialOrMac,
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: isMacAddress(serialOrMac) ? formatMac(serialOrMac) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 2: PON x/x ONU x format (explicit PON port in line)
    // PON 1/1  ONU 1  VSOL1234567890  online  -20.5  2.1
    let match = trimmedLine.match(/PON\s+(\d+\/\d+)\s+ONU\s+(\d+)\s+(\S+)\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/i);
    if (match) {
      const ponPort = match[1];
      const onuIndex = parseInt(match[2]);
      const serialNumber = match[3].toUpperCase();
      const status = parseStatus(match[4]);
      const rxPower = match[5] ? parseFloat(match[5]) : null;
      const txPower = match[6] ? parseFloat(match[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: isMacAddress(serialNumber) ? formatMac(serialNumber) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 3: x/x/x format (slot/pon/onu)
    // 0/1/1   1   VSOL1234567890   online   -20.5   2.1
    match = trimmedLine.match(/(\d+\/\d+\/\d+)\s+(\d+)\s+(\S+)\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/);
    if (match) {
      const ponPort = match[1];
      const onuIndex = parseInt(match[2]);
      const serialNumber = match[3].toUpperCase();
      const status = parseStatus(match[4]);
      const rxPower = match[5] ? parseFloat(match[5]) : null;
      const txPower = match[6] ? parseFloat(match[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: isMacAddress(serialNumber) ? formatMac(serialNumber) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 4: pon-onu format
    // pon-onu 1/1:1  online  VSOL1234567890
    match = trimmedLine.match(/pon-onu\s+(\d+\/\d+):(\d+)\s+(\w+)\s+(\S+)/i);
    if (match) {
      const ponPort = match[1];
      const onuIndex = parseInt(match[2]);
      const status = parseStatus(match[3]);
      const serialNumber = match[4].toUpperCase();
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: null,
        tx_power: null,
        mac_address: isMacAddress(serialNumber) ? formatMac(serialNumber) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 5: EPON format (common in Chinese OLTs)
    // epon-onu 0/1:1 is online, SN: VSOL12345678
    match = trimmedLine.match(/(?:epon|gpon)-onu\s+(\d+\/\d+):(\d+)\s+(?:is\s+)?(\w+).*?(?:SN|MAC|serial)[:\s]+(\S+)/i);
    if (match) {
      const ponPort = match[1];
      const onuIndex = parseInt(match[2]);
      const status = parseStatus(match[3]);
      const serialNumber = match[4].toUpperCase();
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: null,
        tx_power: null,
        mac_address: isMacAddress(serialNumber) ? formatMac(serialNumber) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 6: ONU index with status (simple format)
    // ONU 1: online   RX: -21.5 dBm   TX: 2.1 dBm
    match = trimmedLine.match(/ONU\s+(\d+)[:\s]+(\w+)(?:.*?RX[:\s]+([-\d.]+))?(?:.*?TX[:\s]+([-\d.]+))?/i);
    if (match) {
      const onuIndex = parseInt(match[1]);
      const status = parseStatus(match[2]);
      const rxPower = match[3] ? parseFloat(match[3]) : null;
      const txPower = match[4] ? parseFloat(match[4]) : null;
      const ponPort = currentPonPort || 'default';
      const key = `${ponPort}:${onuIndex}`;
      
      if (!onuMap.has(key)) {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: status,
          serial_number: null,
          name: null,
          rx_power: rxPower,
          tx_power: txPower,
          mac_address: null,
          router_name: null
        });
      } else {
        // Update existing entry with power info
        const onu = onuMap.get(key);
        if (rxPower !== null) onu.rx_power = rxPower;
        if (txPower !== null) onu.tx_power = txPower;
        if (status !== 'unknown') onu.status = status;
      }
      continue;
    }
    
    // Pattern 7: Optical power info (separate line)
    // ONU 1  RX: -22.5 dBm  TX: 2.1 dBm
    // or: 1/1:1  Rx Pwr: -21.5  Tx Pwr: 2.3
    const opticalMatch = trimmedLine.match(/(?:ONU\s+)?(\d+(?:\/\d+)?(?::\d+)?).*?(?:RX|Rx\s*(?:Pwr|Power)?)[:\s]+([-\d.]+).*?(?:TX|Tx\s*(?:Pwr|Power)?)[:\s]+([-\d.]+)/i);
    if (opticalMatch) {
      const identifier = opticalMatch[1];
      const rxPower = parseFloat(opticalMatch[2]);
      const txPower = parseFloat(opticalMatch[3]);
      
      // Try to match to existing ONU
      for (const [key, onu] of onuMap) {
        if (key.includes(identifier) || onu.onu_index.toString() === identifier) {
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
          break;
        }
      }
      continue;
    }
    
    // Pattern 8: MAC address line
    // MAC Address: 00:11:22:33:44:55 or MAC: 001122334455
    const macMatch = trimmedLine.match(/MAC(?:\s*Address)?[:\s]+([0-9a-fA-F]{2}[:-]?[0-9a-fA-F]{2}[:-]?[0-9a-fA-F]{2}[:-]?[0-9a-fA-F]{2}[:-]?[0-9a-fA-F]{2}[:-]?[0-9a-fA-F]{2})/i);
    if (macMatch) {
      const macAddress = formatMac(macMatch[1]);
      // Assign to most recently added ONU
      const keys = Array.from(onuMap.keys());
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        const onu = onuMap.get(lastKey);
        if (onu && !onu.mac_address) {
          onu.mac_address = macAddress;
        }
      }
      continue;
    }
    
    // Pattern 9: Description/Name line
    // Description: Customer_Name or Name: Router1
    const nameMatch = trimmedLine.match(/(?:name|desc|description)[:\s]+(.+)/i);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      // Assign to most recently added ONU
      const keys = Array.from(onuMap.keys());
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        const onu = onuMap.get(lastKey);
        if (onu && !onu.name) {
          onu.name = name;
        }
      }
      continue;
    }
    
    // Pattern 10: Router name in various formats
    const routerMatch = trimmedLine.match(/(?:router|device|hostname)[:\s]+(.+)/i);
    if (routerMatch) {
      const routerName = routerMatch[1].trim();
      const keys = Array.from(onuMap.keys());
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        const onu = onuMap.get(lastKey);
        if (onu && !onu.router_name) {
          onu.router_name = routerName;
        }
      }
      continue;
    }
  }
  
  // Convert map to array and ensure all required fields
  for (const [key, onu] of onuMap) {
    // Generate serial number if missing
    if (!onu.serial_number) {
      if (onu.mac_address) {
        onu.serial_number = onu.mac_address.replace(/[:-]/g, '').toUpperCase();
      } else {
        onu.serial_number = `VSOL-${onu.pon_port.replace(/\//g, '-')}-${onu.onu_index}`;
      }
    }
    
    // Generate name if missing
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`VSOL parser found ${onus.length} ONUs from ${lines.length} lines`);
  
  // Log sample of found ONUs for debugging
  if (onus.length > 0) {
    logger.debug(`Sample ONU: ${JSON.stringify(onus[0])}`);
  }
  
  return onus;
}

/**
 * Parse ONU status string to standard status
 */
function parseStatus(statusStr) {
  if (!statusStr) return 'unknown';
  
  const status = statusStr.toLowerCase().trim();
  
  if (status === 'online' || status === 'up' || status === 'active' || status === 'working') {
    return 'online';
  }
  if (status === 'offline' || status === 'down' || status === 'inactive' || status === 'los' || status === 'losi') {
    return 'offline';
  }
  if (status.includes('dying') || status.includes('gasp') || status.includes('warning') || status === 'deactive') {
    return 'warning';
  }
  
  return 'unknown';
}

/**
 * Check if a string looks like a MAC address
 */
function isMacAddress(str) {
  if (!str) return false;
  const cleaned = str.replace(/[:-]/g, '').toUpperCase();
  return /^[0-9A-F]{12}$/.test(cleaned);
}

/**
 * Format MAC address to standard format (XX:XX:XX:XX:XX:XX)
 */
function formatMac(mac) {
  if (!mac) return null;
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();
  if (cleaned.length !== 12) return mac;
  return cleaned.match(/.{2}/g).join(':');
}
