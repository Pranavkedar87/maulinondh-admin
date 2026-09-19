import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://uslbhkglghyanyvkcsvi.supabase.co';
const DEFAULT_KEY = 'sb_publishable_21fMtChUUqqNatMvTtp74A_NgA81HdI';

const getEnvVar = (key, defaultVal) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return defaultVal;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', DEFAULT_URL);
const supabaseKey = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', getEnvVar('VITE_SUPABASE_ANON_KEY', DEFAULT_KEY));

export const supabase = createClient(supabaseUrl, supabaseKey);
