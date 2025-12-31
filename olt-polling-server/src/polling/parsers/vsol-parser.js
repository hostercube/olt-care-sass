import { logger } from '../../utils/logger.js';

/**
 * Parse VSOL OLT CLI output to extract ONU information
 * Supports VSOL EPON/GPON OLT series (V1600, V1601, V1602, etc.)
 * 
 * Common VSOL EPON CLI output formats:
 * - show epon onu-information
 * - show epon active onu  
 * - show epon optical-transceiver-diagnosis
 * 
 * Common VSOL GPON CLI output formats:
 * - show gpon onu state
 * - show gpon onu list
 */
export function parseVSOLOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  logger.info(`VSOL parser processing ${lines.length} lines of output`);
  logger.debug(`VSOL output first 500 chars: ${output.substring(0, 500)}`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines and common separators
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.startsWith('***') ||
        trimmedLine.startsWith('#') ||
        trimmedLine.includes('terminal length') ||
        trimmedLine.includes('show ') ||
        trimmedLine.length < 5) {
      continue;
    }
    
    // Detect PON port context from various formats
    // EPON0/1, EPON0/2, PON 1/1, gpon-onu 0/1, etc.
    let ponMatch = trimmedLine.match(/(?:EPON|GPON|PON)[\s\-]*(\d+\/\d+(?:\/\d+)?)/i);
    if (ponMatch) {
      currentPonPort = ponMatch[1];
      logger.debug(`Detected PON port: ${currentPonPort}`);
    }
    
    // Pattern 1: VSOL EPON onu-information format
    // EPON0/1:1    00:11:22:33:44:55    Online    VSOL
    // or: EPON0/1:1   001122334455   Online   VSOL   -21.5   2.1
    const eponInfoMatch = trimmedLine.match(/EPON(\d+\/\d+):(\d+)\s+([0-9A-Fa-f:]{12,17})\s+(\w+)(?:\s+\S+)?(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/i);
    if (eponInfoMatch) {
      const ponPort = eponInfoMatch[1];
      const onuIndex = parseInt(eponInfoMatch[2]);
      const macAddress = formatMac(eponInfoMatch[3]);
      const status = parseStatus(eponInfoMatch[4]);
      const rxPower = eponInfoMatch[5] ? parseFloat(eponInfoMatch[5]) : null;
      const txPower = eponInfoMatch[6] ? parseFloat(eponInfoMatch[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      logger.debug(`Parsed EPON ONU: ${key} MAC=${macAddress} Status=${status}`);
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: macAddress.replace(/:/g, ''),
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: macAddress,
        router_name: null
      });
      continue;
    }
    
    // Pattern 2: VSOL active ONU format  
    // 0/1:1  Online  00:11:22:33:44:55
    const activeOnuMatch = trimmedLine.match(/(\d+\/\d+):(\d+)\s+(\w+)\s+([0-9A-Fa-f:]{12,17})/i);
    if (activeOnuMatch) {
      const ponPort = activeOnuMatch[1];
      const onuIndex = parseInt(activeOnuMatch[2]);
      const status = parseStatus(activeOnuMatch[3]);
      const macAddress = formatMac(activeOnuMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: macAddress.replace(/:/g, ''),
        name: null,
        rx_power: null,
        tx_power: null,
        mac_address: macAddress,
        router_name: null
      });
      continue;
    }
    
    // Pattern 3: Simple table format with index first
    // 1   00:11:22:33:44:55   Online   -21.5   2.1
    // or: 1   001122334455   Online   -21.5
    const simpleTableMatch = trimmedLine.match(/^(\d+)\s+([0-9A-Fa-f:]{12,17})\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/);
    if (simpleTableMatch) {
      const onuIndex = parseInt(simpleTableMatch[1]);
      const macAddress = formatMac(simpleTableMatch[2]);
      const status = parseStatus(simpleTableMatch[3]);
      const rxPower = simpleTableMatch[4] ? parseFloat(simpleTableMatch[4]) : null;
      const txPower = simpleTableMatch[5] ? parseFloat(simpleTableMatch[5]) : null;
      const ponPort = currentPonPort || '0/1';
      const key = `${ponPort}:${onuIndex}`;
      
      logger.debug(`Parsed simple table ONU: ${key} MAC=${macAddress}`);
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: macAddress.replace(/:/g, ''),
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: macAddress,
        router_name: null
      });
      continue;
    }
    
    // Pattern 4: x/x/x format (slot/pon/onu)
    // 0/1/1   1   VSOL1234567890   online   -20.5   2.1
    let match = trimmedLine.match(/(\d+\/\d+\/\d+)\s+(\d+)\s+(\S+)\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/);
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
    
    // Pattern 11: VSOL optical-transceiver-diagnosis output
    // EPON0/1:1  -21.5  2.1  OK
    // or: 0/1:1  RxPower:-21.5(dBm) TxPower:2.1(dBm)
    const opticalDiagMatch = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+)\s+([-\d.]+)(?:\s*\(dBm\))?\s+([-\d.]+)/i);
    if (opticalDiagMatch) {
      const ponPort = opticalDiagMatch[1];
      const onuIndex = parseInt(opticalDiagMatch[2]);
      const rxPower = parseFloat(opticalDiagMatch[3]);
      const txPower = parseFloat(opticalDiagMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      // Update existing ONU or create new one
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        onu.rx_power = rxPower;
        onu.tx_power = txPower;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: 'online', // If we can read optical, it's online
          serial_number: null,
          name: null,
          rx_power: rxPower,
          tx_power: txPower,
          mac_address: null,
          router_name: null
        });
      }
      logger.debug(`Parsed optical power for ${key}: RX=${rxPower} TX=${txPower}`);
      continue;
    }
    
    // Pattern 12: Generic line with MAC address anywhere - fallback pattern
    const genericMacMatch = trimmedLine.match(/([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})/);
    if (genericMacMatch && onuMap.size === 0) {
      // If we found a MAC but haven't matched any patterns yet, try to extract more info
      const macAddress = formatMac(genericMacMatch[1]);
      const statusMatch = trimmedLine.match(/(online|offline|up|down|active|inactive)/i);
      const status = statusMatch ? parseStatus(statusMatch[1]) : 'online';
      
      // Try to find index
      const indexMatch = trimmedLine.match(/:(\d+)/) || trimmedLine.match(/^(\d+)/);
      const onuIndex = indexMatch ? parseInt(indexMatch[1]) : onuMap.size + 1;
      
      const ponPort = currentPonPort || '0/1';
      const key = `${ponPort}:${onuIndex}`;
      
      if (!onuMap.has(key)) {
        logger.debug(`Fallback pattern matched MAC: ${macAddress}`);
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: status,
          serial_number: macAddress.replace(/:/g, ''),
          name: null,
          rx_power: null,
          tx_power: null,
          mac_address: macAddress,
          router_name: null
        });
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
