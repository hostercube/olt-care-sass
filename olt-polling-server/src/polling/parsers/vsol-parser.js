import { logger } from '../../utils/logger.js';

// MAC Vendor Database - common router/ONU vendors
const MAC_VENDOR_DB = {
  '4C:F9': 'HWTC',
  '4C:AE': 'XPON',
  'A2:7D': 'XPON',
  'A2:4F': 'XDBC',
  'A2:6E': 'HWTC',
  'A2:4E': 'XDBC',
  'B4:64': 'VSOL',
  '6C:68': 'VSOL',
  '4C:D7': 'VSOL',
  '3C:F8': 'HWTC',
  'C8:3A': 'HWTC',
  '60:32:B1': 'TP-Link',
  '00:0C:29': 'VMware',
  'E4:5F:01': 'Raspberry Pi',
  'DC:A6:32': 'Raspberry Pi',
  'B8:27:EB': 'Raspberry Pi',
  '00:E0:4C': 'Realtek',
  '2C:F0:5D': 'Comfast',
  '80:89:17': 'TP-Link',
  '50:C7:BF': 'TP-Link',
  'E8:94:F6': 'TP-Link',
  'C0:E4:22': 'TP-Link',
  '14:CC:20': 'TP-Link',
  '30:B5:C2': 'TP-Link',
  '7C:8B:CA': 'TP-Link',
  '08:10:79': 'Tenda',
  'C8:3A:35': 'Tenda',
  '00:27:22': 'Ubiquiti',
  '68:72:51': 'Ubiquiti',
  '80:2A:A8': 'Ubiquiti',
  '24:5A:4C': 'Ubiquiti',
  'F4:92:BF': 'Ubiquiti',
  'DC:9F:DB': 'Ubiquiti',
  'FC:EC:DA': 'Ubiquiti',
  '44:D9:E7': 'Ubiquiti',
  '74:83:C2': 'Ubiquiti',
  '04:18:D6': 'Ubiquiti',
  '00:15:6D': 'Ubiquiti',
  '18:E8:29': 'Xiaomi',
  '64:09:80': 'Xiaomi',
  '58:44:98': 'Xiaomi',
  '28:6C:07': 'Xiaomi',
  '64:64:4A': 'Huawei',
  '00:18:82': 'Huawei',
  '48:46:FB': 'Huawei',
  '70:7B:E8': 'Huawei',
  'E4:F3:F5': 'Huawei',
  '9C:28:EF': 'Huawei',
  '00:E0:FC': 'Huawei',
  '88:28:B3': 'Huawei',
  '28:31:52': 'Huawei',
  'A4:4B:D5': 'Xiaomi',
  '34:CE:00': 'Xiaomi',
  'AC:C1:EE': 'Xiaomi',
  '78:11:DC': 'Xiaomi',
  'F8:A7:63': 'Xiaomi',
  'D4:9A:20': 'Xiaomi',
  'D8:B0:4C': 'Xiaomi',
  '04:CF:8C': 'Xiaomi',
  '98:FA:E3': 'Xiaomi',
  '00:9A:CD': 'Huawei',
  '24:44:27': 'Huawei',
  '20:A6:CD': 'Huawei',
  'C8:D1:5E': 'Huawei',
  '88:53:95': 'Huawei',
  '00:E0:1E': 'Cisco',
  '3C:5A:B4': 'D-Link',
  '1C:7E:E5': 'D-Link',
  '84:C9:B2': 'D-Link',
  'BC:0F:9A': 'D-Link',
  'F4:EC:38': 'TP-Link',
  '98:DA:C4': 'TP-Link',
  'C4:E9:84': 'TP-Link',
  'AC:84:C6': 'TP-Link',
  'B0:BE:76': 'TP-Link',
  'B0:4E:26': 'TP-Link',
  '20:0D:B0': 'Shenzhen',
  '00:1E:58': 'D-Link',
  '1C:BD:B9': 'D-Link',
  '28:10:7B': 'D-Link',
  '5C:D9:98': 'D-Link',
  '78:54:2E': 'D-Link',
  'F0:B4:D2': 'D-Link',
  '10:62:EB': 'D-Link',
  'CC:B2:55': 'D-Link',
  'AC:F1:DF': 'D-Link',
};

