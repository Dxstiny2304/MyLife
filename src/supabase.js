import { createClient } from '@supabase/supabase-js'

// Публичный ключ (publishable). Он предназначен для браузера; данные защищены правилами доступа в базе.
export const SUPABASE_URL = 'https://dewtqqpdlcamfuzmftfr.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_w-ytsCaN_h55B-AYWQ0YzQ_NDvVFsp4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
