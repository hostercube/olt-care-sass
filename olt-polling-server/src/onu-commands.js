import { logger } from './utils/logger.js';
import { executeTelnetCommands } from './polling/telnet-client.js';

/**
 * ONU Command Executor
 * Executes CLI commands on OLTs for ONU management
 * Supports: Reboot, Deauthorize
 * 
 * IMPORTANT: Commands vary by OLT brand and mode (EPON/GPON)
 */

/**
 * Get reboot command for ONU based on OLT brand and mode
 */
function getRebootCommand(olt, onu) {
  const brand = olt.brand?.toUpperCase();
  const mode = olt.olt_mode?.toUpperCase() || 'GPON';
  const ponPort = onu.pon_port;
  const onuIndex = onu.onu_index;

  switch (brand) {
    case 'VSOL':
      if (mode === 'EPON') {
        return [
          'configure terminal',
          `interface epon 0/${ponPort}`,
          `epon reboot onu ${onuIndex}`,
          'exit',
          'exit'
        ];
      } else {
        return [
          'configure terminal',
          `interface gpon 0/${ponPort}`,
          `onu reset ${onuIndex}`,
          'exit',
          'exit'
        ];
      }
    
    case 'DBC':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `epon onu reset ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'CDATA':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `epon reset onu ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'ECOM':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `epon onu reboot ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'BDCOM':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `reboot onu ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'ZTE':
      if (mode === 'GPON') {
        return [
          'configure terminal',
          `interface gpon-olt_1/${ponPort}`,
          `onu reset ${onuIndex}`,
          'exit',
          'exit'
        ];
      } else {
        return [
          'configure terminal',
          `interface epon-olt_1/${ponPort}`,
          `onu reset ${onuIndex}`,
          'exit',
          'exit'
        ];
      }
    
    case 'HUAWEI':
      return [
        'enable',
        'config',
        `interface gpon 0/${ponPort}`,
        `ont reset ${onuIndex}`,
        'quit',
        'quit'
      ];
    
    default:
      // Generic EPON command (most Chinese OLTs)
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `epon onu reboot ${onuIndex}`,
        'exit',
        'exit'
      ];
  }
}

/**
 * Get deauthorize command for ONU based on OLT brand and mode
 */
function getDeauthorizeCommand(olt, onu) {
  const brand = olt.brand?.toUpperCase();
  const mode = olt.olt_mode?.toUpperCase() || 'GPON';
  const ponPort = onu.pon_port;
  const onuIndex = onu.onu_index;

  switch (brand) {
    case 'VSOL':
      if (mode === 'EPON') {
        return [
          'configure terminal',
          `interface epon 0/${ponPort}`,
          `no epon bind-onu mac ${onu.mac_address || ''} loid onu ${onuIndex}`,
          'exit',
          'exit'
        ];
      } else {
        return [
          'configure terminal',
          `interface gpon 0/${ponPort}`,
          `no onu ${onuIndex}`,
          'exit',
          'exit'
        ];
      }
    
    case 'DBC':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `no epon onu ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'CDATA':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `no epon onu ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'ECOM':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `no epon onu ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'BDCOM':
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `no onu ${onuIndex}`,
        'exit',
        'exit'
      ];
    
    case 'ZTE':
      if (mode === 'GPON') {
        return [
          'configure terminal',
          `interface gpon-olt_1/${ponPort}`,
          `no onu ${onuIndex}`,
          'exit',
          'exit'
        ];
      } else {
        return [
          'configure terminal',
          `interface epon-olt_1/${ponPort}`,
          `no onu ${onuIndex}`,
          'exit',
          'exit'
        ];
      }
    
    case 'HUAWEI':
      return [
        'enable',
        'config',
        `interface gpon 0/${ponPort}`,
        `ont delete ${onuIndex}`,
        'quit',
        'quit'
      ];
    
    default:
      // Generic EPON command
      return [
        'configure terminal',
        `interface epon 0/${ponPort}`,
        `no epon onu ${onuIndex}`,
        'exit',
        'exit'
      ];
  }
}

/**
 * Execute ONU reboot command
 * @param {object} olt - OLT configuration with connection details
 * @param {object} onu - ONU to reboot (must have pon_port and onu_index)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function rebootONU(olt, onu) {
  try {
    logger.info(`Rebooting ONU ${onu.name} (PON ${onu.pon_port}, Index ${onu.onu_index}) on ${olt.name}`);
    
    const commands = getRebootCommand(olt, onu);
    logger.debug(`Reboot commands: ${JSON.stringify(commands)}`);
    
    const output = await executeTelnetCommands(olt, commands);
    
    // Check for success indicators
    const success = !output.toLowerCase().includes('error') && 
                    !output.toLowerCase().includes('invalid') &&
                    !output.toLowerCase().includes('failed');
    
    if (success) {
      logger.info(`ONU ${onu.name} reboot command executed successfully`);
      return { success: true, message: `Reboot command sent to ${onu.name}` };
    } else {
      logger.warn(`ONU ${onu.name} reboot may have failed: ${output.slice(-200)}`);
      return { success: false, message: 'Reboot command may have failed. Check OLT logs.' };
    }
  } catch (error) {
    logger.error(`Failed to reboot ONU ${onu.name}:`, error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Execute ONU deauthorize command
 * @param {object} olt - OLT configuration with connection details
 * @param {object} onu - ONU to deauthorize
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deauthorizeONU(olt, onu) {
  try {
    logger.info(`Deauthorizing ONU ${onu.name} (PON ${onu.pon_port}, Index ${onu.onu_index}) on ${olt.name}`);
    
    const commands = getDeauthorizeCommand(olt, onu);
    logger.debug(`Deauthorize commands: ${JSON.stringify(commands)}`);
    
    const output = await executeTelnetCommands(olt, commands);
    
    const success = !output.toLowerCase().includes('error') && 
                    !output.toLowerCase().includes('invalid') &&
                    !output.toLowerCase().includes('failed');
    
    if (success) {
      logger.info(`ONU ${onu.name} deauthorized successfully`);
      return { success: true, message: `ONU ${onu.name} deauthorized` };
    } else {
      logger.warn(`ONU ${onu.name} deauthorize may have failed: ${output.slice(-200)}`);
      return { success: false, message: 'Deauthorize command may have failed. Check OLT logs.' };
    }
  } catch (error) {
    logger.error(`Failed to deauthorize ONU ${onu.name}:`, error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Execute bulk ONU operation
 * @param {string} operation - 'reboot' or 'deauthorize'
 * @param {object} olt - OLT configuration
 * @param {array} onus - Array of ONUs to operate on
 * @returns {Promise<{total: number, success: number, failed: number, results: array}>}
 */
export async function executeBulkOperation(operation, olt, onus) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  
  logger.info(`Executing bulk ${operation} on ${onus.length} ONUs for OLT ${olt.name}`);
  
  for (const onu of onus) {
    let result;
    
    if (operation === 'reboot') {
      result = await rebootONU(olt, onu);
    } else if (operation === 'deauthorize') {
      result = await deauthorizeONU(olt, onu);
    } else {
      result = { success: false, message: `Unknown operation: ${operation}` };
    }
    
    results.push({
      onu_id: onu.id,
      onu_name: onu.name,
      ...result
    });
    
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    
    // Small delay between commands to avoid overwhelming the OLT
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  logger.info(`Bulk ${operation} complete: ${successCount} success, ${failedCount} failed`);
  
  return {
    total: onus.length,
    success: successCount,
    failed: failedCount,
    results
  };
}
