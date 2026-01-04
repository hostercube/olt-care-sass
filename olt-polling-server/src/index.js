/**
 * OLT Polling Server - Main Entry Point
 * 
 * CRITICAL: config.js MUST be imported first to load environment variables
 * before any module that uses process.env (like Supabase client)
 */

// ============================================================
// STEP 1: Load config FIRST - this loads .env synchronously
// ============================================================
import './config.js';

// ============================================================
// STEP 2: Now we can safely import Supabase and other modules
// ============================================================
import { supabase } from './supabase-client.js';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { pollOLT, testOLTConnection, testAllProtocols } from './polling/olt-poller.js';
import { parseVSOLMacTable } from './polling/parsers/vsol-parser.js';
import { testMikrotikConnection, fetchAllMikroTikData, enrichONUWithMikroTikData, bulkTagPPPSecrets, clearMikroTikCache, fetchMikroTikHealth } from './polling/mikrotik-client.js';
import { rebootONU, deauthorizeONU, executeBulkOperation } from './onu-commands.js';
import { logger } from './utils/logger.js';
import { updateUserPassword, isUserAdmin } from './admin/user-admin.js';
import { getNotificationSettings, notifyAlert, testSmtpConnection, sendTestEmail, sendTestTelegram, sendTestWhatsApp } from './notifications/notifier.js';
import { processPendingSMS, getSMSGatewaySettings, sendSMS } from './notifications/sms-sender.js';
import { initiatePayment, handlePaymentCallback } from './payments/payment-handler.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store polling status
const pollingStatus = {
  isPolling: false,
  lastPollTime: null,
  lastPollResults: {},
  errors: []
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    supabase: process.env.SUPABASE_URL ? 'configured' : 'missing'
  });
});

