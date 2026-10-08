import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || "";
    let userId = "";
    if (auth.startsWith("Bearer ")) {
      try {
        const supabase = createClient(
          "https://vkejwklhijophavlosze.supabase.co",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
          { global: { headers: { Authorization: auth } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || "";
      } catch {}
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File PDF belum dipilih." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File harus berformat PDF." }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran PDF maksimal 4 MB." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "report.pdf";
    const pathname = `financial-reports/${userId || "anonymous"}/${crypto.randomUUID()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      success: true,
      pathname: blob.pathname,
      url: blob.url,
    });
  } catch (error) {
    console.error("Financial Blob server upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload PDF gagal." },
      { status: 500 }
    );
  }
}