/**
 * Get vendor name from MAC address
 */
export function getMacVendor(mac) {
  if (!mac) return null;
  const normalized = formatMac(mac);
  if (!normalized) return null;
  
  // Try 3-octet prefix first (more specific)
  const prefix3 = normalized.substring(0, 11).toUpperCase();
  if (MAC_VENDOR_DB[prefix3]) return MAC_VENDOR_DB[prefix3];
  
  // Try 2-octet prefix
  const prefix2 = normalized.substring(0, 5).toUpperCase();
  if (MAC_VENDOR_DB[prefix2]) return MAC_VENDOR_DB[prefix2];
  
  return null;
}

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
  const deregisterData = new Map(); // Store offline reasons
  const distanceData = new Map(); // Store distance info
  const lastRegisterData = new Map(); // Store last register time
  const lastDeregisterData = new Map(); // Store last deregister time
  const aliveTimeData = new Map(); // Store alive/uptime
  const vendorData = new Map(); // Store Vendor ID, Model ID, HW/SW versions
  
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
    
    // Pattern 0: ONU Description / Name from running config
    // "onu description CUSTOMER_NAME"
    // "onu 1 description Customer ABC"
    // "onu name ONU-ABC-123"
    const onuDescMatch = trimmedLine.match(/onu\s+(?:(\d+)\s+)?(?:description|name)\s+(.+)/i);
    if (onuDescMatch && currentPonPort) {
      const onuIdx = onuDescMatch[1] ? parseInt(onuDescMatch[1]) : null;
      const onuName = onuDescMatch[2].trim().replace(/["']/g, '');
      if (onuIdx !== null) {
        const key = `${currentPonPort}:${onuIdx}`;
        if (onuMap.has(key)) {
          onuMap.get(key).name = onuName;
          logger.debug(`ONU name from description: ${key} -> ${onuName}`);
        }
      }
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

    // Pattern 4a: VSOL V1.0.2R power table format WITH TEMPERATURE (first column is temp)
    // Format: EPON0/1:2  43.5  3.29  12.00  1.96  -18.10
    // Columns: Port:ONU  Temperature  Voltage  Bias  TX(dBm)  RX(dBm)
    const vsolPowerTableMatch = trimmedLine.match(/^(?:EPON)?(\d+\/\d+):(\d+)\s+([\d.]+)\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s*$/i);
    if (vsolPowerTableMatch) {
      const ponPort = vsolPowerTableMatch[1];
      const onuIndex = parseInt(vsolPowerTableMatch[2]);
      const temperature = parseFloat(vsolPowerTableMatch[3]); // First value is temperature
      const txPower = parseFloat(vsolPowerTableMatch[4]);
      const rxPower = parseFloat(vsolPowerTableMatch[5]);
      const key = `${ponPort}:${onuIndex}`;

      // RX is normally negative, validate range
      if (rxPower < 0 && rxPower > -50) {
        opmDiagData.set(key, { rxPower, txPower, temperature });

        if (onuMap.has(key)) {
          const onu = onuMap.get(key);
          onu.rx_power = rxPower;
          onu.tx_power = txPower;
          onu.temperature = temperature;
        }
        logger.debug(`VSOL power table parsed: ${key} RX=${rxPower} TX=${txPower} Temp=${temperature}°C`);
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
    // OR: EPON0/1:1    00:11:22:33:44:55    Online    CustomerName   VSOL
    const eponInfoMatch = trimmedLine.match(/EPON(\d+\/\d+):(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+(Online|Offline|Active|Inactive|Deactive|LOS|Working)\s*(.*)/i);
    if (eponInfoMatch) {
      const ponPort = eponInfoMatch[1];
      const onuIndex = parseInt(eponInfoMatch[2]);
      const macAddress = formatMac(eponInfoMatch[3]);
      const status = parseStatus(eponInfoMatch[4]);
      const restOfLine = eponInfoMatch[5]?.trim() || '';
      const key = `${ponPort}:${onuIndex}`;
      
      // Try to extract ONU name from rest of line (skip model like VSOL, ONU-TYPE)
      let onuName = null;
      if (restOfLine.length > 0) {
        // Split by whitespace and look for something that's not just a model
        const parts = restOfLine.split(/\s+/);
        for (const part of parts) {
          if (part.length > 2 && !part.match(/^(VSOL|ONU|GPON|EPON|V\d+|HG\d+)$/i)) {
            onuName = part;
            break;
          }
        }
      }
      
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        onu.status = status;
        if (!onu.mac_address) onu.mac_address = macAddress;
        if (onuName && onu.name.startsWith('ONU-')) onu.name = onuName;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: status,
          serial_number: macAddress.replace(/:/g, ''),
          name: onuName || `ONU-${ponPort}:${onuIndex}`,
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
    
    // Pattern 11: Deregister log / Offline reason
    // Formats:
    // EPON0/1:2 2025-01-01 10:00:00 LOS (Loss of Signal)
    // 0/1:1 deregister reason: power-off
    // ONU 0/1:3 offline: fiber cut
    const deregisterMatch = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+).*?(?:deregister|offline|reason|LOS|power.?off|fiber.?cut|dying.?gasp)[:\s]*(.+)?/i);
    if (deregisterMatch) {
      const ponPort = deregisterMatch[1];
      const onuIndex = parseInt(deregisterMatch[2]);
      const key = `${ponPort}:${onuIndex}`;
      let reason = deregisterMatch[3]?.trim() || 'Unknown';
      
      // Clean up reason
      if (trimmedLine.toLowerCase().includes('los') || trimmedLine.toLowerCase().includes('loss of signal')) {
        reason = 'LOS (Loss of Signal)';
      } else if (trimmedLine.toLowerCase().includes('power-off') || trimmedLine.toLowerCase().includes('power off')) {
        reason = 'Power Off';
      } else if (trimmedLine.toLowerCase().includes('dying-gasp') || trimmedLine.toLowerCase().includes('dying gasp')) {
        reason = 'Dying Gasp (Power Loss)';
      } else if (trimmedLine.toLowerCase().includes('fiber') || trimmedLine.toLowerCase().includes('cut')) {
        reason = 'Fiber Cut';
      }
      
      deregisterData.set(key, reason);
      logger.debug(`Deregister log parsed: ${key} reason=${reason}`);
      continue;
    }
    
    // Pattern 12: Distance info
    // Formats:
    // EPON0/1:2  1234m
    // 0/1:1 distance: 2500 meters
    // ONU 1 Distance: 1.5km
    const distanceMatch = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+).*?(?:distance|dist)[:\s]*(\d+(?:\.\d+)?)\s*(?:m|km|meter)/i);
    if (distanceMatch) {
      const ponPort = distanceMatch[1];
      const onuIndex = parseInt(distanceMatch[2]);
      const key = `${ponPort}:${onuIndex}`;
      let distance = parseFloat(distanceMatch[3]);
      
      // Convert km to meters if needed
      if (trimmedLine.toLowerCase().includes('km')) {
        distance = distance * 1000;
      }
      
      distanceData.set(key, distance);
      logger.debug(`Distance parsed: ${key} distance=${distance}m`);
      continue;
    }
    
    // Pattern 12b: Simple distance table format
    // 0/1  1  2345
    const simpleDistMatch = trimmedLine.match(/^(\d+\/\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (simpleDistMatch && !opmDiagData.has(`${simpleDistMatch[1]}:${simpleDistMatch[2]}`)) {
      const ponPort = simpleDistMatch[1];
      const onuIndex = parseInt(simpleDistMatch[2]);
      const distance = parseFloat(simpleDistMatch[3]);
      const key = `${ponPort}:${onuIndex}`;
      
      // Only store if it looks like a reasonable distance (> 10m and < 100km)
      if (distance > 10 && distance < 100000) {
        distanceData.set(key, distance);
        logger.debug(`Simple distance parsed: ${key} distance=${distance}m`);
      }
      continue;
    }

    // Pattern 13: ONU Status table row from V-SOL web UI / CLI
    // Screenshot format: EPON0/3:1  Offline  a2:4d:12:05:04:90    0  0  2075/02/01 14:29:50  2075/02/01 14:29:51  Wire Down  00:00:02
    // Columns: ONU ID | Status | MAC Address | Description(empty) | Distance(m) | RTT(TQ) | Last Register Time | Last Deregister Time | Last Deregister Reason | Alive Time
    // Note: Description can be empty, Alive Time can be "00:00:02" or "5 06:10:57" (with days)
    
    // Try multiple patterns to handle different formats
    
    // Pattern 13a: Full format with optional description and alive time with/without days
    // EPON0/3:1  Offline  a2:4d:12:05:04:90    0  0  2075/02/01 14:29:50  2075/02/01 14:29:51  Wire Down  00:00:02
    // EPON0/3:13  Offline  00:d5:9e:e0:6e:e2    1051  737  2075/03/29 19:14:35  2075/03/31 00:47:12  Wire Down  1 05:32:37
    const onuStatusFullMatch = trimmedLine.match(/^(?:EPON)?(\d+\/\d+):(\d+)\s+(Online|Offline|Active|Inactive|LOS|Deactive)\s+([0-9a-fA-F:.-]{12,17})\s*(?:([^\d][^\s]*)\s+)?(\d+)\s+(\d+)\s+(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+([\w\s]+?)\s+(\d+(?:\s+\d{2}:\d{2}:\d{2})?|\d{2}:\d{2}:\d{2})\s*$/i);
    if (onuStatusFullMatch) {
      const ponPort = onuStatusFullMatch[1];
      const onuIndex = parseInt(onuStatusFullMatch[2]);
      const status = parseStatus(onuStatusFullMatch[3]);
      const macAddress = formatMac(onuStatusFullMatch[4]);
      const description = onuStatusFullMatch[5]?.trim() || null;
      const distance = parseInt(onuStatusFullMatch[6]);
      const rttTq = parseInt(onuStatusFullMatch[7]);
      const lastRegisterTime = onuStatusFullMatch[8].replace(/\//g, '-'); // Convert to ISO format
      const lastDeregisterTime = onuStatusFullMatch[9].replace(/\//g, '-');
      const deregisterReason = onuStatusFullMatch[10].trim();
      const aliveTime = onuStatusFullMatch[11].trim();
      const key = `${ponPort}:${onuIndex}`;
      
      // Update or create ONU entry
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        onu.status = status;
        if (!onu.mac_address) onu.mac_address = macAddress;
        if (description) onu.name = description;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: status,
          serial_number: macAddress.replace(/:/g, ''),
          name: description || `ONU-${ponPort}:${onuIndex}`,
          rx_power: null,
          tx_power: null,
          mac_address: macAddress,
          router_name: null
        });
      }
      
      distanceData.set(key, distance);
      lastRegisterData.set(key, lastRegisterTime);
      lastDeregisterData.set(key, lastDeregisterTime);
      deregisterData.set(key, deregisterReason);
      aliveTimeData.set(key, aliveTime);
      
      logger.debug(`ONU status row (full) parsed: ${key} status=${status} distance=${distance}m lastReg=${lastRegisterTime} deregReason=${deregisterReason} aliveTime=${aliveTime}`);
      continue;
    }

    // Pattern 13b: Simpler format for rows where some columns may be harder to parse
    // Just match the essential: EPON0/3:1  Offline  a2:4d:12:05:04:90  ... distance ... datetime datetime reason
    const onuStatusSimpleMatch = trimmedLine.match(/^(?:EPON)?(\d+\/\d+):(\d+)\s+(Online|Offline|Active|Inactive|LOS|Deactive)\s+([0-9a-fA-F:.-]{12,17})/i);
    if (onuStatusSimpleMatch) {
      const ponPort = onuStatusSimpleMatch[1];
      const onuIndex = parseInt(onuStatusSimpleMatch[2]);
      const status = parseStatus(onuStatusSimpleMatch[3]);
      const macAddress = formatMac(onuStatusSimpleMatch[4]);
      const key = `${ponPort}:${onuIndex}`;
      
      // Try to extract distance, times, and reason from rest of line
      const restOfLine = trimmedLine.substring(onuStatusSimpleMatch[0].length).trim();
      
      // Extract distance (first number after MAC)
      const distanceMatch = restOfLine.match(/^(?:\S*\s+)?(\d+)\s+\d+\s+/);
      if (distanceMatch) {
        const distance = parseInt(distanceMatch[1]);
        if (distance >= 0 && distance < 100000) {
          distanceData.set(key, distance);
        }
      }
      
      // Extract timestamps (YYYY/MM/DD HH:MM:SS format)
      const timeMatches = restOfLine.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/g);
      if (timeMatches && timeMatches.length >= 2) {
        lastRegisterData.set(key, timeMatches[0].replace(/\//g, '-'));
        lastDeregisterData.set(key, timeMatches[1].replace(/\//g, '-'));
      }
      
      // Extract deregister reason (after second timestamp, before alive time)
      const reasonMatch = restOfLine.match(/\d{2}:\d{2}:\d{2}\s+([\w\s]+?)\s+(?:\d+\s+)?\d{2}:\d{2}:\d{2}\s*$/);
      if (reasonMatch) {
        deregisterData.set(key, reasonMatch[1].trim());
      } else {
        // Try simpler reason extraction
        if (restOfLine.toLowerCase().includes('wire down')) {
          deregisterData.set(key, 'Wire Down');
        } else if (restOfLine.toLowerCase().includes('power off')) {
          deregisterData.set(key, 'Power Off');
        } else if (restOfLine.toLowerCase().includes('los')) {
          deregisterData.set(key, 'LOS');
        }
      }
      
      // Extract alive time (last time-like pattern)
      const aliveMatch = restOfLine.match(/(\d+\s+\d{2}:\d{2}:\d{2}|\d{2}:\d{2}:\d{2})\s*$/);
      if (aliveMatch) {
        aliveTimeData.set(key, aliveMatch[1].trim());
      }
      
      // Update or create ONU entry
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
      
      logger.debug(`ONU status row (simple) parsed: ${key} status=${status} MAC=${macAddress}`);
      continue;
    }

    // Pattern 14: ONU Basic table from V-SOL web UI
    // Format: EPON0/3:2  A2:7D:10:27:34:80         XPON  ONU  A27D10273480  2E2.A  V3R017C00S150
    // Columns: ONU ID  MAC Address  Description  Vendor ID  Model ID  MAC Address  Hardware Version  Software Version
    // Variant without Description column
    const onuBasicRowMatch = trimmedLine.match(/^(?:EPON)?(\d+\/\d+):(\d+)\s+([0-9a-fA-F:.-]{12,17})\s+(?:(\S+)\s+)?([A-Z0-9]{2,10})\s+([A-Z0-9]{2,10})\s+([0-9A-Fa-f]{12})\s+([^\s]+)\s+([^\s]+)\s*$/i);
    if (onuBasicRowMatch) {
      const ponPort = onuBasicRowMatch[1];
      const onuIndex = parseInt(onuBasicRowMatch[2]);
      const macAddress = formatMac(onuBasicRowMatch[3]);
      // onuBasicRowMatch[4] is description (optional)
      const vendorId = onuBasicRowMatch[5]?.toUpperCase() || null;
      const modelId = onuBasicRowMatch[6]?.toUpperCase() || null;
      // onuBasicRowMatch[7] is MAC without colons (duplicate)
      const hwVersion = onuBasicRowMatch[8] || null;
      const swVersion = onuBasicRowMatch[9] || null;
      const key = `${ponPort}:${onuIndex}`;
      
      vendorData.set(key, { vendorId, modelId, hwVersion, swVersion, macAddress });
      
      // Also update ONU entry if it exists
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        if (!onu.mac_address) onu.mac_address = macAddress;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: 'online', // Default to online if found in ONU Basic
          serial_number: macAddress.replace(/:/g, ''),
          name: `ONU-${ponPort}:${onuIndex}`,
          rx_power: null,
          tx_power: null,
          mac_address: macAddress,
          router_name: null
        });
      }
      
      logger.debug(`ONU Basic row parsed: ${key} vendor=${vendorId} model=${modelId} HW=${hwVersion} SW=${swVersion}`);
      continue;
    }

    // Pattern 14b: Simpler ONU Basic format (no description column)
    // EPON0/3:3  B4:64:15:2F:58:46  VSOL  V711  B464152F5846  V4.2  V1.0.00-241216
    const onuBasicSimpleMatch = trimmedLine.match(/^(?:EPON)?(\d+\/\d+):(\d+)\s+([0-9a-fA-F:.-]{12,17})\s+([A-Z0-9]{2,10})\s+([A-Z0-9]{2,10})\s+([0-9A-Fa-f]{12})\s+([^\s]+)\s+([^\s]+)\s*$/i);
    if (onuBasicSimpleMatch) {
      const ponPort = onuBasicSimpleMatch[1];
      const onuIndex = parseInt(onuBasicSimpleMatch[2]);
      const macAddress = formatMac(onuBasicSimpleMatch[3]);
      const vendorId = onuBasicSimpleMatch[4]?.toUpperCase() || null;
      const modelId = onuBasicSimpleMatch[5]?.toUpperCase() || null;
      const hwVersion = onuBasicSimpleMatch[7] || null;
      const swVersion = onuBasicSimpleMatch[8] || null;
      const key = `${ponPort}:${onuIndex}`;
      
      vendorData.set(key, { vendorId, modelId, hwVersion, swVersion, macAddress });
      
      if (onuMap.has(key)) {
        const onu = onuMap.get(key);
        if (!onu.mac_address) onu.mac_address = macAddress;
      } else {
        onuMap.set(key, {
          pon_port: ponPort,
          onu_index: onuIndex,
          status: 'online',
          serial_number: macAddress.replace(/:/g, ''),
          name: `ONU-${ponPort}:${onuIndex}`,
          rx_power: null,
          tx_power: null,
          mac_address: macAddress,
          router_name: null
        });
      }
      
      logger.debug(`ONU Basic (simple) row parsed: ${key} vendor=${vendorId} model=${modelId}`);
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
      if (data.temperature !== null && data.temperature !== undefined) onu.temperature = data.temperature;
      if (data.macAddress && !onu.mac_address) onu.mac_address = data.macAddress;
    }
  }
  
  // Fourth pass: Merge deregister/offline reason data
  for (const [key, reason] of deregisterData) {
    if (onuMap.has(key)) {
      const onu = onuMap.get(key);
      onu.offline_reason = reason;
      // If we have a deregister reason, the ONU is likely offline
      if (!onu.status || onu.status === 'unknown') {
        onu.status = 'offline';
      }
    }
  }
  
  // Fifth pass: Merge distance data
  for (const [key, distance] of distanceData) {
    if (onuMap.has(key)) {
      onuMap.get(key).distance = distance;
    }
  }

  // Sixth pass: Merge last register/deregister time data
  for (const [key, lastRegister] of lastRegisterData) {
    if (onuMap.has(key)) {
      onuMap.get(key).last_register_time = lastRegister;
    }
  }
  for (const [key, lastDeregister] of lastDeregisterData) {
    if (onuMap.has(key)) {
      onuMap.get(key).last_deregister_time = lastDeregister;
    }
  }

  // Seventh pass: Merge alive time data
  for (const [key, aliveTime] of aliveTimeData) {
    if (onuMap.has(key)) {
      onuMap.get(key).alive_time = aliveTime;
    }
  }
  
  // Eighth pass: Merge vendor/model data (ONU Basic page)
  for (const [key, data] of vendorData) {
    if (onuMap.has(key)) {
      const onu = onuMap.get(key);
      if (data.vendorId) onu.vendor_id = data.vendorId;
      if (data.modelId) onu.model_id = data.modelId;
      if (data.hwVersion) onu.hardware_version = data.hwVersion;
      if (data.swVersion) onu.software_version = data.swVersion;
      if (data.macAddress && !onu.mac_address) onu.mac_address = data.macAddress;
    }
  }
  
  // Convert map to array
  for (const [key, onu] of onuMap) {
    // Set ONU name based on Vendor ID if available
    if (onu.vendor_id && onu.name.startsWith('ONU-')) {
      onu.name = `${onu.vendor_id}-${onu.model_id || 'ONU'}`;
    }
    onus.push(onu);
  }
  
  logger.info(`VSOL parser found ${onus.length} ONUs from ${lines.length} lines (mode: ${isGpon ? 'GPON' : 'EPON'})`);
  logger.info(`VSOL parser: ${inactiveONUs.size} ONUs marked as offline, ${opmDiagData.size} with optical data, ${lastRegisterData.size} with register times`);
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
 * Parse MAC table output from VSOL OLT
 * This shows which MAC addresses are seen on each PON port + ONU index
 * 
 * Formats:
 * show mac address-table
 * VLAN  MAC Address        Type      Port      ONU-ID
 * 100   00:11:22:33:44:55  Dynamic   EPON0/1   1
 * 
 * show epon mac-address interface epon 0/1
 * ONU-ID  VLAN  MAC-Address        Type
 * 1       100   00:11:22:33:44:55  Dynamic
 * 
 * @returns {Array} Array of { pon_port, onu_index, mac_address, vlan }
 */
export function parseVSOLMacTable(output) {
  const macTable = [];
  const lines = output.split('\n');
  let currentPonPort = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 10) continue;
    
    // Detect PON port context from command echo
    // "show epon mac-address interface epon 0/1"
    const interfaceMatch = trimmedLine.match(/(?:show\s+epon\s+mac-address\s+interface\s+epon|interface\s+epon)\s+(\d+\/\d+)/i);
    if (interfaceMatch) {
      currentPonPort = interfaceMatch[1];
      continue;
    }
    
    // Pattern 1: Full format with Port column
    // VLAN  MAC Address        Type      Port      ONU-ID
    // 100   00:11:22:33:44:55  Dynamic   EPON0/1   1
    const fullMatch = trimmedLine.match(/(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+\w+\s+(?:EPON)?(\d+\/\d+)\s+(\d+)/i);
    if (fullMatch) {
      macTable.push({
        vlan: parseInt(fullMatch[1]),
        mac_address: formatMac(fullMatch[2]),
        pon_port: fullMatch[3],
        onu_index: parseInt(fullMatch[4]),
      });
      continue;
    }

    // Pattern 1b (VSOL Web UI / some firmware): Port column includes ONU index
    // 104  60:32:B1:0B:48:97  Dynamic  EPON0/4:1
    const fullMatchWithIndexInPort = trimmedLine.match(/(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+\w+\s+(?:EPON)?(\d+\/\d+):(\d+)/i);
    if (fullMatchWithIndexInPort) {
      macTable.push({
        vlan: parseInt(fullMatchWithIndexInPort[1]),
        mac_address: formatMac(fullMatchWithIndexInPort[2]),
        pon_port: fullMatchWithIndexInPort[3],
        onu_index: parseInt(fullMatchWithIndexInPort[4]),
      });
      continue;
    }

    // Pattern 2: Format with ONU-ID first (in interface context)
    // ONU-ID  VLAN  MAC-Address        Type
    // 1       100   00:11:22:33:44:55  Dynamic
    const onuFirstMatch = trimmedLine.match(/^(\d+)\s+(\d+)\s+([0-9A-Fa-f:.-]{12,17})\s+\w+/i);
    if (onuFirstMatch && currentPonPort) {
      macTable.push({
        onu_index: parseInt(onuFirstMatch[1]),
        vlan: parseInt(onuFirstMatch[2]),
        mac_address: formatMac(onuFirstMatch[3]),
        pon_port: currentPonPort,
      });
      continue;
    }

    // Pattern 3: Simple format
    // EPON0/1:1  00:11:22:33:44:55  100
    const simpleMatch = trimmedLine.match(/(?:EPON)?(\d+\/\d+):(\d+)\s+([0-9A-Fa-f:.-]{12,17})/i);
    if (simpleMatch) {
      macTable.push({
        pon_port: simpleMatch[1],
        onu_index: parseInt(simpleMatch[2]),
        mac_address: formatMac(simpleMatch[3]),
        vlan: null,
      });
      continue;
    }
  }
  
  logger.debug(`VSOL MAC table parser found ${macTable.length} entries`);
  return macTable;
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
  const cleaned = String(mac).replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (cleaned.length !== 12) return String(mac).toUpperCase();
  return cleaned.match(/.{2}/g).join(':');
}
