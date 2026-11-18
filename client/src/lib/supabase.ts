import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être configurées.");
}

export const supabase = createClient(url || "https://example.supabase.co", key || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
