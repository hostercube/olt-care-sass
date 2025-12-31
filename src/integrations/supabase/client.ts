/**
 * Supabase Client Configuration
 * 
 * For VPS Deployment: Create .env file with your own Supabase credentials
 * VITE_SUPABASE_URL=https://your-project-id.supabase.co
 * VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
 * 
 * The fallback values use YOUR personal Supabase project (srofhdgdraihxgpmpdye)
 */
import { createClient } from "@supabase/supabase-js";

// Priority: Environment variable > Fallback to YOUR Supabase project
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://srofhdgdraihxgpmpdye.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw";

// Debug: Log which Supabase project is being used (only in development)
if (import.meta.env.DEV) {
  console.log('Supabase URL:', SUPABASE_URL);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
