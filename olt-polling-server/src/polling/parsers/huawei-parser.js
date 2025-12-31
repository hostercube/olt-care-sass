import { logger } from '../../utils/logger.js';

/**
 * Parse Huawei OLT CLI output to extract ONU information
 * Supports Huawei MA5800, MA5683T series
 * 
 * Common output formats:
 * - display ont info summary all
 * - display ont optical-info all
 * - display ont info
 */
export function parseHuaweiOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  let currentOntId = null;
  
  logger.info(`Huawei parser processing ${lines.length} lines of output`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty and separator lines
    if (!trimmedLine || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('===') ||
        trimmedLine.includes('display ont') ||
        trimmedLine.includes('screen-length') ||
        trimmedLine.length < 5) {
      continue;
    }
    
    // Pattern 1: ONT summary table
    // F/S/P   ONT-ID   SN            Status   Config state
    // 0/1/0   1        48575443...   online   normal
    const ontMatch = trimmedLine.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+)\s+(\S+)\s+(online|offline|inactive)/i);
    if (ontMatch) {
      const frame = ontMatch[1];
      const slot = ontMatch[2];
      const port = ontMatch[3];
      const ontId = parseInt(ontMatch[4]);
      const serialNumber = ontMatch[5];
      const status = ontMatch[6].toLowerCase() === 'online' ? 'online' : 'offline';
      
      const ponPort = `${frame}/${slot}/${port}`;
      const key = `${ponPort}:${ontId}`;
      
      currentPonPort = ponPort;
      currentOntId = ontId;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: ontId,
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
    
    // Pattern 2: Optical info table
    // F/S/P  ONT-ID  Rx power(dBm)  Tx power(dBm)
    // 0/1/0  1       -18.50         2.30
    const opticalMatch = trimmedLine.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+)\s+([-\d.]+)\s+([-\d.]+)/);
    if (opticalMatch) {
      const ponPort = `${opticalMatch[1]}/${opticalMatch[2]}/${opticalMatch[3]}`;
      const ontId = parseInt(opticalMatch[4]);
      const rxPower = parseFloat(opticalMatch[5]);
      const txPower = parseFloat(opticalMatch[6]);
      const key = `${ponPort}:${ontId}`;
      
      if (onuMap.has(key)) {
        onuMap.get(key).rx_power = rxPower;
        onuMap.get(key).tx_power = txPower;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: ontId,
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
    
    // Pattern 3: Optical power with dBm label
    // Rx optical power(dBm): -18.50
    // Tx optical power(dBm): 2.30
    const rxOptMatch = trimmedLine.match(/Rx\s*optical\s*power.*?:\s*([-\d.]+)/i);
    if (rxOptMatch && currentPonPort && currentOntId) {
      const key = `${currentPonPort}:${currentOntId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).rx_power = parseFloat(rxOptMatch[1]);
      }
      continue;
    }
    
    const txOptMatch = trimmedLine.match(/Tx\s*optical\s*power.*?:\s*([-\d.]+)/i);
    if (txOptMatch && currentPonPort && currentOntId) {
      const key = `${currentPonPort}:${currentOntId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).tx_power = parseFloat(txOptMatch[1]);
      }
      continue;
    }
    
    // Pattern 4: Description/Name line
    // Description: Customer_Name
    // Name: Router1
    const descMatch = trimmedLine.match(/(?:Description|Name)[:\s]+(.+)/i);
    if (descMatch && currentPonPort && currentOntId) {
      const key = `${currentPonPort}:${currentOntId}`;
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        if (!onu.name || onu.name.startsWith('ONU-')) {
          onu.name = descMatch[1].trim();
        }
        if (!onu.router_name) {
          onu.router_name = descMatch[1].trim();
        }
      }
      continue;
    }
    
    // Pattern 5: MAC address
    // MAC address: 00:11:22:33:44:55
    const macMatch = trimmedLine.match(/MAC\s*(?:address)?[:\s]+([0-9a-fA-F:.-]{12,17})/i);
    if (macMatch && currentPonPort && currentOntId) {
      const key = `${currentPonPort}:${currentOntId}`;
      if (onuMap.has(key)) {
        onuMap.get(key).mac_address = formatMac(macMatch[1]);
      }
      continue;
    }
    
    // Pattern 6: SN line
    // SN: HWTC12345678
    const snMatch = trimmedLine.match(/SN[:\s]+(\S+)/i);
    if (snMatch && currentPonPort && currentOntId) {
      const key = `${currentPonPort}:${currentOntId}`;
      if (onuMap.has(key) && !onuMap.get(key).serial_number) {
        onuMap.get(key).serial_number = snMatch[1];
      }
      continue;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    if (!onu.serial_number) {
      if (onu.mac_address) {
        onu.serial_number = onu.mac_address.replace(/:/g, '');
      } else {
        onu.serial_number = `HW-${key.replace(/\//g, '-')}`;
      }
    }
    
    if (!onu.name) {
      onu.name = `ONU-${onu.pon_port}:${onu.onu_index}`;
    }
    
    onus.push(onu);
  }
  
  logger.info(`Huawei parser found ${onus.length} ONUs from ${lines.length} lines`);
  
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