// ============= DEVICE HEALTH METRICS ENDPOINT =============
// Fetches CPU, RAM, uptime from all configured MikroTik devices
app.get('/api/device-health', async (req, res) => {
  try {
    // Fetch all OLTs with MikroTik configuration
    const { data: olts, error } = await supabase
      .from('olts')
      .select('*');
    
    if (error) throw error;
    
    const devices = [];
    const healthRecords = [];
    
    for (const olt of olts) {
      // Add OLT entry (no health metrics available for OLTs directly)
      devices.push({
        id: olt.id,
        name: olt.name,
        type: 'olt',
        status: olt.status,
        lastPolled: olt.last_polled,
        ip: olt.ip_address,
      });
      
      // Fetch MikroTik health if configured
      if (olt.mikrotik_ip && olt.mikrotik_username) {
        const mikrotik = {
          ip: olt.mikrotik_ip,
          port: olt.mikrotik_port || 8728,
          username: olt.mikrotik_username,
          password: olt.mikrotik_password_encrypted,
        };
        
        try {
          const health = await fetchMikroTikHealth(mikrotik);
          
          if (health) {
            const deviceId = `${olt.id}-mt`;
            devices.push({
              id: deviceId,
              name: `${olt.name} MikroTik`,
              type: 'mikrotik',
              status: 'online',
              ip: olt.mikrotik_ip,
              cpu: health.cpu,
              memory: health.memory,
              uptime: health.uptime,
              uptimeSeconds: health.uptimeSeconds,
              version: health.version,
              boardName: health.boardName,
              freeMemory: health.freeMemory,
              totalMemory: health.totalMemory,
            });
            
            // Prepare record for database
            healthRecords.push({
              device_id: olt.id,
              device_type: 'mikrotik',
              device_name: `${olt.name} MikroTik`,
              cpu_percent: health.cpu,
              memory_percent: health.memory,
              uptime_seconds: health.uptimeSeconds,
              free_memory_bytes: health.freeMemory,
              total_memory_bytes: health.totalMemory,
            });
          } else {
            devices.push({
              id: `${olt.id}-mt`,
              name: `${olt.name} MikroTik`,
              type: 'mikrotik',
              status: 'unknown',
              ip: olt.mikrotik_ip,
            });
          }
        } catch (mtErr) {
          logger.warn(`Failed to get health for MikroTik ${olt.mikrotik_ip}: ${mtErr.message}`);
          devices.push({
            id: `${olt.id}-mt`,
            name: `${olt.name} MikroTik`,
            type: 'mikrotik',
            status: 'offline',
            ip: olt.mikrotik_ip,
            error: mtErr.message,
          });
        }
      }
    }
    
    // Save health records to database (for historical tracking)
    if (healthRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('device_health_history')
        .insert(healthRecords);
      
      if (insertError) {
        logger.warn(`Failed to save health history: ${insertError.message}`);
      } else {
        logger.debug(`Saved ${healthRecords.length} health records`);
      }
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      devices,
    });
  } catch (error) {
    logger.error('Device health fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Also without /api prefix
app.get('/device-health', async (req, res) => {
  req.url = '/api/device-health';
  app.handle(req, res);
});

// Get polling status
app.get('/status', (req, res) => {
  res.json({
    ...pollingStatus,
    supabaseConfigured: !!process.env.SUPABASE_URL,
    uptime: process.uptime()
  });
});

// Test connection endpoint - for validating OLT and MikroTik before saving
app.post('/api/test-connection', async (req, res) => {
  const { olt, mikrotik } = req.body;
  
  const result = {
    olt: { success: false, error: null },
    mikrotik: null
  };

  try {
    // Test OLT connection
    if (olt) {
      logger.info(`Testing OLT connection: ${olt.ip_address}:${olt.port}`);
      const oltResult = await testOLTConnection(olt);
      result.olt = oltResult;
    }

    // Test MikroTik connection if provided
    if (mikrotik && mikrotik.ip) {
      logger.info(`Testing MikroTik connection: ${mikrotik.ip}:${mikrotik.port}`);
      const mtResult = await testMikrotikConnection(mikrotik);
      result.mikrotik = mtResult;
    }

    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    res.json({
      olt: { success: false, error: error.message },
      mikrotik: null
    });
  }
});

// Simple test-connection endpoint (without /api prefix for Nginx)
app.post('/test-connection', async (req, res) => {
  const { olt, mikrotik } = req.body;
  
  const result = {
    olt: { success: false, error: null },
    mikrotik: null
  };

  try {
    if (olt) {
      logger.info(`Testing OLT connection: ${olt.ip_address}:${olt.port}`);
      const oltResult = await testOLTConnection(olt);
      result.olt = oltResult;
    }

    if (mikrotik && mikrotik.ip) {
      logger.info(`Testing MikroTik connection: ${mikrotik.ip}:${mikrotik.port}`);
      const mtResult = await testMikrotikConnection(mikrotik);
      result.mikrotik = mtResult;
    }

    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    res.json({
      olt: { success: false, error: error.message },
      mikrotik: null
    });
  }
});

// Test all protocols endpoint - returns which protocols work for an OLT
app.post('/api/test-all-protocols', async (req, res) => {
  const { olt } = req.body;
  
  try {
    if (!olt) {
      return res.status(400).json({ error: 'OLT configuration required' });
    }
    
    logger.info(`Testing all protocols for: ${olt.ip_address}`);
    const results = await testAllProtocols(olt);
    res.json(results);
  } catch (error) {
    logger.error('Test all protocols error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Also without /api prefix for Nginx
app.post('/test-all-protocols', async (req, res) => {
  const { olt } = req.body;
  
  try {
    if (!olt) {
      return res.status(400).json({ error: 'OLT configuration required' });
    }
    
    logger.info(`Testing all protocols for: ${olt.ip_address}`);
    const results = await testAllProtocols(olt);
    res.json(results);
  } catch (error) {
    logger.error('Test all protocols error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test MikroTik connection and fetch data summary
app.post('/api/test-mikrotik', async (req, res) => {
  const { mikrotik } = req.body;
  
  try {
    if (!mikrotik || !mikrotik.ip) {
      return res.status(400).json({ error: 'MikroTik configuration required' });
    }
    
    logger.info(`Testing MikroTik and fetching data: ${mikrotik.ip}:${mikrotik.port}`);
    
    // First test connection
    const connectionResult = await testMikrotikConnection(mikrotik);
    
    if (!connectionResult.success) {
      return res.json({
        success: false,
        error: connectionResult.error,
        connection: connectionResult,
        data: null
      });
    }
    
    // If connection successful, fetch data
    const data = await fetchAllMikroTikData(mikrotik);
    
    res.json({
      success: true,
      connection: connectionResult,
      data: {
        pppoe_count: data.pppoe.length,
        arp_count: data.arp.length,
        dhcp_count: data.dhcp.length,
        secrets_count: data.secrets.length,
        // Sample data (first 5 of each)
        pppoe_sample: data.pppoe.slice(0, 5),
        arp_sample: data.arp.slice(0, 5),
        dhcp_sample: data.dhcp.slice(0, 5),
        secrets_sample: data.secrets.slice(0, 5).map(s => ({ ...s, pppoe_password: '***' })),
      }
    });
  } catch (error) {
    logger.error('MikroTik test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Also without /api prefix
app.post('/test-mikrotik', async (req, res) => {
  const { mikrotik } = req.body;
  
  try {
    if (!mikrotik || !mikrotik.ip) {
      return res.status(400).json({ error: 'MikroTik configuration required' });
    }
    
    logger.info(`Testing MikroTik and fetching data: ${mikrotik.ip}:${mikrotik.port}`);
    
    const connectionResult = await testMikrotikConnection(mikrotik);
    
    if (!connectionResult.success) {
      return res.json({
        success: false,
        error: connectionResult.error,
        connection: connectionResult,
        data: null
      });
    }
    
    const data = await fetchAllMikroTikData(mikrotik);
    
    res.json({
      success: true,
      connection: connectionResult,
      data: {
        pppoe_count: data.pppoe.length,
        arp_count: data.arp.length,
        dhcp_count: data.dhcp.length,
        secrets_count: data.secrets.length,
        pppoe_sample: data.pppoe.slice(0, 5),
        arp_sample: data.arp.slice(0, 5),
        dhcp_sample: data.dhcp.slice(0, 5),
        secrets_sample: data.secrets.slice(0, 5).map(s => ({ ...s, pppoe_password: '***' })),
      }
    });
  } catch (error) {
    logger.error('MikroTik test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});
app.post('/api/poll/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    const { data: olt, error } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();
    
    if (error || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }
    
    logger.info(`Manual poll triggered for OLT: ${olt.name}`);
    const result = await pollOLT(supabase, olt);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Poll error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Poll specific OLT (without /api prefix for direct server access)
app.post('/poll/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    const { data: olt, error } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();
    
    if (error || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }
    
    logger.info(`Manual poll triggered for OLT: ${olt.name}`);
    const result = await pollOLT(supabase, olt);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Poll error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RE-SYNC OLT (CLEAR CACHES + POLL) =============
app.post('/api/resync/:oltId', async (req, res) => {
  const { oltId } = req.params;

  try {
    const { data: olt, error } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();

    if (error || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }

    // Clear MikroTik connection detection cache so we re-detect port/method freshly
    if (olt.mikrotik_ip) {
      clearMikroTikCache(olt.mikrotik_ip, olt.mikrotik_port || 8728);
    }

    logger.info(`Re-sync triggered for OLT: ${olt.name}`);
    const result = await pollOLT(supabase, olt);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Re-sync error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============= FULL SYNC (RESYNC + FORCE RE-TAG + RE-ENRICH) =============
// Combines all sync operations into one button
// Supports Server-Sent Events for progress updates when Accept: text/event-stream

app.post('/api/full-sync/:oltId', async (req, res) => {
  const { oltId } = req.params;
  const useSSE = req.headers.accept === 'text/event-stream';

  // SSE helper
  const sendProgress = (step, status, detail = '') => {
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ step, status, detail })}\n\n`);
    }
    logger.info(`FULL SYNC [${step}]: ${status}${detail ? ' - ' + detail : ''}`);
  };

  if (useSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  }

  try {
    const { data: olt, error } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();

    if (error || !olt) {
      if (useSSE) {
        sendProgress('error', 'failed', 'OLT not found');
        res.end();
      } else {
        res.status(404).json({ error: 'OLT not found' });
      }
      return;
    }

    sendProgress('polling', 'started', `Polling OLT: ${olt.name}`);
    const results = { resync: null, bulkTag: null, reenrich: null };

    // Step 1: Clear cache and poll
    if (olt.mikrotik_ip) {
      clearMikroTikCache(olt.mikrotik_ip, olt.mikrotik_port || 8728);
    }
    const pollResult = await pollOLT(supabase, olt);
    results.resync = { success: true, onuCount: pollResult?.onuCount || 0 };
    sendProgress('polling', 'completed', `Found ${results.resync.onuCount} ONUs`);

    // Step 2: Force re-tag (overwrite mode on comment)
    if (olt.mikrotik_ip && olt.mikrotik_username) {
      sendProgress('tagging', 'started', 'Tagging PPP secrets...');
      
      const mikrotik = {
        ip: olt.mikrotik_ip,
        port: olt.mikrotik_port || 8728,
        username: olt.mikrotik_username,
        password: olt.mikrotik_password_encrypted,
      };

      const { data: onus } = await supabase
        .from('onus')
        .select('*')
        .eq('olt_id', oltId);

      if (onus && onus.length > 0) {
        const tagResult = await bulkTagPPPSecrets(mikrotik, onus, { mode: 'overwrite', target: 'comment' });
        results.bulkTag = { tagged: tagResult.tagged || 0, skipped: tagResult.skipped || 0 };
        sendProgress('tagging', 'completed', `Tagged ${results.bulkTag.tagged} secrets`);
      } else {
        sendProgress('tagging', 'skipped', 'No ONUs found');
      }

      // Step 3: Re-enrich
      sendProgress('enriching', 'started', 'Fetching MikroTik data...');
      const { pppoe, arp, dhcp, secrets } = await fetchAllMikroTikData(mikrotik);

      const { data: existingONUs } = await supabase
        .from('onus')
        .select('*')
        .eq('olt_id', oltId);

      // For VSOL: build OLT MAC table from latest raw CLI output (needed for accurate router MAC mapping)
      let oltMacTable = [];
      if (olt.brand === 'VSOL') {
        const { data: logRow, error: logError } = await supabase
          .from('olt_debug_logs')
          .select('raw_output')
          .eq('olt_id', oltId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!logError && logRow?.raw_output) {
          oltMacTable = parseVSOLMacTable(logRow.raw_output);
          logger.info(`VSOL MAC table loaded: ${oltMacTable.length} entries`);
          if (oltMacTable.length > 0) {
            // Show sample entries for debugging
            logger.info(`MAC table sample: ${JSON.stringify(oltMacTable.slice(0, 5))}`);
          }
        } else {
          logger.warn(`No MAC table data found in olt_debug_logs for OLT ${oltId}`);
        }
      }

      // STRICT 1:1 enforcement during re-enrich (prevents one PPPoE user being applied to multiple ONUs)
      const usedMatches = new Set();

      let enrichedCount = 0;
      if (existingONUs) {
        for (const onu of existingONUs) {
          const enriched = enrichONUWithMikroTikData(onu, pppoe, arp, dhcp, secrets, usedMatches, oltMacTable);

          // Mark as used even if no DB update is needed
          if (enriched.pppoe_username) usedMatches.add(enriched.pppoe_username.toLowerCase());

          const enrichedRouterMac = enriched.router_mac || null;

          if (
            enriched.pppoe_username !== onu.pppoe_username ||
            enriched.router_name !== onu.router_name ||
            enrichedRouterMac !== (onu.router_mac || null)
          ) {
            enrichedCount++;
            await supabase
              .from('onus')
              .update({
                pppoe_username: enriched.pppoe_username,
                router_name: enriched.router_name,
                router_mac: enrichedRouterMac,
                updated_at: new Date().toISOString(),
              })
              .eq('id', onu.id);
          }
        }
      }
      results.reenrich = { enriched: enrichedCount, total: existingONUs?.length || 0 };
      sendProgress('enriching', 'completed', `Enriched ${enrichedCount} of ${existingONUs?.length || 0} ONUs`);
    } else {
      sendProgress('tagging', 'skipped', 'MikroTik not configured');
      sendProgress('enriching', 'skipped', 'MikroTik not configured');
    }

    sendProgress('complete', 'success', `Full sync complete`);

    if (useSSE) {
      res.write(`data: ${JSON.stringify({ step: 'done', results })}\n\n`);
      res.end();
    } else {
      res.json({ success: true, results });
    }
  } catch (error) {
    logger.error(`Full sync error for OLT ${oltId}:`, error);
    if (useSSE) {
      sendProgress('error', 'failed', error.message);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/full-sync/:oltId', async (req, res) => {
  // Redirect to /api version
  req.url = `/api/full-sync/${req.params.oltId}`;
  app.handle(req, res);
});

app.post('/resync/:oltId', async (req, res) => {
  const { oltId } = req.params;

  try {
    const { data: olt, error } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();

    if (error || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }

    if (olt.mikrotik_ip) {
      clearMikroTikCache(olt.mikrotik_ip, olt.mikrotik_port || 8728);
    }

    logger.info(`Re-sync triggered for OLT: ${olt.name}`);
    const result = await pollOLT(supabase, olt);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Re-sync error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RE-ENRICH PPPoE ONLY =============
// Re-runs MikroTik enrichment without full OLT poll
app.post('/api/reenrich/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    const { data: olt, error: oltError } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();
    
    if (oltError || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }
    
    if (!olt.mikrotik_ip || !olt.mikrotik_username) {
      return res.status(400).json({ error: 'MikroTik not configured for this OLT' });
    }
    
    logger.info(`Re-enriching PPPoE data for OLT: ${olt.name}`);
    
    const mikrotik = {
      ip: olt.mikrotik_ip,
      port: olt.mikrotik_port || 8728,
      username: olt.mikrotik_username,
      password: olt.mikrotik_password_encrypted,
    };
    
    // Fetch MikroTik data
    const { pppoe, arp, dhcp, secrets } = await fetchAllMikroTikData(mikrotik);
    
    logger.info(`MikroTik data: ${pppoe.length} PPPoE, ${arp.length} ARP, ${dhcp.length} DHCP, ${secrets.length} secrets`);
    
    // Fetch existing ONUs for this OLT
    const { data: existingONUs, error: onuError } = await supabase
      .from('onus')
      .select('*')
      .eq('olt_id', oltId);
    
    if (onuError) throw onuError;
    
    // For VSOL: build OLT MAC table from latest raw CLI output
    let oltMacTable = [];
    if (olt.brand === 'VSOL') {
      const { data: logRow, error: logError } = await supabase
        .from('olt_debug_logs')
        .select('raw_output')
        .eq('olt_id', oltId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!logError && logRow?.raw_output) {
        oltMacTable = parseVSOLMacTable(logRow.raw_output);
        logger.info(`VSOL MAC table loaded for re-enrich: ${oltMacTable.length} entries`);
        if (oltMacTable.length > 0) {
          logger.info(`MAC table sample: ${JSON.stringify(oltMacTable.slice(0, 5))}`);
        }
      } else {
        logger.warn(`No MAC table data found in olt_debug_logs for OLT ${oltId} - MAC table matching disabled`);
      }
    }
    
    // STRICT 1:1 enforcement - prevents same PPPoE being assigned to multiple ONUs
    const usedMatches = new Set();
    
    let enrichedCount = 0;
    const matchMethods = {};
    
    for (const onu of existingONUs || []) {
      const enriched = enrichONUWithMikroTikData(onu, pppoe, arp, dhcp, secrets, usedMatches, oltMacTable);
      const enrichedRouterMac = enriched.router_mac || null;
      
      // Mark as used to enforce 1:1
      if (enriched.pppoe_username) usedMatches.add(enriched.pppoe_username.toLowerCase());

      if (enriched.pppoe_username !== onu.pppoe_username || 
          enriched.router_name !== onu.router_name ||
          enrichedRouterMac !== (onu.router_mac || null)) {
        enrichedCount++;
        
        await supabase
          .from('onus')
          .update({
            pppoe_username: enriched.pppoe_username,
            router_name: enriched.router_name,
            router_mac: enrichedRouterMac,
            updated_at: new Date().toISOString(),
          })
          .eq('id', onu.id);
        
        // Track match methods
        if (enriched.match_method) {
          matchMethods[enriched.match_method] = (matchMethods[enriched.match_method] || 0) + 1;
        }
      }
    }
    
    logger.info(`Re-enrich complete: ${enrichedCount}/${existingONUs?.length || 0} ONUs, Methods: ${JSON.stringify(matchMethods)}`);
    
    logger.info(`Re-enrichment complete: ${enrichedCount}/${existingONUs?.length || 0} ONUs updated`);
    
    res.json({
      success: true,
      total_onus: existingONUs?.length || 0,
      enriched_count: enrichedCount,
      match_methods: matchMethods,
      mikrotik_data: {
        pppoe_count: pppoe.length,
        arp_count: arp.length,
        dhcp_count: dhcp.length,
        secrets_count: secrets.length,
        pppoe_sample: pppoe.slice(0, 6).map(s => ({
          pppoe_username: s.pppoe_username,
          mac_address: s.mac_address,
          ip_address: s.ip_address,
        })),
        secrets_sample: secrets.slice(0, 6).map(s => ({
          pppoe_username: s.pppoe_username,
          caller_id: s.caller_id,
          comment: s.comment,
          password: '***masked***',
        })),
      }
    });
  } catch (error) {
    logger.error(`Re-enrich error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/reenrich/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    const { data: olt, error: oltError } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();
    
    if (oltError || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }
    
    if (!olt.mikrotik_ip || !olt.mikrotik_username) {
      return res.status(400).json({ error: 'MikroTik not configured for this OLT' });
    }
    
    logger.info(`Re-enriching PPPoE data for OLT: ${olt.name}`);
    
    const mikrotik = {
      ip: olt.mikrotik_ip,
      port: olt.mikrotik_port || 8728,
      username: olt.mikrotik_username,
      password: olt.mikrotik_password_encrypted,
    };
    
    const { pppoe, arp, dhcp, secrets } = await fetchAllMikroTikData(mikrotik);
    
    const { data: existingONUs, error: onuError } = await supabase
      .from('onus')
      .select('*')
      .eq('olt_id', oltId);
    
    if (onuError) throw onuError;
    
    // For VSOL: build OLT MAC table from latest raw CLI output
    let oltMacTable = [];
    if (olt.brand === 'VSOL') {
      const { data: logRow, error: logError } = await supabase
        .from('olt_debug_logs')
        .select('raw_output')
        .eq('olt_id', oltId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!logError && logRow?.raw_output) {
        oltMacTable = parseVSOLMacTable(logRow.raw_output);
      }
    }
    
    // STRICT 1:1 enforcement
    const usedMatches = new Set();
    
    let enrichedCount = 0;
    const matchMethods = {};
    
    for (const onu of existingONUs || []) {
      const enriched = enrichONUWithMikroTikData(onu, pppoe, arp, dhcp, secrets, usedMatches, oltMacTable);
      const enrichedRouterMac = enriched.router_mac || null;
      
      // Mark as used
      if (enriched.pppoe_username) usedMatches.add(enriched.pppoe_username.toLowerCase());
      
      if (enriched.pppoe_username !== onu.pppoe_username || 
          enriched.router_name !== onu.router_name ||
          enrichedRouterMac !== (onu.router_mac || null)) {
        enrichedCount++;
        await supabase
          .from('onus')
          .update({
            pppoe_username: enriched.pppoe_username,
            router_name: enriched.router_name,
            router_mac: enrichedRouterMac,
            updated_at: new Date().toISOString(),
          })
          .eq('id', onu.id);
          
        if (enriched.match_method) {
          matchMethods[enriched.match_method] = (matchMethods[enriched.match_method] || 0) + 1;
        }
      }
    }
    
    res.json({
      success: true,
      total_onus: existingONUs?.length || 0,
      enriched_count: enrichedCount,
      match_methods: matchMethods,
      mikrotik_data: {
        pppoe_count: pppoe.length,
        arp_count: arp.length,
        dhcp_count: dhcp.length,
        secrets_count: secrets.length,
        pppoe_sample: pppoe.slice(0, 6).map(s => ({
          pppoe_username: s.pppoe_username,
          mac_address: s.mac_address,
          ip_address: s.ip_address,
        })),
        secrets_sample: secrets.slice(0, 6).map(s => ({
          pppoe_username: s.pppoe_username,
          caller_id: s.caller_id,
          comment: s.comment,
          password: '***masked***',
        })),
      }
    });
  } catch (error) {
    logger.error(`Re-enrich error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get debug logs for an OLT
app.get('/api/debug-logs/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('olt_debug_logs')
      .select('*')
      .eq('olt_id', oltId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, logs: data || [] });
  } catch (error) {
    logger.error(`Error fetching debug logs for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Also without /api prefix
app.get('/debug-logs/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('olt_debug_logs')
      .select('*')
      .eq('olt_id', oltId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, logs: data || [] });
  } catch (error) {
    logger.error(`Error fetching debug logs for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============= ON-DEMAND REAL-TIME POLLING =============
// Lightweight endpoint for when user views ONU page
// Only fetches status/DBM from MikroTik - doesn't hit OLT CLI heavily

// ============= REALTIME STATUS ENDPOINT =============
// IMPORTANT: This endpoint NO LONGER updates ONU status
// ONU Status is ONLY determined by OLT (source of truth)
// MikroTik is used ONLY for PPPoE/Router info enrichment during full polls

app.get('/api/realtime-status', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Fetch all OLTs with MikroTik
    const { data: olts, error: oltError } = await supabase
      .from('olts')
      .select('*');
    
    if (oltError) throw oltError;
    
    const results = {
      timestamp: new Date().toISOString(),
      olts_checked: 0,
      onus_enriched: 0,
      pppoe_sessions: 0,
      note: 'ONU status comes from OLT only - MikroTik provides PPPoE/Router info',
    };
    
    for (const olt of olts || []) {
      if (!olt.mikrotik_ip || !olt.mikrotik_username) continue;
      
      results.olts_checked++;
      
      try {
        const mikrotik = {
          ip: olt.mikrotik_ip,
          port: olt.mikrotik_port || 8728,
          username: olt.mikrotik_username,
          password: olt.mikrotik_password_encrypted,
        };
        
        // Fetch PPPoE active sessions (for enrichment info only, NOT for status)
        const { pppoe } = await fetchAllMikroTikData(mikrotik);
        results.pppoe_sessions += pppoe.length;
        
        // Build map of active PPPoE sessions for enrichment
        const pppoeByMac = new Map();
        const pppoeByUsername = new Map();
        for (const p of pppoe) {
          if (p.mac_address) {
            pppoeByMac.set(p.mac_address.toUpperCase(), p);
          }
          if (p.pppoe_username) {
            pppoeByUsername.set(p.pppoe_username.toLowerCase(), p);
          }
        }
        
        // Fetch ONUs for this OLT (only those missing PPPoE/Router info)
        const { data: onus } = await supabase
          .from('onus')
          .select('id, mac_address, pppoe_username, router_name, router_mac')
          .eq('olt_id', olt.id);
        
        // Enrich ONUs with PPPoE/Router info (DO NOT touch status)
        for (const onu of onus || []) {
          // Try to find PPPoE session by ONU MAC or existing username
          let session = null;
          
          if (onu.mac_address) {
            session = pppoeByMac.get(onu.mac_address.toUpperCase());
          }
          if (!session && onu.pppoe_username) {
            session = pppoeByUsername.get(onu.pppoe_username.toLowerCase());
          }
          
          if (session) {
            const updateData = {};
            
            // Only update if we have new info
            if (session.pppoe_username && !onu.pppoe_username) {
              updateData.pppoe_username = session.pppoe_username;
            }
            if (session.router_name && !onu.router_name) {
              updateData.router_name = session.router_name;
            }
            if (session.mac_address && !onu.router_mac) {
              updateData.router_mac = session.mac_address;
            }
            
            // Only update if we have something new
            if (Object.keys(updateData).length > 0) {
              updateData.updated_at = new Date().toISOString();
              await supabase
                .from('onus')
                .update(updateData)
                .eq('id', onu.id);
              results.onus_enriched++;
            }
          }
        }
      } catch (err) {
        logger.warn(`Realtime enrichment failed for ${olt.name}: ${err.message}`);
      }
    }
    
    results.duration_ms = Date.now() - startTime;
    logger.info(`Realtime enrichment: ${results.onus_enriched} ONUs enriched with PPPoE info in ${results.duration_ms}ms`);
    
    res.json({ success: true, ...results });
  } catch (error) {
    logger.error('Realtime status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/realtime-status', async (req, res) => {
  req.url = '/api/realtime-status';
  app.handle(req, res);
});

// ============= ONU BULK OPERATIONS =============

// Bulk reboot ONUs
app.post('/api/onu/bulk-reboot', async (req, res) => {
  const { onu_ids } = req.body;
  
  if (!onu_ids || !Array.isArray(onu_ids) || onu_ids.length === 0) {
    return res.status(400).json({ error: 'onu_ids array required' });
  }
  
  try {
    // Fetch ONUs with their OLT info
    const { data: onus, error: onuError } = await supabase
      .from('onus')
      .select('*, olts(*)')
      .in('id', onu_ids);
    
    if (onuError) throw onuError;
    
    const results = [];
    for (const onu of onus) {
      const olt = onu.olts;
      if (!olt) {
        results.push({ onu_id: onu.id, success: false, message: 'OLT not found' });
        continue;
      }
      const result = await rebootONU(olt, onu);
      results.push({ onu_id: onu.id, onu_name: onu.name, ...result });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Bulk reboot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk deauthorize ONUs
app.post('/api/onu/bulk-deauthorize', async (req, res) => {
  const { onu_ids } = req.body;
  
  if (!onu_ids || !Array.isArray(onu_ids) || onu_ids.length === 0) {
    return res.status(400).json({ error: 'onu_ids array required' });
  }
  
  try {
    const { data: onus, error: onuError } = await supabase
      .from('onus')
      .select('*, olts(*)')
      .in('id', onu_ids);
    
    if (onuError) throw onuError;
    
    const results = [];
    for (const onu of onus) {
      const olt = onu.olts;
      if (!olt) {
        results.push({ onu_id: onu.id, success: false, message: 'OLT not found' });
        continue;
      }
      const result = await deauthorizeONU(olt, onu);
      results.push({ onu_id: onu.id, onu_name: onu.name, ...result });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Bulk deauthorize error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= BULK TAG PPP SECRETS =============
// Write ONU MAC/serial into MikroTik PPP secrets for better matching
app.post('/api/mikrotik/bulk-tag/:oltId', async (req, res) => {
  const { oltId } = req.params;
  const { mode = 'append', target = 'both' } = req.body;
  
  try {
    // Fetch OLT
    const { data: olt, error: oltError } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();
    
    if (oltError || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }
    
    if (!olt.mikrotik_ip || !olt.mikrotik_username) {
      return res.status(400).json({ error: 'MikroTik not configured for this OLT' });
    }
    
    logger.info(`Bulk tagging PPP secrets for OLT: ${olt.name} (mode: ${mode}, target: ${target})`);
    
    const mikrotik = {
      ip: olt.mikrotik_ip,
      port: olt.mikrotik_port || 8728,
      username: olt.mikrotik_username,
      password: olt.mikrotik_password_encrypted,
    };
    
    // Fetch all ONUs for this OLT
    const { data: onus, error: onuError } = await supabase
      .from('onus')
      .select('*')
      .eq('olt_id', oltId);
    
    if (onuError) throw onuError;
    
    if (!onus || onus.length === 0) {
      return res.json({ success: false, error: 'No ONUs found for this OLT', results: [] });
    }
    
    // Execute bulk tagging
    const result = await bulkTagPPPSecrets(mikrotik, onus, { mode, target });
    
    res.json(result);
  } catch (error) {
    logger.error(`Bulk tag error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Without /api prefix
app.post('/mikrotik/bulk-tag/:oltId', async (req, res) => {
  const { oltId } = req.params;
  const { mode = 'append', target = 'both' } = req.body;
  
  try {
    const { data: olt, error: oltError } = await supabase
      .from('olts')
      .select('*')
      .eq('id', oltId)
      .single();
    
    if (oltError || !olt) {
      return res.status(404).json({ error: 'OLT not found' });
    }
    
    if (!olt.mikrotik_ip || !olt.mikrotik_username) {
      return res.status(400).json({ error: 'MikroTik not configured for this OLT' });
    }
    
    logger.info(`Bulk tagging PPP secrets for OLT: ${olt.name}`);
    
    const mikrotik = {
      ip: olt.mikrotik_ip,
      port: olt.mikrotik_port || 8728,
      username: olt.mikrotik_username,
      password: olt.mikrotik_password_encrypted,
    };
    
    const { data: onus, error: onuError } = await supabase
      .from('onus')
      .select('*')
      .eq('olt_id', oltId);
    
    if (onuError) throw onuError;
    
    if (!onus || onus.length === 0) {
      return res.json({ success: false, error: 'No ONUs found for this OLT', results: [] });
    }
    
    const result = await bulkTagPPPSecrets(mikrotik, onus, { mode, target });
    
    res.json(result);
  } catch (error) {
    logger.error(`Bulk tag error for OLT ${oltId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============= MIKROTIK PPPoE USER MANAGEMENT =============

// Create PPPoE user on MikroTik
app.post('/api/mikrotik/pppoe/create', async (req, res) => {
  const { mikrotik, pppoeUser } = req.body;
  
  if (!mikrotik || !mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return res.status(400).json({ success: false, error: 'MikroTik configuration required' });
  }
  
  if (!pppoeUser || !pppoeUser.name || !pppoeUser.password) {
    return res.status(400).json({ success: false, error: 'PPPoE user details required (name, password)' });
  }
  
  try {
    logger.info(`Creating PPPoE user ${pppoeUser.name} on ${mikrotik.ip}`);
    
    const { createPPPSecret } = await import('./polling/mikrotik-client.js');
    const result = await createPPPSecret(mikrotik, {
      name: pppoeUser.name,
      password: pppoeUser.password,
      profile: pppoeUser.profile || 'default',
      comment: pppoeUser.comment || '',
      callerId: pppoeUser.callerId || '',
    });
    
    res.json(result);
  } catch (error) {
    logger.error(`PPPoE user creation error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle PPPoE user (enable/disable) on MikroTik
app.post('/api/mikrotik/pppoe/toggle', async (req, res) => {
  const { mikrotik, username, disabled } = req.body;
  
  if (!mikrotik || !mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return res.status(400).json({ success: false, error: 'MikroTik configuration required' });
  }
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'PPPoE username required' });
  }
  
  try {
    logger.info(`${disabled ? 'Disabling' : 'Enabling'} PPPoE user ${username} on ${mikrotik.ip}`);
    
    const { togglePPPSecret } = await import('./polling/mikrotik-client.js');
    const result = await togglePPPSecret(mikrotik, username, disabled);
    
    res.json(result);
  } catch (error) {
    logger.error(`PPPoE user toggle error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete PPPoE user from MikroTik
app.post('/api/mikrotik/pppoe/delete', async (req, res) => {
  const { mikrotik, username } = req.body;
  
  if (!mikrotik || !mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return res.status(400).json({ success: false, error: 'MikroTik configuration required' });
  }
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'PPPoE username required' });
  }
  
  try {
    logger.info(`Deleting PPPoE user ${username} from ${mikrotik.ip}`);
    
    const { deletePPPSecret } = await import('./polling/mikrotik-client.js');
    const result = await deletePPPSecret(mikrotik, username);
    
    res.json(result);
  } catch (error) {
    logger.error(`PPPoE user delete error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get PPPoE user status (active session) from MikroTik
app.post('/api/mikrotik/pppoe/status', async (req, res) => {
  const { mikrotik, username } = req.body;
  
  if (!mikrotik || !mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return res.status(400).json({ success: false, error: 'MikroTik configuration required' });
  }
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'PPPoE username required' });
  }
  
  try {
    const { getPPPoESessionStatus } = await import('./polling/mikrotik-client.js');
    const result = await getPPPoESessionStatus(mikrotik, username);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`PPPoE status check error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get live bandwidth usage for a PPPoE user
app.post('/api/mikrotik/pppoe/bandwidth', async (req, res) => {
  const { mikrotik, username } = req.body;
  
  if (!mikrotik || !mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return res.status(400).json({ success: false, error: 'MikroTik configuration required' });
  }
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'PPPoE username required' });
  }
  
  try {
    const { getPPPoEBandwidth } = await import('./polling/mikrotik-client.js');
    const result = await getPPPoEBandwidth(mikrotik, username);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`PPPoE bandwidth check error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect active PPPoE session
app.post('/api/mikrotik/pppoe/disconnect', async (req, res) => {
  const { mikrotik, username } = req.body;
  
  if (!mikrotik || !mikrotik.ip || !mikrotik.username || !mikrotik.password) {
    return res.status(400).json({ success: false, error: 'MikroTik configuration required' });
  }
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'PPPoE username required' });
  }
  
  try {
    logger.info(`Disconnecting PPPoE session for ${username} on ${mikrotik.ip}`);
    
    const { disconnectPPPoESession } = await import('./polling/mikrotik-client.js');
    const result = await disconnectPPPoESession(mikrotik, username);
    
    res.json(result);
  } catch (error) {
    logger.error(`PPPoE disconnect error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Poll all OLTs (with /api prefix)
app.post('/api/poll-all', async (req, res) => {
  if (pollingStatus.isPolling) {
    return res.status(409).json({ error: 'Polling already in progress' });
  }
  
  logger.info('Manual poll-all triggered');
  pollAllOLTs();
  res.json({ success: true, message: 'Polling started' });
});

// Poll all OLTs (without /api prefix)
app.post('/poll-all', async (req, res) => {
  if (pollingStatus.isPolling) {
    return res.status(409).json({ error: 'Polling already in progress' });
  }
  
  logger.info('Manual poll-all triggered');
  pollAllOLTs();
  res.json({ success: true, message: 'Polling started' });
});

// Main polling function
async function pollAllOLTs() {
  if (pollingStatus.isPolling) {
    logger.warn('Polling already in progress, skipping...');
    return;
  }
  
  pollingStatus.isPolling = true;
  pollingStatus.lastPollTime = new Date().toISOString();
  pollingStatus.errors = [];
  
  try {
    // Fetch all OLTs from database
    const { data: olts, error } = await supabase
      .from('olts')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    logger.info(`Starting poll cycle for ${olts.length} OLTs`);
    
    for (const olt of olts) {
      try {
        logger.info(`Polling OLT: ${olt.name} (${olt.ip_address})`);
        const result = await pollOLT(supabase, olt);
        pollingStatus.lastPollResults[olt.id] = {
          success: true,
          onuCount: result.onuCount,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        logger.error(`Failed to poll OLT ${olt.name}:`, error);
        pollingStatus.errors.push({
          oltId: olt.id,
          oltName: olt.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        pollingStatus.lastPollResults[olt.id] = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        // Update OLT status to offline/warning
        await supabase
          .from('olts')
          .update({ status: 'offline' })
          .eq('id', olt.id);
        
        // Create alert for unreachable OLT
        await supabase
          .from('alerts')
          .insert({
            type: 'olt_unreachable',
            severity: 'critical',
            title: `OLT Unreachable: ${olt.name}`,
            message: `Failed to connect to OLT at ${olt.ip_address}: ${error.message}`,
            device_id: olt.id,
            device_name: olt.name
          });
      }
    }
    
    logger.info('Poll cycle completed');
  } catch (error) {
    logger.error('Poll cycle failed:', error);
  } finally {
    pollingStatus.isPolling = false;
  }
}

// ============= DATABASE CLEANUP ENDPOINT =============
// Removes duplicate ONU records (keeps most recently updated for each olt_id + pon_port + onu_index)
app.post('/api/cleanup-duplicates', async (req, res) => {
  const { oltId, dryRun = true } = req.body;
  
  try {
    logger.info(`ONU cleanup requested (dryRun=${dryRun}, oltId=${oltId || 'all'})`);
    
    // Find duplicates by grouping on olt_id + pon_port + onu_index
    let query = supabase.from('onus').select('*');
    if (oltId) {
      query = query.eq('olt_id', oltId);
    }
    
    const { data: allONUs, error } = await query;
    if (error) throw error;
    
    // Group by hardware identity
    const groups = {};
    for (const onu of allONUs) {
      const key = `${onu.olt_id}|${onu.pon_port}|${onu.onu_index}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(onu);
    }
    
    // Find groups with more than one entry
    const duplicateGroups = Object.entries(groups).filter(([_, arr]) => arr.length > 1);
    
    // For each group, keep the most recently updated, delete the rest
    const toDelete = [];
    for (const [key, onus] of duplicateGroups) {
      // Sort by updated_at descending
      onus.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      // Keep first, mark rest for deletion
      for (let i = 1; i < onus.length; i++) {
        toDelete.push(onus[i]);
      }
    }
    
    logger.info(`Found ${duplicateGroups.length} duplicate groups, ${toDelete.length} records to delete`);
    
    if (!dryRun && toDelete.length > 0) {
      const ids = toDelete.map(o => o.id);
      const { error: deleteError } = await supabase
        .from('onus')
        .delete()
        .in('id', ids);
      
      if (deleteError) throw deleteError;
      logger.info(`Deleted ${ids.length} duplicate ONU records`);
    }
    
    // Also check for PPPoE username duplicates (same username on multiple ONUs)
    const pppoeGroups = {};
    for (const onu of allONUs) {
      if (!onu.pppoe_username || onu.pppoe_username.trim() === '') continue;
      if (!pppoeGroups[onu.pppoe_username]) pppoeGroups[onu.pppoe_username] = [];
      pppoeGroups[onu.pppoe_username].push(onu);
    }
    
    const pppoeDuplicates = Object.entries(pppoeGroups)
      .filter(([_, arr]) => arr.length > 1)
      .map(([username, onus]) => ({ username, count: onus.length, onus: onus.map(o => ({ id: o.id, name: o.name, pon_port: o.pon_port, onu_index: o.onu_index })) }));
    
    res.json({
      success: true,
      dryRun,
      duplicateGroupsCount: duplicateGroups.length,
      recordsDeleted: dryRun ? 0 : toDelete.length,
      recordsToDelete: toDelete.map(o => ({ id: o.id, name: o.name, pon_port: o.pon_port, onu_index: o.onu_index, pppoe_username: o.pppoe_username })),
      pppoeDuplicates,
      pppoeDuplicateCount: pppoeDuplicates.length,
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/cleanup-duplicates', async (req, res) => {
  req.url = '/api/cleanup-duplicates';
  req.body = req.body || {};
  app.handle(req, res);
});

// ============= CLEAR PPPOE DATA ENDPOINT =============
// Clears pppoe_username, router_name, router_mac from ONUs (for re-enrichment)
app.post('/api/clear-pppoe/:oltId', async (req, res) => {
  const { oltId } = req.params;
  
  try {
    logger.info(`Clearing PPPoE data for OLT: ${oltId}`);
    
    const { data, error } = await supabase
      .from('onus')
      .update({
        pppoe_username: null,
        router_name: null,
        router_mac: null,
        updated_at: new Date().toISOString(),
      })
      .eq('olt_id', oltId)
      .select('id');
    
    if (error) throw error;
    
    logger.info(`Cleared PPPoE data for ${data?.length || 0} ONUs`);
    
    res.json({
      success: true,
      clearedCount: data?.length || 0,
    });
  } catch (error) {
    logger.error('Clear PPPoE error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/clear-pppoe/:oltId', async (req, res) => {
  req.url = `/api/clear-pppoe/${req.params.oltId}`;
  app.handle(req, res);
});

// ============= USER ADMIN ENDPOINTS =============
// Password reset and user management (admin only)

app.post('/api/admin/reset-password', async (req, res) => {
  const { userId, newPassword, requestingUserId } = req.body;
  
  try {
    // Verify requesting user is admin
    if (!requestingUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const adminCheck = await isUserAdmin(supabase, requestingUserId);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Only admins can reset user passwords' });
    }
    
    // Update password
    const result = await updateUserPassword(userId, newPassword);
    res.json(result);
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/reset-password', async (req, res) => {
  req.url = '/api/admin/reset-password';
  app.handle(req, res);
});

// ============= NOTIFICATION ENDPOINTS =============
// Test notification channels

app.post('/api/notifications/test-smtp', async (req, res) => {
  const { toEmail } = req.body;
  
  try {
    const settings = await getNotificationSettings(supabase);
    
    if (!settings.smtpHost) {
      return res.status(400).json({ success: false, error: 'SMTP not configured. Please configure SMTP settings first.' });
    }
    
    // Test connection first
    const connectionTest = await testSmtpConnection(settings);
    if (!connectionTest.success) {
      return res.json({ success: false, error: `SMTP connection failed: ${connectionTest.error}` });
    }
    
    // Send test email
    const result = await sendTestEmail(settings, toEmail || settings.notificationEmail);
    res.json(result);
  } catch (error) {
    logger.error('SMTP test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notifications/test-telegram', async (req, res) => {
  try {
    const settings = await getNotificationSettings(supabase);
    
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      return res.status(400).json({ success: false, error: 'Telegram not configured. Please add Bot Token and Chat ID.' });
    }
    
    const result = await sendTestTelegram(settings);
    res.json(result);
  } catch (error) {
    logger.error('Telegram test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notifications/test-whatsapp', async (req, res) => {
  try {
    const settings = await getNotificationSettings(supabase);
    
    if (!settings.whatsappApiUrl || !settings.whatsappPhoneNumber) {
      return res.status(400).json({ success: false, error: 'WhatsApp not configured. Please add API URL and phone number.' });
    }
    
    const result = await sendTestWhatsApp(settings);
    res.json(result);
  } catch (error) {
    logger.error('WhatsApp test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current notification settings (for admin panel)
app.get('/api/notifications/settings', async (req, res) => {
  try {
    const settings = await getNotificationSettings(supabase);
    // Mask sensitive fields
    res.json({
      ...settings,
      smtpPassword: settings.smtpPassword ? '********' : '',
      telegramBotToken: settings.telegramBotToken ? '********' : '',
      whatsappApiKey: settings.whatsappApiKey ? '********' : '',
    });
  } catch (error) {
    logger.error('Get notification settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= SMART POLLING BASED ON SETTINGS =============
// Reads pollingMode from system_settings:
// - 'on_demand': No cron polling, only manual/view-triggered
// - 'light_cron': Light status-only poll at interval
// - 'full_cron': Full data poll at interval

let cronJob = null;

async function getPollingSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['pollingMode', 'cronIntervalMinutes', 'backgroundPolling']);
    
    if (error) {
      logger.warn('Failed to fetch polling settings:', error.message);
      return { pollingMode: 'on_demand', cronIntervalMinutes: 10, backgroundPolling: false };
    }
    
    const settings = {};
    for (const row of data || []) {
      const val = row.value;
      settings[row.key] = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
    }
    
    return {
      pollingMode: settings.pollingMode || 'on_demand',
      cronIntervalMinutes: settings.cronIntervalMinutes || 10,
      backgroundPolling: settings.backgroundPolling !== false,
    };
  } catch (err) {
    logger.error('Error fetching polling settings:', err);
    return { pollingMode: 'on_demand', cronIntervalMinutes: 10, backgroundPolling: false };
  }
}

async function setupCronPolling() {
  const settings = await getPollingSettings();
  
  // Clear existing cron job if any
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Cleared existing cron job');
  }
  
  if (settings.pollingMode === 'on_demand') {
    logger.info('📴 Polling mode: ON-DEMAND - No background cron (OLT/MikroTik load minimized)');
    return;
  }
  
  const intervalMinutes = Math.max(5, settings.cronIntervalMinutes);
  const cronExpression = `*/${intervalMinutes} * * * *`;
  
  if (settings.pollingMode === 'light_cron') {
    logger.info(`⚡ Polling mode: LIGHT CRON - Status-only poll every ${intervalMinutes} min`);
    cronJob = cron.schedule(cronExpression, () => {
      logger.info('Light cron poll triggered (status/DBM only)');
      pollAllOLTsLight(); // Light poll
    });
  } else if (settings.pollingMode === 'full_cron') {
    logger.info(`🔄 Polling mode: FULL CRON - Complete poll every ${intervalMinutes} min`);
    cronJob = cron.schedule(cronExpression, () => {
      logger.info('Full cron poll triggered');
      pollAllOLTs(); // Full poll
    });
  }
}

// Light polling function - only fetches status and DBM, minimal OLT load
async function pollAllOLTsLight() {
  if (pollingStatus.isPolling) {
    logger.warn('Light poll skipped - already polling');
    return;
  }
  
  pollingStatus.isPolling = true;
  
  try {
    const { data: olts, error } = await supabase
      .from('olts')
      .select('*')
      .eq('status', 'online');
    
    if (error) throw error;
    
    logger.info(`Light poll: ${olts?.length || 0} online OLTs`);
    
    // For light poll, we only update status from MikroTik (much faster, no OLT CLI)
    for (const olt of olts || []) {
      if (olt.mikrotik_ip && olt.mikrotik_username) {
        try {
          const mikrotik = {
            ip: olt.mikrotik_ip,
            port: olt.mikrotik_port || 8728,
            username: olt.mikrotik_username,
            password: olt.mikrotik_password_encrypted,
          };
          
          // Only fetch PPPoE active sessions (very fast)
          const { pppoe } = await fetchAllMikroTikData(mikrotik);
          
          // Update ONU status based on PPPoE sessions
          const activeUsers = new Set(pppoe.map(p => p.pppoe_username?.toLowerCase()).filter(Boolean));
          
          // Fetch ONUs for this OLT
          const { data: onus } = await supabase
            .from('onus')
            .select('id, pppoe_username, status')
            .eq('olt_id', olt.id);
          
          // Update status for ONUs with PPPoE users
          for (const onu of onus || []) {
            if (onu.pppoe_username) {
              const isActive = activeUsers.has(onu.pppoe_username.toLowerCase());
              const newStatus = isActive ? 'online' : 'offline';
              if (onu.status !== newStatus) {
                await supabase
                  .from('onus')
                  .update({ status: newStatus, updated_at: new Date().toISOString() })
                  .eq('id', onu.id);
              }
            }
          }
          
          logger.debug(`Light poll ${olt.name}: ${activeUsers.size} active PPPoE sessions`);
        } catch (err) {
          logger.warn(`Light poll failed for ${olt.name}: ${err.message}`);
        }
      }
    }
    
    pollingStatus.lastPollTime = new Date().toISOString();
    logger.info('Light poll complete');
  } catch (err) {
    logger.error('Light poll error:', err);
  } finally {
    pollingStatus.isPolling = false;
  }
}

// Endpoint to refresh polling settings (call after settings change)
app.post('/api/refresh-polling-settings', async (req, res) => {
  logger.info('Refreshing polling settings...');
  await setupCronPolling();
  const settings = await getPollingSettings();
  res.json({ success: true, settings });
});

app.post('/refresh-polling-settings', async (req, res) => {
  req.url = '/api/refresh-polling-settings';
  app.handle(req, res);
});

// ============= SMS PROCESSING CRON =============
// Process pending SMS every 10 seconds for near-instant delivery
cron.schedule('*/10 * * * * *', async () => {
  try {
    await processPendingSMS(supabase);
  } catch (err) {
    logger.error('SMS processing error:', err);
  }
});

// ============= AUTH / SIGNUP ENDPOINTS =============
// Completes SaaS signup by creating tenant + linking user (uses service key, so avoids RLS issues on client)
app.post('/api/auth/complete-signup', async (req, res) => {
  try {
    const {
      user_id,
      email,
      company_name,
      owner_name,
      phone,
      division,
      district,
      upazila,
      address,
      package_id,
      billing_cycle,
      trial_days,
    } = req.body || {};

    if (!user_id || !email || !company_name || !owner_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Idempotency: if user already linked, return existing tenant
    const { data: existingLink } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingLink?.tenant_id) {
      return res.json({ success: true, tenant_id: existingLink.tenant_id, existing: true });
    }

    // Verify user exists (prevents creating tenants for non-existent users)
    const { data: userResult, error: userErr } = await supabase.auth.admin.getUserById(user_id);
    if (userErr || !userResult?.user) {
      return res.status(400).json({ success: false, error: 'Invalid user' });
    }
    if ((userResult.user.email || '').toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Email mismatch' });
    }

    // Platform setting: Require Email Verification
    // If disabled, auto-confirm the user's email via admin API so they can login immediately.
    try {
      const { data: settingsRow } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_settings')
        .maybeSingle();

      const requireEmailVerification = !!(settingsRow?.value && (settingsRow.value).requireEmailVerification);

      if (!requireEmailVerification) {
        const { error: confirmErr } = await supabase.auth.admin.updateUserById(user_id, {
          email_confirm: true,
        });
        if (confirmErr) {
          logger.warn('Auto email confirm failed:', confirmErr.message);
        }
      }
    } catch (e) {
      logger.warn('Could not read platform_settings for email verification:', e?.message || e);
    }

    const trialDaysNum = Number.isFinite(Number(trial_days)) ? Number(trial_days) : 14;
    const requiresPayment = trialDaysNum === 0;
    const tenantStatus = requiresPayment ? 'pending' : 'trial';
    const trialEndsAt = requiresPayment
      ? null
      : new Date(Date.now() + trialDaysNum * 24 * 60 * 60 * 1000).toISOString();

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: company_name,
        email,
        phone: phone || null,
        owner_name,
        division: division || null,
        district: district || null,
        upazila: upazila || null,
        address: address || null,
        status: tenantStatus,
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      return res.status(400).json({ success: false, error: tenantError?.message || 'Failed to create tenant' });
    }

    const { error: linkError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id,
        role: 'admin',
        is_owner: true,
      });

    if (linkError) {
      return res.status(400).json({ success: false, error: linkError.message || 'Failed to link user' });
    }

    // Initialize default gateways/templates (ignore failure, but log it)
    try {
      await supabase.rpc('initialize_tenant_gateways', { _tenant_id: tenant.id });
    } catch (e) {
      logger.error('initialize_tenant_gateways failed:', e);
    }

    // Optional: create subscription + invoice (so signup works even if client is not yet authenticated)
    if (package_id) {
      const { data: pkg } = await supabase
        .from('packages')
        .select('id, name, price_monthly, price_yearly')
        .eq('id', package_id)
        .single();

      if (pkg) {
        const cycle = billing_cycle === 'yearly' ? 'yearly' : 'monthly';
        const amount = cycle === 'yearly' ? pkg.price_yearly : pkg.price_monthly;

        const startDate = new Date();
        const endDate = new Date();
        if (requiresPayment) {
          endDate.setDate(endDate.getDate() + (cycle === 'monthly' ? 30 : 365));
        } else {
          endDate.setDate(endDate.getDate() + trialDaysNum);
        }

        const subscriptionStatus = requiresPayment ? 'pending' : 'trial';

        const { data: subscription } = await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenant.id,
            package_id,
            status: subscriptionStatus,
            billing_cycle: cycle,
            amount,
            starts_at: startDate.toISOString(),
            ends_at: endDate.toISOString(),
          })
          .select()
          .single();

        if (requiresPayment && subscription) {
          const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
          await supabase.from('invoices').insert({
            tenant_id: tenant.id,
            subscription_id: subscription.id,
            invoice_number: invoiceNumber,
            amount,
            tax_amount: 0,
            total_amount: amount,
            status: 'unpaid',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            line_items: [
              {
                description: `${pkg.name} - ${cycle === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
                quantity: 1,
                unit_price: amount,
                total: amount,
              },
            ],
          });
        }
      }
    }

    return res.json({ success: true, tenant_id: tenant.id, requires_payment: requiresPayment });
  } catch (error) {
    logger.error('Complete signup error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============= PAYMENT GATEWAY ENDPOINTS =============
// Initiate payment
app.post('/api/payments/initiate', async (req, res) => {
  try {
    const {
      gateway,
      amount,
      tenant_id,
      invoice_id,
      customer_id,
      description,
      return_url,
      cancel_url,
      customer_name,
      customer_email,
      customer_phone,
      payment_for,
    } = req.body;

    if (!gateway || !amount || !tenant_id || !return_url) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Build a public base URL for gateway callbacks (handles POST callbacks safely)
    // IMPORTANT: Nginx proxies /olt-polling-server/* to the backend, so we MUST use that path
    // for payment gateway callbacks since they POST to the callback URL.
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://oltapp.isppoint.com';
    
    // Use /olt-polling-server/payments/callback/:gateway because Nginx proxies this path to backend
    const gatewayCallbackUrl = `${baseUrl}/olt-polling-server/payments/callback/${gateway}`;

    const result = await initiatePayment(supabase, gateway, {
      amount,
      tenant_id,
      invoice_id,
      customer_id,
      description,
      return_url,
      cancel_url: cancel_url || return_url,
      customer_name,
      customer_email,
      customer_phone,
      payment_for,
      gateway_callback_url: gatewayCallbackUrl,
    });

    res.json(result);
  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Also without /api prefix
app.post('/payments/initiate', async (req, res) => {
  req.url = '/api/payments/initiate';
  app.handle(req, res);
});

// Payment callback handler (GET for redirects)
app.get('/api/payments/callback/:gateway', async (req, res) => {
  try {
    const { gateway } = req.params;
    const callbackData = req.query;

    const result = await handlePaymentCallback(supabase, gateway, callbackData);

    if (result.redirect_url) {
      return res.redirect(result.redirect_url);
    }

    res.json(result);
  } catch (error) {
    logger.error('Payment callback error:', error);
    res.redirect('/?status=error&message=' + encodeURIComponent(error.message));
  }
});

// Payment callback handler (POST for gateways that POST to success/fail URLs)
app.post('/api/payments/callback/:gateway', async (req, res) => {
  try {
    const { gateway } = req.params;
    const callbackData = { ...req.query, ...req.body };

    const result = await handlePaymentCallback(supabase, gateway, callbackData);

    const accept = (req.headers.accept || '').toString();
    const wantsHtml = accept.includes('text/html') || accept.includes('*/*');

    if (result.redirect_url && wantsHtml) {
      return res.redirect(result.redirect_url);
    }

    return res.json(result);
  } catch (error) {
    logger.error('Payment IPN error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Without /api prefix
app.get('/payments/callback/:gateway', async (req, res) => {
  req.url = '/api/payments/callback/' + req.params.gateway;
  req.params = { gateway: req.params.gateway };
  try {
    const callbackData = req.query;
    const result = await handlePaymentCallback(supabase, req.params.gateway, callbackData);
    if (result.redirect_url) {
      return res.redirect(result.redirect_url);
    }
    res.json(result);
  } catch (error) {
    logger.error('Payment callback error:', error);
    res.redirect('/?status=error&message=' + encodeURIComponent(error.message));
  }
});

app.post('/payments/callback/:gateway', async (req, res) => {
  try {
    const { gateway } = req.params;
    const callbackData = { ...req.query, ...req.body };
    const result = await handlePaymentCallback(supabase, gateway, callbackData);

    const accept = (req.headers.accept || '').toString();
    const wantsHtml = accept.includes('text/html') || accept.includes('*/*');

    if (result.redirect_url && wantsHtml) {
      return res.redirect(result.redirect_url);
    }

    res.json(result);
  } catch (error) {
    logger.error('Payment IPN error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BKASH PGW CHECKOUT.JS EXECUTE ENDPOINT =============
// Called from frontend after customer confirms payment in bKash popup
app.post('/api/payments/bkash/execute', async (req, res) => {
  try {
    const { paymentID, transaction_id, tenant_id } = req.body;

    if (!paymentID || !transaction_id) {
      return res.status(400).json({ success: false, error: 'Missing paymentID or transaction_id' });
    }

    // Find the pending payment
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', transaction_id)
      .single();

    if (findError || !payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const gatewayResponse = payment.gateway_response || {};
    const bkashConfig = gatewayResponse?.gateway_init?.bkash_config;

    if (!bkashConfig) {
      return res.status(400).json({ success: false, error: 'bKash config not found' });
    }

    // Get tenant gateway to find credentials
    const { data: tenantGateway } = await supabase
      .from('tenant_payment_gateways')
      .select('*')
      .eq('tenant_id', tenant_id || payment.tenant_id)
      .eq('gateway', 'bkash')
      .single();

    if (!tenantGateway) {
      return res.status(400).json({ success: false, error: 'bKash gateway not configured' });
    }

    const config = tenantGateway.config || {};
    const isSandbox = tenantGateway.sandbox_mode !== false;
    const baseUrl = isSandbox 
      ? 'https://checkout.sandbox.bka.sh/v1.2.0-beta'
      : 'https://checkout.pay.bka.sh/v1.2.0-beta';

    // Get fresh token
    const grantResponse = await fetch(`${baseUrl}/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: config.username,
        password: config.password,
      },
      body: JSON.stringify({
        app_key: config.app_key,
        app_secret: config.app_secret,
      }),
    });

    const grantData = await grantResponse.json();

    if (!grantData.id_token) {
      logger.error('bKash execute - token grant failed:', grantData);
      return res.status(400).json({ success: false, error: 'Failed to get bKash token' });
    }

    // Execute payment
    const executeResponse = await fetch(`${baseUrl}/checkout/payment/execute/${paymentID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: grantData.id_token,
        'X-App-Key': config.app_key,
      },
    });

    const executeData = await executeResponse.json();
    logger.info('bKash execute response:', executeData);

    const isSuccess = executeData.transactionStatus === 'Completed';

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: isSuccess ? 'completed' : 'failed',
        paid_at: isSuccess ? new Date().toISOString() : null,
        gateway_response: {
          ...gatewayResponse,
          execute_response: executeData,
          completed_at: new Date().toISOString(),
        },
      })
      .eq('id', payment.id);

    // Handle subscription/invoice update if successful
    if (isSuccess && payment.invoice_number) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, subscription_id')
        .eq('invoice_number', payment.invoice_number)
        .single();

      if (invoice) {
        await supabase
          .from('invoices')
          .update({ status: 'paid', paid_at: new Date().toISOString(), payment_id: payment.id })
          .eq('id', invoice.id);

        if (invoice.subscription_id) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', invoice.subscription_id);
        }
      }
    }

    const returnUrl = gatewayResponse.return_url || '/billing/history';
    const redirectUrl = isSuccess
      ? `${returnUrl}?status=success&payment_id=${payment.id}`
      : `${returnUrl}?status=failed&payment_id=${payment.id}`;

    res.json({
      success: isSuccess,
      payment_id: payment.id,
      trxID: executeData.trxID,
      transactionStatus: executeData.transactionStatus,
      redirect_url: redirectUrl,
    });
  } catch (error) {
    logger.error('bKash execute error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Also without /api prefix
app.post('/payments/bkash/execute', (req, res) => {
  req.url = '/api/payments/bkash/execute';
  app.handle(req, res);
});

// ============= BKASH PGW CHECKOUT REDIRECT ENDPOINT =============
// For bKash PGW Checkout.js mode - get redirect URL for payment
app.post('/api/payments/bkash/checkout-redirect', async (req, res) => {
  try {
    const { paymentID, payment_id, tenant_id, return_url } = req.body;

    if (!paymentID) {
      return res.status(400).json({ success: false, error: 'Missing paymentID' });
    }

    // Find payment record by payment_id if provided
    let payment = null;
    if (payment_id) {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment_id)
        .single();
      payment = data;
    }

    // Get gateway config
    const targetTenantId = tenant_id || payment?.tenant_id;
    let config = null;
    let isSandbox = true;

    if (targetTenantId) {
      const { data: tenantGateway } = await supabase
        .from('tenant_payment_gateways')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .eq('gateway', 'bkash')
        .eq('is_enabled', true)
        .single();

      if (tenantGateway) {
        config = tenantGateway.config || {};
        isSandbox = tenantGateway.sandbox_mode !== false;
      }
    }

    if (!config) {
      // Try global gateway
      const { data: globalGateway } = await supabase
        .from('payment_gateway_settings')
        .select('*')
        .eq('gateway', 'bkash')
        .eq('is_enabled', true)
        .single();

      if (globalGateway) {
        config = globalGateway.config || {};
        isSandbox = globalGateway.sandbox_mode !== false;
      }
    }

    if (!config || !config.app_key) {
      return res.status(400).json({ success: false, error: 'bKash gateway not configured' });
    }

    const baseUrl = isSandbox 
      ? 'https://checkout.sandbox.bka.sh/v1.2.0-beta'
      : 'https://checkout.pay.bka.sh/v1.2.0-beta';

    // Get fresh token
    const grantResponse = await fetch(`${baseUrl}/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: config.username,
        password: config.password,
      },
      body: JSON.stringify({
        app_key: config.app_key,
        app_secret: config.app_secret,
      }),
    });

    const grantData = await grantResponse.json();
    logger.info('bKash checkout-redirect grant response:', grantData);

    if (!grantData.id_token) {
      return res.status(400).json({ success: false, error: grantData.statusMessage || 'Failed to get bKash token' });
    }

    // For PGW Checkout mode, the bkashURL from create response should be used
    // If we have it stored in payment record, use that
    const gatewayResponse = payment?.gateway_response || {};
    const gatewayInit = gatewayResponse.gateway_init || {};
    const bkashConfig = gatewayInit.bkash_config || {};

    if (bkashConfig.paymentID === paymentID) {
      // We already have the payment created, now we need to get the redirect URL
      // For PGW mode, there's no direct redirect URL - the popup is required
      // But for simplicity, we can try to query payment status or recreate
    }

    // Query payment to get bkashURL if available
    const queryResponse = await fetch(`${baseUrl}/checkout/payment/query/${paymentID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: grantData.id_token,
        'X-App-Key': config.app_key,
      },
    });

    const queryData = await queryResponse.json();
    logger.info('bKash payment query response:', queryData);

    // For PGW Checkout, payment needs to be executed after user authorizes
    // Return information for client to handle
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'https://oltapp.isppoint.com';
    const callbackUrl = `${publicBaseUrl}/olt-polling-server/payments/callback/bkash`;

    res.json({
      success: true,
      paymentID,
      paymentStatus: queryData.transactionStatus,
      bkashURL: queryData.bkashURL || null,
      // For PGW mode, provide execute endpoint
      execute_url: `${publicBaseUrl}/olt-polling-server/api/payments/bkash/execute`,
      redirect_url: return_url ? `${return_url}?payment_id=${payment_id || paymentID}` : null,
    });
  } catch (error) {
    logger.error('bKash checkout-redirect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/payments/bkash/checkout-redirect', (req, res) => {
  req.url = '/api/payments/bkash/checkout-redirect';
  app.handle(req, res);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  logger.info(`OLT Polling Server running on port ${PORT}`);
  logger.info(`Supabase URL: ${process.env.SUPABASE_URL}`);
  
  // Setup cron polling based on settings
  await setupCronPolling();
  
  // Process any pending SMS on startup
  processPendingSMS(supabase).catch(err => logger.warn('Initial SMS processing failed:', err));
  
  // NO initial poll - wait for user to trigger manually or view ONU page
  logger.info('✅ Server ready - polling will be triggered on-demand or by cron settings');
  logger.info('✅ SMS processing active - checking every 10 seconds');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});
