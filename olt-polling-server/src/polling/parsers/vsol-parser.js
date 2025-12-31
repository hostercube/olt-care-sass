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
 * Optical power format (from show onu opm-diag all):
 * Various formats depending on firmware version
 * 
 * ONU status comes from active/inactive ONU lists
 */
export function parseVSOLOutput(output) {
  const onus = [];
  const lines = output.split('\n');
  
  const onuMap = new Map();
  let currentPonPort = null;
  
  // Store inactive ONUs to mark as offline later
  const inactiveONUs = new Set();
  const opmDiagData = new Map(); // Store optical power data
  
  logger.info(`VSOL parser processing ${lines.length} lines of output`);
  
  // Detect GPON vs EPON mode
  let isGpon = false;
  let detectedCommands = [];
  
  // First pass: collect all data
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine || trimmedLine.length < 5) {
      continue;
    }
    
    // Detect mode from prompts
    if (trimmedLine.toLowerCase().includes('gpon-olt') || trimmedLine.toLowerCase().includes('gpon_olt')) {
      isGpon = true;
    }
    
    // Capture available commands from help output
    if (trimmedLine.startsWith('show ') && !trimmedLine.includes('%') && !trimmedLine.includes('Unknown')) {
      detectedCommands.push(trimmedLine);
    }
    
    // Skip command echoes and prompts
    if (trimmedLine.startsWith('epon-olt#') || 
        trimmedLine.startsWith('epon-olt>') ||
        trimmedLine.startsWith('epon-olt(config)#') ||
        trimmedLine.startsWith('gpon-olt#') ||
        trimmedLine.startsWith('gpon-olt>') ||
        trimmedLine.startsWith('gpon-olt(config)#') ||
        trimmedLine.includes('% Unknown command') ||
        trimmedLine.includes('% Incomplete command') ||
        trimmedLine.startsWith('Building configuration')) {
      continue;
    }
    
    // Pattern 1: Interface EPON/GPON context line
    // "interface epon 0/1" or "interface gpon 0/1"
    const interfaceMatch = trimmedLine.match(/^interface\s+(?:epon|gpon)\s+(\d+\/\d+)/i);
    if (interfaceMatch) {
      currentPonPort = interfaceMatch[1];
      logger.debug(`Detected PON port context: ${currentPonPort}`);
      continue;
    }
    
    // Pattern 1b: Interface in config-pon context
    // "config-pon-0/1" prompt or "config-gpon-0/1"
    const ponContextMatch = trimmedLine.match(/config-(?:pon|gpon|epon)-(\d+\/\d+)/i);
    if (ponContextMatch) {
      currentPonPort = ponContextMatch[1];
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
      
      // Assume online unless marked inactive later
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
      continue;
    }
    
    // Pattern 3: GPON optical-info output (from: show gpon onu optical-info interface gpon 0/X)
    // Typical GPON format:
    // ONU-ID  Serial-Number     Rx-Power(dBm)  Tx-Power(dBm)  Temperature  Voltage
    // 1       VSOL12345678      -20.5          2.3            45           3.3
    // or: 1  GPON12345678  -21.2dBm  2.1dBm  Online
    // or: ONU 1: Rx=-20.5dBm Tx=2.3dBm Status=Online
    const gponOpticalMatch = trimmedLine.match(/^\s*(\d+)\s+([A-Z0-9]{8,16})\s+([-\d.]+)\s*(?:dBm)?\s+([-\d.]+)/i);
    if (gponOpticalMatch && currentPonPort) {
      const onuIndex = parseInt(gponOpticalMatch[1]);
      const serialNumber = gponOpticalMatch[2].toUpperCase();
      const rxPower = parseFloat(gponOpticalMatch[3]);
      const txPower = parseFloat(gponOpticalMatch[4]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      // Valid optical power range check
      if (rxPower < 0 && rxPower > -50) {
        opmDiagData.set(key, { rxPower, txPower, serialNumber });
        
        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
          if (!onu.serial_number) onu.serial_number = serialNumber;
        } else {
          onuMap.set(key, {
            pon_port: currentPonPort,
            onu_index: onuIndex,
            status: 'online',
            serial_number: serialNumber,
            name: `ONU-${currentPonPort}:${onuIndex}`,
            rx_power: rxPower,
            tx_power: txPower,
            mac_address: null,
            router_name: null
          });
        }
        logger.debug(`GPON optical parsed: ${key} SN=${serialNumber} RX=${rxPower} TX=${txPower}`);
      }
      continue;
    }
    
    // Pattern 3b: GPON optical with ONU prefix
    // ONU 1: Rx Power = -20.5 dBm, Tx Power = 2.3 dBm
    const gponOpticalMatch2 = trimmedLine.match(/ONU\s*(\d+).*?(?:Rx|RX).*?([-\d.]+)\s*dBm.*?(?:Tx|TX).*?([-\d.]+)\s*dBm/i);
    if (gponOpticalMatch2 && currentPonPort) {
      const onuIndex = parseInt(gponOpticalMatch2[1]);
      const rxPower = parseFloat(gponOpticalMatch2[2]);
      const txPower = parseFloat(gponOpticalMatch2[3]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      if (rxPower < 0 && rxPower > -50) {
        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
        }
        opmDiagData.set(key, { rxPower, txPower });
      }
      continue;
    }
    
    // Pattern 3c: Detect PON port from "show gpon onu optical-info interface gpon 0/X" command echo
    const gponInterfaceMatch = trimmedLine.match(/show\s+gpon\s+onu\s+(?:optical-info|state|info)\s+interface\s+gpon\s+(\d+\/\d+)/i);
    if (gponInterfaceMatch) {
      currentPonPort = gponInterfaceMatch[1];
      logger.debug(`Detected GPON interface context: ${currentPonPort}`);
      continue;
    }
    
    // Pattern 3d: Detect EPON port from "show epon optical-transceiver-diagnosis epon 0/X" command echo
    const eponInterfaceMatch = trimmedLine.match(/show\s+epon\s+(?:optical-transceiver-diagnosis|onu-information)\s+(?:interface\s+)?epon\s+(\d+\/\d+)/i);
    if (eponInterfaceMatch) {
      currentPonPort = eponInterfaceMatch[1];
      logger.debug(`Detected EPON interface context: ${currentPonPort}`);
      continue;
    }
    
    // Pattern 3e: Detect PON port from "show onu X/Y optical-info" command echo
    const onuInterfaceMatch = trimmedLine.match(/show\s+onu\s+(\d+\/\d+)\s+optical-info/i);
    if (onuInterfaceMatch) {
      currentPonPort = onuInterfaceMatch[1];
      logger.debug(`Detected ONU interface context: ${currentPonPort}`);
      continue;
    }
    
    // Pattern 4: EPON show onu opm-diag all output
    // Format 1: EPON0/1:1   MAC:4c:ae:1c:69:cd:d0  RX:-20.5dBm  TX:2.3dBm  Status:Online
    // Format 2: 0/1:1  00:11:22:33:44:55  -20.5  2.3  Online
    // Format 3: Port  ONU-ID  MAC-Addr  Rx-Power  Tx-Power  Temperature  Voltage  Current
    // Format 4: 0/1   1       4c:ae:1c  -20.5     2.3       45.1         3.29     12.3
    // Format 5 (VSOL V1.0.2R seen in logs):
    // EPON0/1:2  43.5  3.29  12.00  1.96  -18.10
    // (Temperature, Voltage, Bias, TX(dBm), RX(dBm))

    // Pattern 4a: VSOL V1.0.2R power table format (TX then RX at end)
    const vsolPowerTableMatch = trimmedLine.match(/^(?:EPON)?(\d+\/\d+):(\d+)\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s*$/i);
    if (vsolPowerTableMatch) {
      const ponPort = vsolPowerTableMatch[1];
      const onuIndex = parseInt(vsolPowerTableMatch[2]);
      const txPower = parseFloat(vsolPowerTableMatch[3]);
      const rxPower = parseFloat(vsolPowerTableMatch[4]);
      const key = `${ponPort}:${onuIndex}`;

      // RX is normally negative, validate range
      if (rxPower < 0 && rxPower > -50) {
        opmDiagData.set(key, { rxPower, txPower });

        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
        }
        logger.debug(`VSOL power table parsed: ${key} RX=${rxPower} TX=${txPower}`);
      }
      continue;
    }

    const opmDiagMatch1 = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+)\s+(?:MAC:)?([0-9A-Fa-f:.-]{12,17})?\s*(?:RX:)?([-\d.]+)\s*(?:dBm)?\s+(?:TX:)?([-\d.]+)\s*(?:dBm)?/i);
    if (opmDiagMatch1) {
      const ponPort = opmDiagMatch1[1];
      const onuIndex = parseInt(opmDiagMatch1[2]);
      const macAddress = opmDiagMatch1[3] ? formatMac(opmDiagMatch1[3]) : null;
      const rxPower = parseFloat(opmDiagMatch1[4]);
      const txPower = parseFloat(opmDiagMatch1[5]);
      const key = `${ponPort}:${onuIndex}`;

      // Store optical power data for later merge
      if (rxPower < 0 && rxPower > -50) {
        opmDiagData.set(key, { rxPower, txPower, macAddress });

        // Update or create ONU
        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
          if (macAddress) onu.mac_address = macAddress;
        } else if (macAddress) {
          onuMap.set(key, {
            pon_port: ponPort,
            onu_index: onuIndex,
            status: 'online',
            serial_number: macAddress.replace(/:/g, ''),
            name: `ONU-${ponPort}:${onuIndex}`,
            rx_power: rxPower,
            tx_power: txPower,
            mac_address: macAddress,
            router_name: null
          });
        }
        logger.debug(`OPM diag parsed: ${key} RX=${rxPower} TX=${txPower}`);
      }
      continue;
    }

    // Pattern 4b: Table format with separate columns
    // 0/1   1   4c:ae:1c:69:cd:d0   -21.5   2.1   45.2   3.3   OK
    const opmTableMatch2 = trimmedLine.match(/^(\d+\/\d+)\s+(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+([-\d.]+)\s+([-\d.]+)/i);
    if (opmTableMatch2) {
      const ponPort = opmTableMatch2[1];
      const onuIndex = parseInt(opmTableMatch2[2]);
      const macAddress = formatMac(opmTableMatch2[3]);
      const rxPower = parseFloat(opmTableMatch2[4]);
      const txPower = parseFloat(opmTableMatch2[5]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (rxPower < 0 && rxPower > -50) {
        opmDiagData.set(key, { rxPower, txPower, macAddress });
        
        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
          if (macAddress) onu.mac_address = macAddress;
        }
        logger.debug(`OPM table parsed: ${key} MAC=${macAddress} RX=${rxPower} TX=${txPower}`);
      }
      continue;
    }
    
    // Pattern 4: Alternative opm-diag format with table
    // Port   ONU-ID  MAC-Address        RX-Power  TX-Power  Status
    // 0/1    1       4c:ae:1c:69:cd:d0  -20.5     2.3       Online
    const opmTableMatch = trimmedLine.match(/^(\d+\/\d+)\s+(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+([-\d.]+)\s+([-\d.]+)\s+(\w+)/i);
    if (opmTableMatch) {
      const ponPort = opmTableMatch[1];
      const onuIndex = parseInt(opmTableMatch[2]);
      const macAddress = formatMac(opmTableMatch[3]);
      const rxPower = parseFloat(opmTableMatch[4]);
      const txPower = parseFloat(opmTableMatch[5]);
      const status = parseStatus(opmTableMatch[6]);
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
    
    // Pattern 5: EPON onu-information format
    // EPON0/1:1    00:11:22:33:44:55    Online    VSOL
    const eponInfoMatch = trimmedLine.match(/EPON(\d+\/\d+):(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+(\w+)/i);
    if (eponInfoMatch) {
      const ponPort = eponInfoMatch[1];
      const onuIndex = parseInt(eponInfoMatch[2]);
      const macAddress = formatMac(eponInfoMatch[3]);
      const status = parseStatus(eponInfoMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        onu.status = status;
        if (!onu.mac_address) onu.mac_address = macAddress;
      } else {
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
      }
      continue;
    }
    
    // Pattern 6: Active ONU format  
    // 0/1:1  Online  00:11:22:33:44:55
    const activeOnuMatch = trimmedLine.match(/(\d+\/\d+):(\d+)\s+(Online|Offline|Active|Inactive|Deactive|LOS)\s+([0-9A-Fa-f:.-]{12,17})/i);
    if (activeOnuMatch) {
      const ponPort = activeOnuMatch[1];
      const onuIndex = parseInt(activeOnuMatch[2]);
      const status = parseStatus(activeOnuMatch[3]);
      const macAddress = formatMac(activeOnuMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        onuMap.get(key).status = status;
      } else {
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
      }
      continue;
    }
    
    // Pattern 7: ONU status format
    // onu 1 is online/offline
    const onuStatusMatch = trimmedLine.match(/onu\s+(\d+)\s+(?:is\s+)?(\w+)/i);
    if (onuStatusMatch && currentPonPort) {
      const onuIndex = parseInt(onuStatusMatch[1]);
      const status = parseStatus(onuStatusMatch[2]);
      const key = `${currentPonPort}:${onuIndex}`;
      
      if (onuMap.has(key)) {
        onuMap.get(key).status = status;
      }
      continue;
    }
    
    // Pattern 8: Inactive ONU list format
    // Inactive ONU: EPON0/1:1, EPON0/2:3
    // or: 0/1:1 Deactive 4c:ae:1c:69:cd:d0
    const inactiveMatch = trimmedLine.match(/(?:Inactive|Deactive|Offline|LOS).*?(\d+\/\d+):(\d+)/gi);
    if (inactiveMatch) {
      for (const match of inactiveMatch) {
        const parts = match.match(/(\d+\/\d+):(\d+)/);
        if (parts) {
          inactiveONUs.add(`${parts[1]}:${parts[2]}`);
        }
      }
    }
    
    // Pattern 9: Simple inactive format
    if (trimmedLine.toLowerCase().includes('deactive') || 
        trimmedLine.toLowerCase().includes('inactive') ||
        trimmedLine.toLowerCase().includes('offline') ||
        trimmedLine.toLowerCase().includes('los')) {
      const simpleMatch = trimmedLine.match(/(\d+\/\d+):(\d+)/);
      if (simpleMatch) {
        inactiveONUs.add(`${simpleMatch[1]}:${simpleMatch[2]}`);
      }
    }
    
    // Pattern 10: Optical power only format
    // EPON0/1:1  -21.5  2.1  OK
    const opticalDiagMatch = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+)\s+([-\d.]+)\s+([-\d.]+)/i);
    if (opticalDiagMatch && !opmDiagMatch1) {
      const ponPort = opticalDiagMatch[1];
      const onuIndex = parseInt(opticalDiagMatch[2]);
      const rxPower = parseFloat(opticalDiagMatch[3]);
      const txPower = parseFloat(opticalDiagMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      // Only update if this looks like valid power readings
      if (rxPower < 0 && rxPower > -50 && txPower > -10 && txPower < 10) {
        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
        }
      }
      continue;
    }
  }
  
  // Second pass: Mark inactive ONUs as offline
  for (const key of inactiveONUs) {
    if (onuMap.has(key)) {
      onuMap.get(key).status = 'offline';
    }
  }
  
  // Third pass: Merge optical power data
  for (const [key, data] of opmDiagData) {
    if (onuMap.has(key)) {
      const onu = onuMap.get(key);
      if (data.rxPower !== null) onu.rx_power = data.rxPower;
      if (data.txPower !== null) onu.tx_power = data.txPower;
      if (data.macAddress && !onu.mac_address) onu.mac_address = data.macAddress;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    onus.push(onu);
  }
  
  logger.info(`VSOL parser found ${onus.length} ONUs from ${lines.length} lines (mode: ${isGpon ? 'GPON' : 'EPON'})`);
  logger.info(`VSOL parser: ${inactiveONUs.size} ONUs marked as offline, ${opmDiagData.size} with optical data`);
  if (detectedCommands.length > 0) {
    logger.info(`VSOL detected available commands: ${detectedCommands.slice(0, 5).join(', ')}`);
  }
  
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
