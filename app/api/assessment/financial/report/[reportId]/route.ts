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

export async function GET(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const authUser = await getUser(request);
    if (!authUser) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

    const client = adminClient();
    const supabase = client || createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: authUser.auth } } }
    );

    const query = supabase
      .from("assessment_reports")
      .select("id,user_id,pdf_base64,file_name,assessment_type")
      .eq("id", params.reportId)
      .eq("user_id", authUser.user.id)
      .eq("assessment_type", "financial")
      .maybeSingle();

    const { data, error } = await query;
    if (error) {
      console.error("Financial report GET failed:", error);
      return NextResponse.json({ error: "Laporan tidak dapat diakses." }, { status: 500 });
    }
    if (!data?.pdf_base64) {
      return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    const pdf = Buffer.from(data.pdf_base64, "base64");
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CoreStay-Financial-Assessment.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Financial report GET error:", error);
    return NextResponse.json({ error: "Laporan gagal diproses." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const authUser = await getUser(request);
    if (!authUser) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

    const client = adminClient();
    const supabase = client || createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: authUser.auth } } }
    );

    const { data: existing, error: lookupError } = await supabase
      .from("assessment_reports")
      .select("id,user_id,assessment_type")
      .eq("id", params.reportId)
      .eq("user_id", authUser.user.id)
      .eq("assessment_type", "financial")
      .maybeSingle();

    if (lookupError) {
      console.error("Financial report DELETE lookup failed:", lookupError);
      return NextResponse.json({ error: "Data assessment tidak dapat diperiksa." }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Laporan tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("assessment_reports")
      .delete()
      .eq("id", params.reportId)
      .eq("user_id", authUser.user.id)
      .eq("assessment_type", "financial");

    if (deleteError) {
      console.error("Financial report DELETE failed:", deleteError);
      return NextResponse.json({ error: "Data assessment gagal dihapus." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedReportId: params.reportId,
      message: "Laporan berhasil dihapus.",
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Financial report DELETE error:", error);
    return NextResponse.json({ error: "Data assessment gagal dihapus." }, { status: 500 });
  }
}
