import { logger } from '../../utils/logger.js';

/**
 * Parse VSOL OLT CLI output to extract ONU information
 * Supports VSOL EPON/GPON OLT series (V1600, V1601, V1602, etc.)
 * 
 * Primary format (from show run / show running-config):
 * interface epon 0/1
 * confirm onu mac 4c:ae:1c:69:cd:d0 onuid 1
 * confirm onu mac a2:7d:08:15:41:00 onuid 2
 * exit
 * 
 * Secondary formats (ONU status and optical power):
 * ONU 0/1:1 status: online rx:-21.5dBm tx:2.3dBm
 * epon 0/1 onu 1: online MAC:4c:ae:1c:69:cd:d0 RX:-22.1dBm TX:2.1dBm
 */
export function parseVSOLOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  logger.info(`VSOL parser processing ${lines.length} lines of output`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine || trimmedLine.length < 5) {
      continue;
    }
    
    // Skip command echoes and prompts
    if (trimmedLine.startsWith('epon-olt#') || 
        trimmedLine.startsWith('epon-olt>') ||
        trimmedLine.includes('% Unknown command')) {
      continue;
    }
    
    // Pattern 1: Interface EPON context line
    // "interface epon 0/1" or "interface epon 0/2"
    const interfaceMatch = trimmedLine.match(/^interface\s+epon\s+(\d+\/\d+)/i);
    if (interfaceMatch) {
      currentPonPort = interfaceMatch[1];
      logger.debug(`Detected PON port context: ${currentPonPort}`);
      continue;
    }
    
    // Pattern 2: Confirm ONU MAC format (PRIMARY PATTERN for VSOL)
    // "confirm onu mac 4c:ae:1c:69:cd:d0 onuid 1"
    // "confirm onu mac a2:7d:08:15:41:00 onuid 2"
    const confirmOnuMatch = trimmedLine.match(/confirm\s+onu\s+mac\s+([0-9a-fA-F:]{17})\s+onuid\s+(\d+)/i);
    if (confirmOnuMatch && currentPonPort) {
      const macAddress = confirmOnuMatch[1].toUpperCase();
      const onuIndex = parseInt(confirmOnuMatch[2]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      // All confirmed ONUs are considered online
      onuMap.set(key, {
        pon_port: currentPonPort,
        onu_index: onuIndex,
        status: 'online',
        serial_number: macAddress.replace(/:/g, ''),
        name: `ONU-${currentPonPort}:${onuIndex}`,
        rx_power: null,
        tx_power: null,
        mac_address: macAddress,
        router_name: null
      });
      
      logger.debug(`Parsed VSOL ONU: ${key} MAC=${macAddress}`);
      continue;
    }
    
    // Pattern 2b: Confirm ONU MAC without colons
    // "confirm onu mac 4cae1c69cdd0 onuid 1"
    const confirmOnuNocolonMatch = trimmedLine.match(/confirm\s+onu\s+mac\s+([0-9a-fA-F]{12})\s+onuid\s+(\d+)/i);
    if (confirmOnuNocolonMatch && currentPonPort) {
      const rawMac = confirmOnuNocolonMatch[1].toUpperCase();
      const macAddress = formatMac(rawMac);
      const onuIndex = parseInt(confirmOnuNocolonMatch[2]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: currentPonPort,
        onu_index: onuIndex,
        status: 'online',
        serial_number: rawMac,
        name: `ONU-${currentPonPort}:${onuIndex}`,
        rx_power: null,
        tx_power: null,
        mac_address: macAddress,
        router_name: null
      });
      
      logger.debug(`Parsed VSOL ONU (no colon): ${key} MAC=${macAddress}`);
      continue;
    }
    
    // Exit resets context
    if (trimmedLine === 'exit' || trimmedLine === '!') {
      // Don't reset PON port on exit - it might be followed by more interfaces
      continue;
    }
    
    // Pattern 3: EPON onu-information format
    // EPON0/1:1    00:11:22:33:44:55    Online    VSOL
    const eponInfoMatch = trimmedLine.match(/EPON(\d+\/\d+):(\d+)\s+([0-9A-Fa-f:]{12,17})\s+(\w+)(?:\s+\S+)?(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?/i);
    if (eponInfoMatch) {
      const ponPort = eponInfoMatch[1];
      const onuIndex = parseInt(eponInfoMatch[2]);
      const macAddress = formatMac(eponInfoMatch[3]);
      const status = parseStatus(eponInfoMatch[4]);
      const rxPower = eponInfoMatch[5] ? parseFloat(eponInfoMatch[5]) : null;
      const txPower = eponInfoMatch[6] ? parseFloat(eponInfoMatch[6]) : null;
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: macAddress.replace(/:/g, ''),
        name: `ONU-${ponPort}:${onuIndex}`,
        rx_power: rxPower,
        tx_power: txPower,
        mac_address: macAddress,
        router_name: null
      });
      continue;
    }
    
    // Pattern 4: Active ONU format  
    // 0/1:1  Online  00:11:22:33:44:55
    const activeOnuMatch = trimmedLine.match(/(\d+\/\d+):(\d+)\s+(\w+)\s+([0-9A-Fa-f:]{12,17})/i);
    if (activeOnuMatch) {
      const ponPort = activeOnuMatch[1];
      const onuIndex = parseInt(activeOnuMatch[2]);
      const status = parseStatus(activeOnuMatch[3]);
      const macAddress = formatMac(activeOnuMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      onuMap.set(key, {
        pon_port: ponPort,
        onu_index: onuIndex,
        status: status,
        serial_number: macAddress.replace(/:/g, ''),
        name: `ONU-${ponPort}:${onuIndex}`,
        rx_power: null,
        tx_power: null,
        mac_address: macAddress,
        router_name: null
      });
      continue;
    }
    
    // Pattern 5: ONU status format
    // onu 1 is online/offline
    const onuStatusMatch = trimmedLine.match(/onu\s+(\d+)\s+(?:is\s+)?(\w+)/i);
    if (onuStatusMatch && currentPonPort) {
      const onuIndex = parseInt(onuStatusMatch[1]);
      const status = parseStatus(onuStatusMatch[2]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      // Update existing ONU status
      if (onuMap.has(key)) {
        onuMap.get(key).status = status;
      }
      continue;
    }
    
    // Pattern 6: Optical power diagnostics
    // EPON0/1:1  -21.5  2.1  OK
    const opticalDiagMatch = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+)\s+([-\d.]+)\s+([-\d.]+)/i);
    if (opticalDiagMatch) {
      const ponPort = opticalDiagMatch[1];
      const onuIndex = parseInt(opticalDiagMatch[2]);
      const rxPower = parseFloat(opticalDiagMatch[3]);
      const txPower = parseFloat(opticalDiagMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        onu.rx_power = rxPower;
        onu.tx_power = txPower;
      }
      continue;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    onus.push(onu);
  }
  
  logger.info(`VSOL parser found ${onus.length} ONUs from ${lines.length} lines`);
  
  if (onus.length > 0 && onus.length <= 5) {
    logger.debug(`Parsed ONUs: ${JSON.stringify(onus)}`);
  } else if (onus.length > 5) {
    logger.debug(`Sample ONUs (first 3): ${JSON.stringify(onus.slice(0, 3))}`);
  }
  
  return onus;
}

/**
 * Parse ONU status string to standard status
 */
function parseStatus(statusStr) {
  if (!statusStr) return 'unknown';
  
  const status = statusStr.toLowerCase().trim();
  
  if (status === 'online' || status === 'up' || status === 'active' || status === 'working') {
    return 'online';
  }
  if (status === 'offline' || status === 'down' || status === 'inactive' || status === 'los' || status === 'losi') {
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
