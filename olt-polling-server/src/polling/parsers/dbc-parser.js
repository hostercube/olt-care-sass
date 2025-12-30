import { logger } from '../../utils/logger.js';

/**
 * Parse DBC OLT output
 * DBC OLTs use a format similar to ZTE/VSOL
 */
export function parseDBCOutput(output) {
  const onus = [];
  
  try {
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and headers
      if (!line.trim() || line.includes('---') || line.includes('===')) {
        continue;
      }
      
      // Match ONU entries - DBC format: ONU-ID | Port | SN | Status | RX Power
      // Example: 1 | gpon-olt0/0/1:1 | DBCG12345678 | online | -18.5
      const onuMatch = line.match(/(\d+)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(online|offline|inactive)\s*\|\s*([-\d.]+)?/i);
      
      if (onuMatch) {
        const [, index, ponPort, serial, status, rxPower] = onuMatch;
        
        onus.push({
          onu_index: parseInt(index, 10),
          pon_port: ponPort,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: rxPower ? parseFloat(rxPower) : null,
          tx_power: null,
          mac_address: null
        });
        continue;
      }
      
      // Alternative format: gpon-olt0/0/1:1 Status: online SN: DBCG12345678
      const altMatch = line.match(/(gpon[^\s]+)\s+Status:\s*(online|offline|inactive)\s+SN:\s*(\S+)/i);
      
      if (altMatch) {
        const [, ponPort, status, serial] = altMatch;
        
        onus.push({
          onu_index: onus.length + 1,
          pon_port: ponPort,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: null,
          tx_power: null,
          mac_address: null
        });
      }
    }
    
    logger.info(`DBC Parser: Found ${onus.length} ONUs`);
  } catch (error) {
    logger.error('DBC Parser error:', error);
  }
  
  return onus;
}
