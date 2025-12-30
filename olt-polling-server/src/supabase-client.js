/**
 * Supabase Client for OLT Polling Server
 * This module exports a lazily-initialized Supabase client
 */
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Create Supabase client using config (env vars already loaded)
export const supabase = createClient(config.supabaseUrl, config.supabaseKey);

console.log('✓ Supabase client initialized');
