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
import { testMikrotikConnection, fetchAllMikroTikData, enrichONUWithMikroTikData, bulkTagPPPSecrets } from './polling/mikrotik-client.js';
import { rebootONU, deauthorizeONU, executeBulkOperation } from './onu-commands.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(cors());
app.use(express.json());

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
    
    let enrichedCount = 0;
    const updates = [];
    const matchMethods = {};
    
    for (const onu of existingONUs || []) {
      const enriched = enrichONUWithMikroTikData(onu, pppoe, arp, dhcp, secrets);
      
      if (enriched.pppoe_username !== onu.pppoe_username || 
          enriched.router_name !== onu.router_name) {
        enrichedCount++;
        updates.push({
          id: onu.id,
          pppoe_username: enriched.pppoe_username,
          router_name: enriched.router_name,
          updated_at: new Date().toISOString(),
        });
        
        // Track match methods
        if (enriched.match_method) {
          matchMethods[enriched.match_method] = (matchMethods[enriched.match_method] || 0) + 1;
        }
      }
    }
    
    // Batch update enriched ONUs
    for (const update of updates) {
      await supabase
        .from('onus')
        .update({
          pppoe_username: update.pppoe_username,
          router_name: update.router_name,
          updated_at: update.updated_at,
        })
        .eq('id', update.id);
    }
    
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
    
    let enrichedCount = 0;
    const matchMethods = {};
    
    for (const onu of existingONUs || []) {
      const enriched = enrichONUWithMikroTikData(onu, pppoe, arp, dhcp, secrets);
      
      if (enriched.pppoe_username !== onu.pppoe_username || 
          enriched.router_name !== onu.router_name) {
        enrichedCount++;
        await supabase
          .from('onus')
          .update({
            pppoe_username: enriched.pppoe_username,
            router_name: enriched.router_name,
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

// Schedule polling based on interval
const intervalMinutes = Math.floor(parseInt(process.env.POLLING_INTERVAL_MS || '60000') / 60000);
const cronExpression = `*/${Math.max(1, intervalMinutes)} * * * *`;

cron.schedule(cronExpression, () => {
  logger.info('Scheduled poll triggered');
  pollAllOLTs();
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`OLT Polling Server running on port ${PORT}`);
  logger.info(`Polling interval: ${process.env.POLLING_INTERVAL_MS || 60000}ms`);
  logger.info(`Supabase URL: ${process.env.SUPABASE_URL}`);
  
  // Run initial poll after startup
  setTimeout(() => {
    logger.info('Running initial poll...');
    pollAllOLTs();
  }, 5000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});
