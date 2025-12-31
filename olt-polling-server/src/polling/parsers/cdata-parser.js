import { logger } from '../../utils/logger.js';

/**
 * Parse CDATA OLT output to extract ONU information
 * CDATA FD series OLTs
 * 
 * Common output formats:
 * - show onu status all
 * - show onu optical-info all
 * - show onu list
 */
export function parseCDATAOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  logger.info(`CDATA parser processing ${lines.length} lines of output`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty and separator lines
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.includes('show onu') ||
        trimmedLine.includes('ONU ID') ||
        trimmedLine.length < 5) {
      continue;
    }
    
    // Detect PON port context
    const ponMatch = trimmedLine.match(/(?:pon|gpon|epon)[^\d]*(\d+\/\d+\/\d+)/i);
    if (ponMatch) {
      currentPonPort = ponMatch[1];
    }
    
    // Pattern 1: Table with pipe separators
    // PON Port | ONU ID | Serial | Status | RX Power (dBm) | TX Power (dBm)
    // 1/1/1 | 1 | CDTA12345678 | Online | -18.50 | 2.30
    const pipeMatch = trimmedLine.match(/(\d+\/\d+\/\d+)\s*\|\s*(\d+)\s*\|\s*(\S+)\s*\|\s*(Online|Offline|LOS)\s*\|\s*([-\d.]+)?\s*\|\s*([-\d.]+)?/i);
    if (pipeMatch) {
      const ponPort = pipeMatch[1];
      const onuIndex = parseInt(pipeMatch[2]);
      const serial = pipeMatch[3];
      const status = pipeMatch[4].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = pipeMatch[5] ? parseFloat(pipeMatch[5]) : null;
      const txPower = pipeMatch[6] ? parseFloat(pipeMatch[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: `pon-${ponPort}`,
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
    // ONU   PON      SN              Status    RxPower  TxPower
    // 1     1/1/1    CDTA12345678    online    -18.5    2.1
    const spaceMatch = trimmedLine.match(/^\s*(\d+)\s+(\d+\/\d+\/\d+)\s+(\S+)\s+(online|offline|los|working)\s+([-\d.]+)?\s*([-\d.]+)?/i);
    if (spaceMatch) {
      const onuIndex = parseInt(spaceMatch[1]);
      const ponPort = spaceMatch[2];
      const serial = spaceMatch[3];
      const status = (spaceMatch[4].toLowerCase() === 'online' || spaceMatch[4].toLowerCase() === 'working') ? 'online' : 'offline';
      const rxPower = spaceMatch[5] ? parseFloat(spaceMatch[5]) : null;
      const txPower = spaceMatch[6] ? parseFloat(spaceMatch[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: `pon-${ponPort}`,
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
    
    // Pattern 3: ONU list format
    // onu 1 on port 0/1/1 sn: CDTA12345678 state: working
    const listMatch = trimmedLine.match(/onu\s+(\d+)\s+on\s+port\s+(\S+)\s+sn:\s*(\S+)\s+state:\s*(working|online|offline|los)/i);
    if (listMatch) {
      const onuIndex = parseInt(listMatch[1]);
      const ponPort = listMatch[2];
      const serial = listMatch[3];
      const status = (listMatch[4].toLowerCase() === 'working' || listMatch[4].toLowerCase() === 'online') ? 'online' : 'offline';
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
    
    // Pattern 4: ONU with MAC
    // Index: 1  MAC: 00:11:22:33:44:55  Status: Online  RX: -18.5 dBm
    const macStatusMatch = trimmedLine.match(/Index:\s*(\d+)\s+MAC:\s*([0-9a-fA-F:.-]+)\s+Status:\s*(Online|Offline)\s+RX:\s*([-\d.]+)/i);
    if (macStatusMatch && currentPonPort) {
      const onuIndex = parseInt(macStatusMatch[1]);
      const macAddress = formatMac(macStatusMatch[2]);
      const status = macStatusMatch[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = parseFloat(macStatusMatch[4]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      onuMap.set(key, {
        onu_index: onuIndex,
        pon_port: currentPonPort,
        serial_number: macAddress.replace(/:/g, ''),
        name: null,
        status: status,
        rx_power: rxPower,
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
      onu.serial_number = `CDATA-${onu.pon_port.replace(/[\/:-]/g, '-')}-${onu.onu_index}`;
    }
    
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`CDATA parser found ${onus.length} ONUs from ${lines.length} lines`);
  
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
