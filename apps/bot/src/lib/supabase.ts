import { createClient } from "@supabase/supabase-js";
import { getBotRuntimeConfig } from "../config";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = getBotRuntimeConfig();
  supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}
