import { createClient } from '@supabase/supabase-js';

// Pull keys from environment variables (set in Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// **NOTE:** You must ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY 
// are set in your Vercel Environment Variables.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing. Check Vercel settings.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
