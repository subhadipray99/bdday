import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

function getConfigurationError() {
  if (!url || !anon) {
    return 'Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the project Vars settings, then restart the preview or redeploy.'
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') return null
  } catch {
    // Report invalid configuration in the UI instead of crashing during import.
  }

  return 'NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL. Update it in the project Vars settings, then restart the preview or redeploy.'
}

export const supabaseConfigurationError = getConfigurationError()

export const supabase = supabaseConfigurationError ? null : createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
