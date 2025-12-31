/**
 * Configuration loader - MUST be imported first in index.js
 * This ensures environment variables are loaded before any other modules
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible .env locations
const possibleEnvPaths = [
  join(__dirname, '..', '.env'),           // /src/../.env (project root)
  join(process.cwd(), '.env'),              // Current working directory
  '/var/www/olt.isppoint.com/olt-polling-server/.env',  // Absolute path
];

let envLoaded = false;
let loadedPath = null;

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      loadedPath = envPath;
      console.log(`✓ Successfully loaded .env from: ${envPath}`);
      break;
    } else {
      console.error(`Failed to parse .env at ${envPath}:`, result.error.message);
    }
  }
}

if (!envLoaded) {
  console.error('==============================================');
  console.error('ERROR: Could not find or load .env file!');
  console.error('Searched paths:');
  possibleEnvPaths.forEach(p => console.error(`  - ${p}`));
  console.error('==============================================');
  console.error('Current directory:', process.cwd());
  console.error('Script directory:', __dirname);
}

// Print loaded environment for debugging
console.log('==============================================');
console.log('Environment Configuration:');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ NOT SET');
console.log(
  '  SUPABASE_SERVICE_KEY:',
  (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? '✓ Set (hidden)'
    : '✗ NOT SET'
);
console.log('  PORT:', process.env.PORT || '3001 (default)');
console.log('  POLLING_INTERVAL_MS:', process.env.POLLING_INTERVAL_MS || '60000 (default)');
console.log('==============================================');

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('\n❌ FATAL ERROR: SUPABASE_URL is not set!');
  console.error('Please ensure your .env file contains:');
  console.error('  SUPABASE_URL=https://<your-backend-url>');

  if (loadedPath) {
    console.error('\nLoaded .env file keys (for debugging):');
    try {
      const content = fs.readFileSync(loadedPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      lines.forEach(line => {
        const [key] = line.split('=');
        if (key) {
          console.error(`  ${key.trim()}=<value>`);
        }
      });
    } catch (e) {
      console.error('  (Could not read file)');
    }
  }

  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('\n❌ FATAL ERROR: SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set!');
  console.error('Please ensure your .env file contains one of these keys:');
  console.error('  SUPABASE_SERVICE_KEY=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

// Export configuration
export const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: serviceKey,
  port: parseInt(process.env.PORT || '3001'),
  pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '60000'),
  sshTimeout: parseInt(process.env.SSH_TIMEOUT_MS || '60000'),
  mikrotikTimeout: parseInt(process.env.MIKROTIK_TIMEOUT_MS || '30000'),
  debug: process.env.DEBUG === 'true',
};

console.log('✓ Configuration loaded successfully');
