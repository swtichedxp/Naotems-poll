import { createClient } from '@supabase/supabase-js';

// **IMPORTANT: Replace these placeholders with your actual keys from your Supabase Project Settings -> API**
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// You can use environment variables in Next.js for security. 
// If you cannot set them easily on your phone, temporarily use the direct strings, 
// but ensure you move them to Vercel Environment Variables later.
