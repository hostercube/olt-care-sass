import { logger } from '../../utils/logger.js';

/**
 * Parse ECOM OLT output
 * ECOM GPON OLTs
 */
export function parseECOMOutput(output) {
  const onus = [];
  
  try {
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and headers
      if (!line.trim() || line.includes('---') || line.includes('===') || line.includes('ONU ID')) {
        continue;
      }
      
      // Match ECOM ONU entries
      // Format: ONU ID | PON Port | Serial Number | Status | RX Power | TX Power
      // Example: 1 | 0/1/1 | ECOM12345678 | Online | -19.20 | 2.10
      const onuMatch = line.match(/(\d+)\s*\|\s*(\d+\/\d+\/\d+)\s*\|\s*(\S+)\s*\|\s*(Online|Offline|Inactive)\s*\|\s*([-\d.]+)?\s*\|\s*([-\d.]+)?/i);
      
      if (onuMatch) {
        const [, index, ponPort, serial, status, rxPower, txPower] = onuMatch;
        
        onus.push({
          onu_index: parseInt(index, 10),
          pon_port: `gpon-${ponPort}`,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: rxPower ? parseFloat(rxPower) : null,
          tx_power: txPower ? parseFloat(txPower) : null,
          mac_address: null
        });
        continue;
      }
      
      // Space-separated format
      // 1   0/1/1   ECOM12345678   Online   -19.20   2.10
      const spaceMatch = line.match(/^\s*(\d+)\s+(\d+\/\d+\/\d+)\s+(\S+)\s+(online|offline|inactive)\s+([-\d.]+)?\s*([-\d.]+)?/i);
      
      if (spaceMatch) {
        const [, index, ponPort, serial, status, rxPower, txPower] = spaceMatch;
        
        onus.push({
          onu_index: parseInt(index, 10),
          pon_port: `gpon-${ponPort}`,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: rxPower ? parseFloat(rxPower) : null,
          tx_power: txPower ? parseFloat(txPower) : null,
          mac_address: null
        });
        continue;
      }
      
      // Alternative format: gpon0/1:1 ECOM12345678 online -18.5dBm
      const altMatch = line.match(/(gpon\S+)\s+(\S+)\s+(online|offline)\s+([-\d.]+)?/i);
      
      if (altMatch) {
        const [, ponPort, serial, status, rxPower] = altMatch;
        
        onus.push({
          onu_index: onus.length + 1,
          pon_port: ponPort,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: rxPower ? parseFloat(rxPower) : null,
          tx_power: null,
          mac_address: null
        });
      }
    }
    
    logger.info(`ECOM Parser: Found ${onus.length} ONUs`);
  } catch (error) {
    logger.error('ECOM Parser error:', error);
  }
  
  return onus;
}
