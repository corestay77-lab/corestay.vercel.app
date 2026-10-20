import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const SUPABASE_URL = "https://vkejwklhijophavlosze.supabase.co";
const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Silakan login sebelum mengunggah laporan." }, { status: 401 });
    }
    const token = authorization.slice(7).trim();
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!token || !supabaseKey) {
      return NextResponse.json({ error: "Sesi atau konfigurasi autentikasi tidak tersedia." }, { status: 401 });
    }
    const supabase = createClient(SUPABASE_URL, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer " + token } }
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ error: "Sesi login tidak valid atau kedaluwarsa. Silakan login kembali." }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("hotel-budget-email-reports/")) {
          throw new Error("Lokasi unggah tidak diizinkan.");
        }
        let metadata: { fileName?: string } = {};
        try {
          metadata = clientPayload ? JSON.parse(clientPayload) : {};
        } catch {
          throw new Error("Metadata file tidak valid.");
        }
        if (metadata.fileName && !metadata.fileName.toLowerCase().endsWith(".pdf")) {
          throw new Error("Hanya file PDF yang dapat diunggah.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: data.user.id })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!blob.pathname.startsWith("hotel-budget-email-reports/") || !tokenPayload) {
          throw new Error("Validasi unggahan tidak berhasil.");
        }
      }
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("CoreStay report upload failed:", error);
    const message = error instanceof Error ? error.message : "Gagal mengunggah PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
