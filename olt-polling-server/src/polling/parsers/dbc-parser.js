import { logger } from '../../utils/logger.js';

/**
 * Parse DBC OLT output to extract ONU information
 * DBC OLTs use a format similar to ZTE/VSOL
 * 
 * Common output formats:
 * - show onu status
 * - show onu optical-power
 * - show onu list
 */
export function parseDBCOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  logger.info(`DBC parser processing ${lines.length} lines of output`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty and separator lines
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.includes('show ') ||
        trimmedLine.length < 5) {
      continue;
    }
    
    // Detect PON port context
    const ponMatch = trimmedLine.match(/(?:gpon|epon|pon)[^\d]*(\d+\/\d+(?:\/\d+)?)/i);
    if (ponMatch) {
      currentPonPort = ponMatch[1];
    }
    
    // Pattern 1: Table format with pipe separators
    // ONU-ID | Port | SN | Status | RX Power
    // 1 | gpon-olt0/0/1:1 | DBCG12345678 | online | -18.5
    const pipeMatch = trimmedLine.match(/(\d+)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(online|offline|inactive)\s*\|\s*([-\d.]+)?/i);
    if (pipeMatch) {
      const onuIndex = parseInt(pipeMatch[1]);
      const ponPort = pipeMatch[2];
      const serial = pipeMatch[3];
      const status = pipeMatch[4].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = pipeMatch[5] ? parseFloat(pipeMatch[5]) : null;
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
    
    // Pattern 2: Space-separated table
    // Index  PON       SN              Status    RxPower  TxPower
    // 1      0/0/1:1   DBCG12345678    online    -18.5    2.1
    const spaceMatch = trimmedLine.match(/^(\d+)\s+(\d+\/\d+\/\d+:\d+)\s+(\S+)\s+(online|offline|inactive)\s+([-\d.]+)?\s*([-\d.]+)?/i);
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
        pon_port: ponPort,
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
    // gpon-olt0/0/1:1 Status: online SN: DBCG12345678
    const altMatch = trimmedLine.match(/(gpon[^\s]+)\s+Status:\s*(online|offline|inactive)\s+SN:\s*(\S+)/i);
    if (altMatch) {
      const ponPort = altMatch[1];
      const status = altMatch[2].toLowerCase() === 'online' ? 'online' : 'offline';
      const serial = altMatch[3];
      const onuIndex = onus.length + 1;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: ponPort,
        serial_number: serial,
        name: null,
        status: status,
        rx_power: null,
        tx_power: null,
        mac_address: isMacAddress(serial) ? formatMac(serial) : null,
        router_name: null
      });
      continue;
    }
    
    // Pattern 4: ONU with MAC address
    // onu 1 mac 00:11:22:33:44:55 status online
    const onuMacMatch = trimmedLine.match(/onu\s+(\d+)\s+mac\s+([0-9a-fA-F:.-]+)\s+status\s+(online|offline)/i);
    if (onuMacMatch && currentPonPort) {
      const onuIndex = parseInt(onuMacMatch[1]);
      const macAddress = formatMac(onuMacMatch[2]);
      const status = onuMacMatch[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const key = `${currentPonPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: currentPonPort,
        serial_number: macAddress.replace(/:/g, ''),
        name: null,
        status: status,
        rx_power: null,
        tx_power: null,
        mac_address: macAddress,
        router_name: null
      });
      continue;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    if (!onu.serial_number) {
      onu.serial_number = `DBC-${onu.pon_port.replace(/[\/:-]/g, '-')}-${onu.onu_index}`;
    }
    
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`DBC parser found ${onus.length} ONUs from ${lines.length} lines`);
  
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
