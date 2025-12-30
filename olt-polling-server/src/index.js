import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { pollOLT } from './polling/olt-poller.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(express.json());

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    timestamp: new Date().toISOString()
  });
});

// Get polling status
app.get('/status', (req, res) => {
  res.json(pollingStatus);
});

// Poll specific OLT
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

// Poll all OLTs
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
  
  // Run initial poll after startup
  setTimeout(() => {
    logger.info('Running initial poll...');
    pollAllOLTs();
  }, 5000);
});
