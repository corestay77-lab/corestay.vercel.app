import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return createClient(
    "https://vkejwklhijophavlosze.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
    { global: { headers: { Authorization: auth } } }
  );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase(request);
  if (!supabase) return new NextResponse("Login diperlukan.", { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Session tidak valid.", { status: 401 });

  const { id } = await params;

  const { data: deleted, error } = await supabase
    .from("assessment_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Gagal menghapus assessment:", error);
    return new NextResponse("Data assessment gagal dihapus.", { status: 500 });
  }

  if (!deleted) {
    return new NextResponse("Laporan sudah tidak tersedia atau bukan milik akun ini.", { status: 404 });
  }

  return NextResponse.json({ success: true, deletedId: deleted.id });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase(request);
  if (!supabase) return new NextResponse("Login diperlukan.", { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Session tidak valid.", { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("assessment_reports")
    .select("file_name,pdf_base64")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return new NextResponse("Laporan tidak ditemukan.", { status: 404 });

  const bytes = Buffer.from(data.pdf_base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="CoreStay-Financial-Assessment.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
