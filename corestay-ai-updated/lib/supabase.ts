import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vkejwklhijophavlosze.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
