import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://kuebluheeazmnxszonfu.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZWJsdWhlZWF6bW54c3pvbmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTkzMDYsImV4cCI6MjA5MTI5NTMwNn0.Z4S-sVx6Ln2gXZ5KrdW_TRawV8cdpUr1WegiV_x2R8Y';

export const supabase = createClient(url, key);
