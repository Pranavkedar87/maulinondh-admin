import { createClient } from '@supabase/supabase-js'

const isNode = typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL;
const supabaseUrl = isNode ? process.env.VITE_SUPABASE_URL : (import.meta.env?.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co');
const supabaseKey = isNode ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY : (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key');

export const supabase = createClient(supabaseUrl, supabaseKey);
