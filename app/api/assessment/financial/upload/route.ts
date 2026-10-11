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
      return NextResponse.json({ error: "File laporan belum dipilih." }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";
    if (!isPdf && !isExcel) {
      return NextResponse.json({ error: "Format file harus PDF atau Excel (.xlsx, .xls)." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "financial-report";
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
