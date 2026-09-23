import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vkejwklhijophavlosze.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  // Jangan throw di sini: ini kode dijalankan saat build/prerender juga,
  // bukan cuma di browser. Kalau env var belum di-set, cukup beri warning
  // supaya build tetap jalan; fitur yang butuh Supabase akan gagal secara
  // graceful saat benar-benar dipakai, bukan menggagalkan seluruh deployment.
  console.warn(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan. Fitur yang bergantung pada Supabase (misalnya halaman /admin) tidak akan berfungsi sampai environment variable ini di-set di Vercel."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || "missing-anon-key"
);
