import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }

    const supabase = createClient(
      "https://vkejwklhijophavlosze.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: auth } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: "File PDF belum dipilih." }, { status: 400 });
    }

    const isPdf = entry.type === "application/pdf" || entry.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "File harus berformat PDF." }, { status: 400 });
    }

    const safeName = entry.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `financial-reports/${user.id}/${Date.now()}-${safeName}`;
    const blob = await put(pathname, entry, { access: "private", addRandomSuffix: false });

    return NextResponse.json({ success: true, pathname: blob.pathname, fileName: entry.name });
  } catch (error) {
    console.error("Financial upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload PDF gagal." },
      { status: 500 }
    );
  }
}
