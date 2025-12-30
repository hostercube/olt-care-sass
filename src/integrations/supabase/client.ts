// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://srofhdgdraihxgpmpdye.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2ZoZGdkcmFpaHhncG1wZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODI1MDUsImV4cCI6MjA4MjY1ODUwNX0.EYIvK99xo_mCNdNslb5sWNEGAm5-kBz5Dfr0878J0kw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
