import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 30;
const SUPABASE_URL = "https://vkejwklhijophavlosze.supabase.co";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Silakan login sebelum mengirim laporan melalui email." }, { status: 401 });
    }
    const token = authorization.slice(7).trim();
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!token || !supabaseKey) {
      return NextResponse.json({ success: false, error: "Sesi atau konfigurasi autentikasi tidak tersedia." }, { status: 401 });
    }
    const supabase = createClient(SUPABASE_URL, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer " + token } }
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ success: false, error: "Sesi login tidak valid atau kedaluwarsa. Silakan login kembali." }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.HOTEL_BUDGET_EMAIL_FROM;
    if (!apiKey || !from) {
      return NextResponse.json({ success: false, error: "Pengiriman email belum dikonfigurasi. Admin perlu mengatur RESEND_API_KEY dan HOTEL_BUDGET_EMAIL_FROM di Vercel." }, { status: 503 });
    }

    const body = await request.json();
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    const hotelName = typeof body?.hotelName === "string" ? body.hotelName.trim().slice(0, 180) : "Hotel";
    const period = typeof body?.period === "string" ? body.period.trim().slice(0, 100) : "";
    const yearStart = typeof body?.yearStart === "string" || typeof body?.yearStart === "number" ? String(body.yearStart).slice(0, 4) : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) : "CoreStay-Hotel-Budget.pdf";
    const pdfBase64 = typeof body?.pdfBase64 === "string" ? body.pdfBase64 : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ success: false, error: "Alamat email penerima tidak valid." }, { status: 400 });
    }
    if (!pdfBase64 || pdfBase64.length > 36_000_000) {
      return NextResponse.json({ success: false, error: "File PDF kosong atau melebihi batas 25 MB." }, { status: 413 });
    }
    const pdf = Buffer.from(pdfBase64, "base64");
    if (pdf.length > 25 * 1024 * 1024 || pdf.length < 5 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ success: false, error: "Lampiran bukan file PDF yang valid atau ukurannya melebihi 25 MB." }, { status: 400 });
    }

    const resend = new Resend(apiKey);
    const safeHotel = hotelName || "Hotel";
    const subject = "Laporan Akhir Hotel Budget — " + safeHotel + (period ? " · " + period : "");
    const result = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><h2 style="color:#17365D">CORESTAY ADVISORY</h2><p>Yth. Penerima,</p><p>Terlampir laporan akhir <strong>Hotel Budget &amp; Financial Report</strong> untuk <strong>${safeHotel.replace(/[<>&"]/g, "")}</strong>, periode ${(period || yearStart || "—").replace(/[<>&"]/g, "")}.</p><p>Dokumen PDF ini dikirim sesuai file yang dipilih dari Preview / Print PDF.</p><p>Hormat kami,<br/><strong>CoreStay Advisory</strong></p><p style="font-size:11px;color:#64748b">Dokumen ini bersifat rahasia dan ditujukan untuk penerima yang tercantum.</p></div>`,
      attachments: [{ filename: fileName.toLowerCase().endsWith(".pdf") ? fileName : fileName + ".pdf", content: pdf }]
    });
    if (result.error) {
      console.error("CoreStay Hotel Budget email failed:", result.error);
      return NextResponse.json({ success: false, error: "Email tidak berhasil dikirim. Periksa konfigurasi pengirim dan domain email di Resend." }, { status: 502 });
    }
    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error("CoreStay Hotel Budget email route failed:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan saat mengirim email laporan." }, { status: 500 });
  }
}
