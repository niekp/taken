import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://beovxcpqruwxznrbtmxs.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gvgN1Uz9BFkM7L_NYIR2qA_NZPfjVVc'

export const supabase = createClient(supabaseUrl, supabaseKey)
