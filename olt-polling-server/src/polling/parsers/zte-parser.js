import { logger } from '../../utils/logger.js';

/**
 * Parse ZTE OLT CLI output to extract ONU information
 * Supports ZTE C300, C320, C600 series
 * Handles both EPON and GPON output formats
 * 
 * Common output formats:
 * GPON:
 * - show gpon onu state
 * - show gpon onu detail-info
 * - show gpon onu optical-info
 * 
 * EPON:
 * - show epon onu state
 * - show epon onu detail-info
 * - show epon optical-transceiver-diagnosis
 */
export function parseZTEOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  let currentOnuId = null;
  let isEponMode = false;
  
  logger.info(`ZTE parser processing ${lines.length} lines of output`);
  
  // Detect EPON vs GPON mode from output
  if (output.toLowerCase().includes('epon') && !output.toLowerCase().includes('gpon')) {
    isEponMode = true;
    logger.info(`ZTE parser detected EPON mode`);
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty and separator lines
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.includes('terminal length') ||
        trimmedLine.length < 5) {
      continue;
    }
    
    // ============= GPON Patterns =============
    
    // Pattern 1: gpon-onu state line
    // gpon-onu_1/1/1:1   online
    // or: gpon-onu_1/1/1:1  offline
    const onuStateMatch = trimmedLine.match(/gpon-onu_(\d+\/\d+\/\d+):(\d+)\s+(\w+)/i);
    if (onuStateMatch) {
      const ponPort = onuStateMatch[1];
      const onuIndex = parseInt(onuStateMatch[2]);
      const status = onuStateMatch[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const key = `${ponPort}:${onuIndex}`;
      
      currentPonPort = ponPort;
      currentOnuId = onuIndex;
      
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
    
    // ============= EPON Patterns =============
    
    // Pattern 1e: epon-onu state line
    // epon-onu_1/1/1:1   online
    const eponOnuStateMatch = trimmedLine.match(/epon-onu_(\d+\/\d+\/\d+):(\d+)\s+(\w+)/i);
    if (eponOnuStateMatch) {
      const ponPort = eponOnuStateMatch[1];
      const onuIndex = parseInt(eponOnuStateMatch[2]);
      const status = eponOnuStateMatch[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const key = `${ponPort}:${onuIndex}`;
      
      currentPonPort = ponPort;
      currentOnuId = onuIndex;
      isEponMode = true;
      
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
    
    // Pattern 2e: EPON table format with MAC address
    // F/S/P:ONT   MAC              Status  RxPower  TxPower
    // 1/1/1:1    00:11:22:33:44:55  online  -18.5    2.1
    const eponTableMatch = trimmedLine.match(/(\d+\/\d+\/\d+):(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+(online|offline|inactive)\s*([-\d.]+)?\s*([-\d.]+)?/i);
    if (eponTableMatch) {
      const ponPort = eponTableMatch[1];
      const onuIndex = parseInt(eponTableMatch[2]);
      const macAddress = formatMac(eponTableMatch[3]);
      const status = eponTableMatch[4].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = eponTableMatch[5] ? parseFloat(eponTableMatch[5]) : null;
      const txPower = eponTableMatch[6] ? parseFloat(eponTableMatch[6]) : null;
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
    
    // Pattern 2: ONU line in table format (GPON)
    // F/S/P:ONT   SN              Status  RxPower  TxPower
    // 1/1/1:1    ZTEGC1234567    online  -18.5    2.1
    const tableMatch = trimmedLine.match(/(\d+\/\d+\/\d+):(\d+)\s+(\S+)\s+(online|offline|inactive)\s*([-\d.]+)?\s*([-\d.]+)?/i);
    if (tableMatch) {
      const ponPort = tableMatch[1];
      const onuIndex = parseInt(tableMatch[2]);
      const serialNumber = tableMatch[3];
      const status = tableMatch[4].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = tableMatch[5] ? parseFloat(tableMatch[5]) : null;
      const txPower = tableMatch[6] ? parseFloat(tableMatch[6]) : null;
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
    
    // Pattern 3: Serial number line
    // Serial number: ZTEGC1234567
    // SN: ZTEGC1234567
    const snMatch = trimmedLine.match(/(?:Serial\s*number|SN)[:\s]+(\S+)/i);
    if (snMatch && currentPonPort && currentOnuId) {
      const key = `${currentPonPort}:${currentOnuId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).serial_number = snMatch[1];
      }
      continue;
    }
    
    // Pattern 4: Name/Description line
    // Name: Customer_Name
    // Description: Router1
    const nameMatch = trimmedLine.match(/(?:Name|Description)[:\s]+(.+)/i);
    if (nameMatch && currentPonPort && currentOnuId) {
      const key = `${currentPonPort}:${currentOnuId}`;
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        if (!onu.name || onu.name.startsWith('ONU-')) {
          onu.name = nameMatch[1].trim();
        }
        if (!onu.router_name) {
          onu.router_name = nameMatch[1].trim();
        }
      }
      continue;
    }
    
    // Pattern 5: Optical power line (GPON)
    // gpon-onu_1/1/1:1  -22.50  2.50
    const opticalMatch = trimmedLine.match(/gpon-onu_(\d+\/\d+\/\d+):(\d+)\s+([-\d.]+)\s+([-\d.]+)/i);
    if (opticalMatch) {
      const ponPort = opticalMatch[1];
      const onuIndex = parseInt(opticalMatch[2]);
      const rxPower = parseFloat(opticalMatch[3]);
      const txPower = parseFloat(opticalMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        onuMap.get(key).rx_power = rxPower;
        onuMap.get(key).tx_power = txPower;
      }
      continue;
    }
    
    // Pattern 5e: Optical power line (EPON)
    // epon-onu_1/1/1:1  -22.50  2.50
    const eponOpticalMatch = trimmedLine.match(/epon-onu_(\d+\/\d+\/\d+):(\d+)\s+([-\d.]+)\s+([-\d.]+)/i);
    if (eponOpticalMatch) {
      const ponPort = eponOpticalMatch[1];
      const onuIndex = parseInt(eponOpticalMatch[2]);
      const rxPower = parseFloat(eponOpticalMatch[3]);
      const txPower = parseFloat(eponOpticalMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        onuMap.get(key).rx_power = rxPower;
        onuMap.get(key).tx_power = txPower;
      }
      continue;
    }
    
    // Pattern 6: Standalone optical power
    // Rx optical power: -22.50 dBm
    // Tx optical power: 2.50 dBm
    const rxOptMatch = trimmedLine.match(/Rx\s*(?:optical)?\s*power[:\s]+([-\d.]+)/i);
    if (rxOptMatch && currentPonPort && currentOnuId) {
      const key = `${currentPonPort}:${currentOnuId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).rx_power = parseFloat(rxOptMatch[1]);
      }
      continue;
    }
    
    const txOptMatch = trimmedLine.match(/Tx\s*(?:optical)?\s*power[:\s]+([-\d.]+)/i);
    if (txOptMatch && currentPonPort && currentOnuId) {
      const key = `${currentPonPort}:${currentOnuId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).tx_power = parseFloat(txOptMatch[1]);
      }
      continue;
    }
    
    // Pattern 7: MAC address line
    // MAC: 00:11:22:33:44:55
    const macMatch = trimmedLine.match(/MAC[:\s]+([0-9a-fA-F:.-]{12,17})/i);
    if (macMatch && currentPonPort && currentOnuId) {
      const key = `${currentPonPort}:${currentOnuId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).mac_address = formatMac(macMatch[1]);
      }
      continue;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    // Generate serial if not found
    if (!onu.serial_number) {
      if (onu.mac_address) {
        onu.serial_number = onu.mac_address.replace(/:/g, '');
      } else {
        onu.serial_number = `ZTE-${key.replace(/\//g, '-')}`;
      }
    }
    
    // Generate name if not set
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`ZTE parser found ${onus.length} ONUs from ${lines.length} lines (${isEponMode ? 'EPON' : 'GPON'} mode)`);
  
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
