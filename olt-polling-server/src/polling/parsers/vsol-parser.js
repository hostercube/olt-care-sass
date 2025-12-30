import { logger } from '../../utils/logger.js';

/**
 * Parse VSOL OLT CLI output to extract ONU information
 * Supports VSOL EPON/GPON OLT series
 */
export function parseVSOLOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and headers
    if (!trimmedLine || trimmedLine.startsWith('---') || trimmedLine.startsWith('===')) {
      continue;
    }
    
    // Parse ONU list format (VSOL common format)
    // Format variations:
    // 1: PON 1/1  ONU 1  VSOL1234567890  online  -20.5  2.1
    // 2: 1/1/1   1   VSOL1234567890   online   -20.5   2.1
    // 3: pon-onu 1/1:1  online  VSOL1234567890
    
    // Pattern 1: PON x/x ONU x format
    let match = trimmedLine.match(/PON\s+(\d+\/\d+)\s+ONU\s+(\d+)\s+(\S+)\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/i);
    if (match) {
      const ponPort = match[1];
      const onuIndex = parseInt(match[2]);
      const serialNumber = match[3];
      const status = match[4].toLowerCase() === 'online' ? 'online' : 'offline';
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
        mac_address: null
      });
      continue;
    }
    
    // Pattern 2: x/x/x format (slot/pon/onu)
    match = trimmedLine.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+)\s+(\S+)\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/);
    if (match) {
      const ponPort = `${match[1]}/${match[2]}/${match[3]}`;
      const onuIndex = parseInt(match[4]);
      const serialNumber = match[5];
      const status = match[6].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = match[7] ? parseFloat(match[7]) : null;
      const txPower = match[8] ? parseFloat(match[8]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: null
      });
      continue;
    }
    
    // Pattern 3: pon-onu format
    match = trimmedLine.match(/pon-onu\s+(\d+\/\d+):(\d+)\s+(\w+)\s+(\S+)/i);
    if (match) {
      const ponPort = match[1];
      const onuIndex = parseInt(match[2]);
      const status = match[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const serialNumber = match[4];
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: null,
        tx_power: null,
        mac_address: null
      });
      continue;
    }
    
    // Pattern 4: Simple ONU line (ONU ID, MAC/SN, Status)
    // e.g., "1    VSOL12345678    online    -21.5"
    match = trimmedLine.match(/^(\d+)\s+([A-Z0-9]{8,16})\s+(\w+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?$/i);
    if (match) {
      const onuIndex = parseInt(match[1]);
      const serialNumber = match[2];
      const status = match[3].toLowerCase() === 'online' ? 'online' : 'offline';
      const rxPower = match[4] ? parseFloat(match[4]) : null;
      const txPower = match[5] ? parseFloat(match[5]) : null;
      const key = `default:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: 'default',
        onu_index: onuIndex,
        status: status,
        serial_number: serialNumber,
        name: null,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: null
      });
      continue;
    }
    
    // Parse optical power info separately
    // Format: ONU 1  RX: -22.5 dBm  TX: 2.1 dBm
    const opticalMatch = trimmedLine.match(/ONU\s+(\d+).*?(?:RX|Rx).*?([-\d.]+).*?(?:TX|Tx).*?([-\d.]+)/i);
    if (opticalMatch) {
      const onuIndex = parseInt(opticalMatch[1]);
      const rxPower = parseFloat(opticalMatch[2]);
      const txPower = parseFloat(opticalMatch[3]);
      
      // Find matching ONU and update power
      for (const [key, onu] of onuMap) {
        if (onu.onu_index === onuIndex) {
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
          break;
        }
      }
      continue;
    }
    
    // Parse MAC address
    const macMatch = trimmedLine.match(/(?:MAC|mac).*?([0-9a-fA-F]{2}[:-]?){5}[0-9a-fA-F]{2}/i);
    if (macMatch) {
      const macAddress = macMatch[0].match(/([0-9a-fA-F]{2}[:-]?){5}[0-9a-fA-F]{2}/i)?.[0];
      if (macAddress) {
        const lastKey = Array.from(onuMap.keys()).pop();
        if (lastKey && onuMap.get(lastKey)) {
          onuMap.get(lastKey).mac_address = macAddress;
        }
      }
    }
    
    // Parse description/name
    const nameMatch = trimmedLine.match(/(?:name|desc|description)\s*[:\s]\s*(.+)/i);
    if (nameMatch) {
      const lastKey = Array.from(onuMap.keys()).pop();
      if (lastKey && onuMap.get(lastKey)) {
        onuMap.get(lastKey).name = nameMatch[1].trim();
      }
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    if (!onu.serial_number) {
      onu.serial_number = `VSOL-${key.replace(/\//g, '-')}`;
    }
    onus.push(onu);
  }
  
  logger.debug(`VSOL parser found ${onus.length} ONUs`);
  return onus;
}
