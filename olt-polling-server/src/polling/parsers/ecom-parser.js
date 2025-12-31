import { logger } from '../../utils/logger.js';

/**
 * Parse ECOM OLT output to extract ONU information
 * ECOM GPON OLTs
 * 
 * Common output formats:
 * - show gpon onu state
 * - show gpon onu optical
 * - show gpon onu info
 */
export function parseECOMOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  logger.info(`ECOM parser processing ${lines.length} lines of output`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty and separator lines
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.includes('show gpon') ||
        trimmedLine.includes('ONU ID') ||
        trimmedLine.length < 5) {
      continue;
    }
    
    // Detect PON port context
    const ponMatch = trimmedLine.match(/(?:gpon|pon)[^\d]*(\d+\/\d+\/\d+)/i);
    if (ponMatch) {
      currentPonPort = ponMatch[1];
    }
    
    // Pattern 1: Table with pipe separators
    // ONU ID | PON Port | Serial Number | Status | RX Power | TX Power
    // 1 | 0/1/1 | ECOM12345678 | Online | -19.20 | 2.10
    const pipeMatch = trimmedLine.match(/(\d+)\s*\|\s*(\d+\/\d+\/\d+)\s*\|\s*(\S+)\s*\|\s*(Online|Offline|Inactive)\s*\|\s*([-\d.]+)?\s*\|\s*([-\d.]+)?/i);
    if (pipeMatch) {
      const onuIndex = parseInt(pipeMatch[1]);
      const ponPort = pipeMatch[2];
      const serial = pipeMatch[3];
      const status = pipeMatch[4].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = pipeMatch[5] ? parseFloat(pipeMatch[5]) : null;
      const txPower = pipeMatch[6] ? parseFloat(pipeMatch[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: `gpon-${ponPort}`,
        serial_number: serial,
        name: null,
        status: status,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: isMacAddress(serial) ? formatMac(serial) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 2: Space-separated table
    // 1   0/1/1   ECOM12345678   Online   -19.20   2.10
    const spaceMatch = trimmedLine.match(/^\s*(\d+)\s+(\d+\/\d+\/\d+)\s+(\S+)\s+(online|offline|inactive)\s+([-\d.]+)?\s*([-\d.]+)?/i);
    if (spaceMatch) {
      const onuIndex = parseInt(spaceMatch[1]);
      const ponPort = spaceMatch[2];
      const serial = spaceMatch[3];
      const status = spaceMatch[4].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = spaceMatch[5] ? parseFloat(spaceMatch[5]) : null;
      const txPower = spaceMatch[6] ? parseFloat(spaceMatch[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: `gpon-${ponPort}`,
        serial_number: serial,
        name: null,
        status: status,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: isMacAddress(serial) ? formatMac(serial) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 3: Alternative format
    // gpon0/1:1 ECOM12345678 online -18.5dBm
    const altMatch = trimmedLine.match(/(gpon\S+)\s+(\S+)\s+(online|offline)\s+([-\d.]+)?/i);
    if (altMatch) {
      const ponPort = altMatch[1];
      const serial = altMatch[2];
      const status = altMatch[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = altMatch[4] ? parseFloat(altMatch[4]) : null;
      const onuIndex = onus.length + 1;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: ponPort,
        serial_number: serial,
        name: null,
        status: status,
        rx_power: rxPower,
        tx_power: null,
        mac_address: isMacAddress(serial) ? formatMac(serial) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 4: ONU state format
    // ONU 1 on gpon 0/1/1: online SN=ECOM12345678 RX=-18.5 TX=2.1
    const stateMatch = trimmedLine.match(/ONU\s+(\d+)\s+on\s+gpon\s+(\S+):\s*(online|offline)\s+SN=(\S+)\s+RX=([-\d.]+)\s+TX=([-\d.]+)/i);
    if (stateMatch) {
      const onuIndex = parseInt(stateMatch[1]);
      const ponPort = stateMatch[2];
      const status = stateMatch[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const serial = stateMatch[4];
      const rxPower = parseFloat(stateMatch[5]);
      const txPower = parseFloat(stateMatch[6]);
      const key = `gpon-${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: `gpon-${ponPort}`,
        serial_number: serial,
        name: null,
        status: status,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: isMacAddress(serial) ? formatMac(serial) : null,
        router_name: null
      });
      continue;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    if (!onu.serial_number) {
      onu.serial_number = `ECOM-${onu.pon_port.replace(/[\/:-]/g, '-')}-${onu.onu_index}`;
    }
    
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`ECOM parser found ${onus.length} ONUs from ${lines.length} lines`);
  
  if (onus.length > 0) {
    logger.debug(`Sample ONU: ${JSON.stringify(onus[0])}`);
  }
  
  return onus;
}

/**
 * Check if string is MAC address
 */
function isMacAddress(str) {
  if (!str) return false;
  const cleaned = str.replace(/[:-]/g, '').toUpperCase();
  return /^[0-9A-F]{12}$/.test(cleaned);
}

/**
 * Format MAC address to XX:XX:XX:XX:XX:XX
 */
function formatMac(mac) {
  if (!mac) return null;
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();
  if (cleaned.length !== 12) return mac.toUpperCase();
  return cleaned.match(/.{2}/g).join(':');
}
