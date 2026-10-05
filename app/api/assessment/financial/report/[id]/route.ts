import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://vkejwklhijophavlosze.supabase.co";

async function getUser(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;

  const supabase = createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user, auth };
}

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUser(request);
    if (!authUser) return new NextResponse("Login diperlukan.", { status: 401 });

    const { id } = await params;
    const client = adminClient();
    const supabase = client || createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: authUser.auth } } }
    );

    const { data: existing, error: lookupError } = await supabase
      .from("assessment_reports")
      .select("id")
      .eq("id", id)
      .eq("user_id", authUser.user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Gagal memeriksa assessment:", lookupError);
      return new NextResponse("Data assessment gagal diperiksa.", { status: 500 });
    }

    if (!existing) {
      return new NextResponse("Laporan sudah tidak tersedia atau bukan milik akun ini.", { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("assessment_reports")
      .delete()
      .eq("id", id)
      .eq("user_id", authUser.user.id);

    if (deleteError) {
      console.error("Gagal menghapus assessment:", deleteError);
      return new NextResponse("Data assessment gagal dihapus.", { status: 500 });
    }

    return NextResponse.json(
      { success: true, deletedId: id, message: "Laporan berhasil dihapus." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Financial report DELETE error:", error);
    return new NextResponse("Data assessment gagal dihapus.", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUser(request);
    if (!authUser) return new NextResponse("Login diperlukan.", { status: 401 });

    const { id } = await params;
    const client = adminClient();
    const supabase = client || createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: authUser.auth } } }
    );

    const { data, error } = await supabase
      .from("assessment_reports")
      .select("file_name,pdf_base64")
      .eq("id", id)
      .eq("user_id", authUser.user.id)
      .maybeSingle();

    if (error) {
      console.error("Gagal mengambil laporan:", error);
      return new NextResponse("Laporan tidak dapat diakses.", { status: 500 });
    }

    if (!data?.pdf_base64) {
      return new NextResponse("Laporan tidak ditemukan.", { status: 404 });
    }

    const bytes = Buffer.from(data.pdf_base64, "base64");
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="CoreStay-Financial-Assessment.pdf"',
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Financial report GET error:", error);
    return new NextResponse("Laporan gagal diproses.", { status: 500 });
  }
}
