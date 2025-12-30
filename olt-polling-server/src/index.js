import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { pollOLT, testOLTConnection } from './polling/olt-poller.js';
import { testMikrotikConnection } from './polling/mikrotik-client.js';
import { logger } from './utils/logger.js';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the project root (one level up from src/)
const envPath = join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Failed to load .env file from:', envPath);
  console.error('Error:', result.error.message);
} else {
  console.log('.env loaded successfully from:', envPath);
}

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is not set!');
  console.error('Please check your .env file at:', envPath);
  console.error('Current env vars:', Object.keys(process.env).filter(k => k.includes('SUPA')));
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY is not set!');
  console.error('Please check your .env file at:', envPath);
  process.exit(1);
}

console.log('Supabase URL:', process.env.SUPABASE_URL);

const app = express();
app.use(cors());
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
