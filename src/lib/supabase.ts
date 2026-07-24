import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!rawUrl || !rawKey) {
  console.error('Missing Supabase environment variables!');
}

const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

// Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Startup connection test
supabase.auth.getUser().catch((err) => {
  console.error('Supabase connection test failed:', err);
});
