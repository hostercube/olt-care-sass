import { logger } from '../../utils/logger.js';

/**
 * Parse BDCOM OLT CLI output to extract ONU information
 * Supports BDCOM EPON OLT series (GP3600, P3310, etc.)
 * 
 * Common BDCOM EPON CLI output formats:
 * - show epon onu-info
 * - show epon optical-transceiver-diagnosis interface
 * - show epon active onu
 */
export function parseBDCOMOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  logger.info(`BDCOM parser processing ${lines.length} lines of output`);
  logger.debug(`BDCOM output first 500 chars: ${output.substring(0, 500)}`);
  
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
    
    // Detect PON port context
    // EPON0/1, epon0/1, EPON 0/1
    let ponMatch = trimmedLine.match(/(?:EPON|epon)[\s\-]?(\d+\/\d+)/i);
    if (ponMatch) {
      currentPonPort = ponMatch[1];
      logger.debug(`Detected PON port: ${currentPonPort}`);
    }
    
    // Pattern 1: BDCOM epon onu-info format
    // epon0/1:1    00:11:22:33:44:55    Online    BDCOM
    // or: EPON0/1:1   MAC: 001122334455   Status: Online
    const eponInfoMatch = trimmedLine.match(/(?:epon|EPON)(\d+\/\d+):(\d+)\s+(?:MAC[:\s]+)?([0-9A-Fa-f:]{12,17})\s+(?:Status[:\s]+)?(\w+)/i);
    if (eponInfoMatch) {
      const ponPort = eponInfoMatch[1];
      const onuIndex = parseInt(eponInfoMatch[2]);
      const macAddress = formatMac(eponInfoMatch[3]);
      const status = parseStatus(eponInfoMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      logger.debug(`Parsed BDCOM ONU: ${key} MAC=${macAddress} Status=${status}`);
      
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
    
    // Pattern 2: Table format with ONU index, MAC, status
    // 1   00:11:22:33:44:55   Online   -21.5   2.1
    const tableMatch = trimmedLine.match(/^(\d+)\s+([0-9A-Fa-f:]{12,17})\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/);
    if (tableMatch) {
      const onuIndex = parseInt(tableMatch[1]);
      const macAddress = formatMac(tableMatch[2]);
      const status = parseStatus(tableMatch[3]);
      const rxPower = tableMatch[4] ? parseFloat(tableMatch[4]) : null;
      const txPower = tableMatch[5] ? parseFloat(tableMatch[5]) : null;
      const ponPort = currentPonPort || '0/1';
      const key = `${ponPort}:${onuIndex}`;
      
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
    
    // Pattern 3: BDCOM optical diagnosis output
    // EPON0/1:1  Rx Optical Power: -21.5 dBm  Tx Optical Power: 2.1 dBm
    const opticalMatch = trimmedLine.match(/(?:epon|EPON)?(\d+\/\d+):(\d+)\s+.*?(?:Rx|RX)[^:]*:\s*([-\d.]+).*?(?:Tx|TX)[^:]*:\s*([-\d.]+)/i);
    if (opticalMatch) {
      const ponPort = opticalMatch[1];
      const onuIndex = parseInt(opticalMatch[2]);
      const rxPower = parseFloat(opticalMatch[3]);
      const txPower = parseFloat(opticalMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        onu.rx_power = rxPower;
        onu.tx_power = txPower;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: 'online',
          serial_number: null,
          name: null,
          rx_power: rxPower,
          tx_power: txPower,
          mac_address: null,
          router_name: null
        });
      }
      continue;
    }
    
    // Pattern 4: Simple optical power format
    // 1  -21.5  2.1
    const simpleOpticalMatch = trimmedLine.match(/^(\d+)\s+([-\d.]+)\s+([-\d.]+)/);
    if (simpleOpticalMatch && currentPonPort) {
      const onuIndex = parseInt(simpleOpticalMatch[1]);
      const rxPower = parseFloat(simpleOpticalMatch[2]);
      const txPower = parseFloat(simpleOpticalMatch[3]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        if (rxPower < 0) onu.rx_power = rxPower;
        if (txPower > 0) onu.tx_power = txPower;
      }
      continue;
    }
    
    // Pattern 5: ONU is online/offline status line
    // ONU 1 on epon0/1 is online
    const statusLineMatch = trimmedLine.match(/ONU\s+(\d+)\s+on\s+(?:epon|EPON)?(\d+\/\d+)\s+is\s+(\w+)/i);
    if (statusLineMatch) {
      const onuIndex = parseInt(statusLineMatch[1]);
      const ponPort = statusLineMatch[2];
      const status = parseStatus(statusLineMatch[3]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (!onuMap.has(key)) {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: status,
          serial_number: null,
          name: null,
          rx_power: null,
          tx_power: null,
          mac_address: null,
          router_name: null
        });
      } else {
        onuMap.get(key).status = status;
      }
      continue;
    }
    
    // Pattern 6: MAC address line
    const macMatch = trimmedLine.match(/MAC(?:\s*Address)?[:\s]+([0-9a-fA-F:.-]{12,17})/i);
    if (macMatch) {
      const macAddress = formatMac(macMatch[1]);
      const keys = Array.from(onuMap.keys());
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        const onu = onuMap.get(lastKey);
        if (onu && !onu.mac_address) {
          onu.mac_address = macAddress;
          if (!onu.serial_number) {
            onu.serial_number = macAddress.replace(/:/g, '');
          }
        }
      }
      continue;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    if (!onu.serial_number) {
      if (onu.mac_address) {
        onu.serial_number = onu.mac_address.replace(/[:-]/g, '').toUpperCase();
      } else {
        onu.serial_number = `BDCOM-${onu.pon_port.replace(/\//g, '-')}-${onu.onu_index}`;
      }
    }
    
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`BDCOM parser found ${onus.length} ONUs from ${lines.length} lines`);
  
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
  
  if (status === 'online' || status === 'up' || status === 'active' || status === 'working' || status === 'registered') {
    return 'online';
  }
  if (status === 'offline' || status === 'down' || status === 'inactive' || status === 'los' || status === 'losi' || status === 'unregistered') {
    return 'offline';
  }
  if (status.includes('dying') || status.includes('gasp') || status.includes('warning') || status === 'deactive') {
    return 'warning';
  }
  
  return 'unknown';
}

/**
 * Format MAC address to standard format (XX:XX:XX:XX:XX:XX)
 */
function formatMac(mac) {
  if (!mac) return null;
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();
  if (cleaned.length !== 12) return mac.toUpperCase();
  return cleaned.match(/.{2}/g).join(':');
}
