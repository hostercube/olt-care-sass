import { logger } from '../../utils/logger.js';

/**
 * Parse ZTE OLT CLI output to extract ONU information
 * Supports ZTE C300, C320, C600 series
 */
export function parseZTEOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  let currentSection = null;
  const onuMap = new Map();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detect section headers
    if (trimmedLine.includes('gpon-onu_')) {
      // Parse ONU state lines like: gpon-onu_1/1/1:1   online
      const match = trimmedLine.match(/gpon-onu_(\d+\/\d+\/\d+):(\d+)\s+(\w+)/);
      if (match) {
        const ponPort = match[1];
        const onuIndex = parseInt(match[2]);
        const status = match[3].toLowerCase() === 'online' ? 'online' : 'offline';
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
            mac_address: null
          });
        } else {
          onuMap.get(key).status = status;
        }
      }
    }
    
    // Parse ONU detail info - SN
    if (trimmedLine.includes('Serial number:') || trimmedLine.includes('SN:')) {
      const snMatch = trimmedLine.match(/(?:Serial number|SN):\s*(\S+)/i);
      if (snMatch) {
        // Find the last added ONU and set its serial
        const lastKey = Array.from(onuMap.keys()).pop();
        if (lastKey && onuMap.get(lastKey)) {
          onuMap.get(lastKey).serial_number = snMatch[1];
        }
      }
    }
    
    // Parse ONU name/description
    if (trimmedLine.includes('Name:') || trimmedLine.includes('Description:')) {
      const nameMatch = trimmedLine.match(/(?:Name|Description):\s*(.+)/i);
      if (nameMatch) {
        const lastKey = Array.from(onuMap.keys()).pop();
        if (lastKey && onuMap.get(lastKey)) {
          onuMap.get(lastKey).name = nameMatch[1].trim();
        }
      }
    }
    
    // Parse optical info - RX Power
    // Format: gpon-onu_1/1/1:1  -22.50  2.50
    const opticalMatch = trimmedLine.match(/gpon-onu_(\d+\/\d+\/\d+):(\d+)\s+([-\d.]+)\s+([-\d.]+)/);
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
    }
    
    // Parse MAC address
    const macMatch = trimmedLine.match(/MAC:\s*([0-9a-fA-F:.-]+)/i);
    if (macMatch) {
      const lastKey = Array.from(onuMap.keys()).pop();
      if (lastKey && onuMap.get(lastKey)) {
        onuMap.get(lastKey).mac_address = macMatch[1];
      }
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    // Generate serial if not found
    if (!onu.serial_number) {
      onu.serial_number = `ZTE-${key.replace(/\//g, '-')}`;
    }
    onus.push(onu);
  }
  
  logger.debug(`ZTE parser found ${onus.length} ONUs`);
  return onus;
}
