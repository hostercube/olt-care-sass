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
import { testMikrotikConnection, fetchAllMikroTikData } from './polling/mikrotik-client.js';
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
