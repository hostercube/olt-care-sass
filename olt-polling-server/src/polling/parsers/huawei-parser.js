import { logger } from '../../utils/logger.js';

/**
 * Parse Huawei OLT CLI output to extract ONU information
 * Supports Huawei MA5800, MA5683T series
 */
export function parseHuaweiOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentFrame = null;
  let currentSlot = null;
  let currentPort = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Parse ONT summary lines
    // Format: 0/1/0   1    ZTEGC1234567    online    ...
    const ontMatch = trimmedLine.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+)\s+(\S+)\s+(\w+)/);
    if (ontMatch) {
      const frame = ontMatch[1];
      const slot = ontMatch[2];
      const port = ontMatch[3];
      const ontId = parseInt(ontMatch[4]);
      const serialNumber = ontMatch[5];
      const status = ontMatch[6].toLowerCase();
      
      const ponPort = `${frame}/${slot}/${port}`;
      const key = `${ponPort}:${ontId}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: ontId,
        status: status === 'online' ? 'online' : 'offline',
        serial_number: serialNumber,
        name: null,
        rx_power: null,
        tx_power: null,
        mac_address: null
      });
    }
    
    // Parse optical info
    // Format varies, looking for dBm values
    const opticalMatch = trimmedLine.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+)\s+.*?([-\d.]+)\s*dBm.*?([-\d.]+)\s*dBm/i);
    if (opticalMatch) {
      const ponPort = `${opticalMatch[1]}/${opticalMatch[2]}/${opticalMatch[3]}`;
      const ontId = parseInt(opticalMatch[4]);
      const rxPower = parseFloat(opticalMatch[5]);
      const txPower = parseFloat(opticalMatch[6]);
      const key = `${ponPort}:${ontId}`;
      
      if (onuMap.has(key)) {
        onuMap.get(key).rx_power = rxPower;
        onuMap.get(key).tx_power = txPower;
      }
    }
    
    // Alternative optical format: just power values in sequence
    const altOpticalMatch = trimmedLine.match(/Rx optical power.*?([-\d.]+)\s*dBm/i);
    if (altOpticalMatch) {
      const rxPower = parseFloat(altOpticalMatch[1]);
      // Apply to last ONU
      const lastKey = Array.from(onuMap.keys()).pop();
      if (lastKey && onuMap.get(lastKey)) {
        onuMap.get(lastKey).rx_power = rxPower;
      }
    }
    
    const txOpticalMatch = trimmedLine.match(/Tx optical power.*?([-\d.]+)\s*dBm/i);
    if (txOpticalMatch) {
      const txPower = parseFloat(txOpticalMatch[1]);
      const lastKey = Array.from(onuMap.keys()).pop();
      if (lastKey && onuMap.get(lastKey)) {
        onuMap.get(lastKey).tx_power = txPower;
      }
    }
    
    // Parse description/name
    const descMatch = trimmedLine.match(/Description\s*:\s*(.+)/i);
    if (descMatch) {
      const lastKey = Array.from(onuMap.keys()).pop();
      if (lastKey && onuMap.get(lastKey)) {
        onuMap.get(lastKey).name = descMatch[1].trim();
      }
    }
    
    // Parse MAC
    const macMatch = trimmedLine.match(/MAC\s*(?:address)?\s*:\s*([0-9a-fA-F:.-]+)/i);
    if (macMatch) {
      const lastKey = Array.from(onuMap.keys()).pop();
      if (lastKey && onuMap.get(lastKey)) {
        onuMap.get(lastKey).mac_address = macMatch[1];
      }
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    if (!onu.serial_number) {
      onu.serial_number = `HW-${key.replace(/\//g, '-')}`;
    }
    onus.push(onu);
  }
  
  logger.debug(`Huawei parser found ${onus.length} ONUs`);
  return onus;
}
