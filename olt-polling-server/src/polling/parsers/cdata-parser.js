import { logger } from '../../utils/logger.js';

/**
 * Parse CDATA OLT output
 * CDATA FD series OLTs
 */
export function parseCDATAOutput(output) {
  const onus = [];
  
  try {
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and headers
      if (!line.trim() || line.includes('---') || line.includes('===')) {
        continue;
      }
      
      // Match CDATA ONU entries
      // Format: PON Port | ONU ID | Serial | Status | RX Power (dBm) | TX Power (dBm)
      // Example: 1/1/1 | 1 | CDTA12345678 | Online | -18.50 | 2.30
      const onuMatch = line.match(/(\d+\/\d+\/\d+)\s*\|\s*(\d+)\s*\|\s*(\S+)\s*\|\s*(Online|Offline|LOS)\s*\|\s*([-\d.]+)?\s*\|\s*([-\d.]+)?/i);
      
      if (onuMatch) {
        const [, ponPort, index, serial, status, rxPower, txPower] = onuMatch;
        
        onus.push({
          onu_index: parseInt(index, 10),
          pon_port: `pon-${ponPort}`,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: rxPower ? parseFloat(rxPower) : null,
          tx_power: txPower ? parseFloat(txPower) : null,
          mac_address: null
        });
        continue;
      }
      
      // Alternative table format
      // ONU   PON      SN              Status    RxPower
      const altMatch = line.match(/^\s*(\d+)\s+(\d+\/\d+\/\d+)\s+(\S+)\s+(online|offline|los)\s+([-\d.]+)?/i);
      
      if (altMatch) {
        const [, index, ponPort, serial, status, rxPower] = altMatch;
        
        onus.push({
          onu_index: parseInt(index, 10),
          pon_port: `pon-${ponPort}`,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'online' ? 'online' : 'offline',
          rx_power: rxPower ? parseFloat(rxPower) : null,
          tx_power: null,
          mac_address: null
        });
      }
      
      // CDATA show onu list format
      const listMatch = line.match(/onu\s+(\d+)\s+on\s+port\s+(\S+)\s+sn:\s*(\S+)\s+state:\s*(working|offline|los)/i);
      
      if (listMatch) {
        const [, index, ponPort, serial, status] = listMatch;
        
        onus.push({
          onu_index: parseInt(index, 10),
          pon_port: ponPort,
          serial_number: serial,
          name: `ONU-${serial}`,
          status: status.toLowerCase() === 'working' ? 'online' : 'offline',
          rx_power: null,
          tx_power: null,
          mac_address: null
        });
      }
    }
    
    logger.info(`CDATA Parser: Found ${onus.length} ONUs`);
  } catch (error) {
    logger.error('CDATA Parser error:', error);
  }
  
  return onus;
}
