import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { ACCOUNT_LINES, calculateBudget, numeric, sumGroup } from "@/lib/hotel-budget-final";

export const runtime = "nodejs";
export const maxDuration = 60;
const SUPABASE_URL = "https://vkejwklhijophavlosze.supabase.co";
const ReviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()).max(15),
  warnings: z.array(z.string()).max(15),
  summary: z.string().max(500)
});

async function authenticatedClient(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return { error: NextResponse.json({ error: "Silakan login untuk menyimpan dan membuka laporan." }, { status: 401 }) };
  const token = auth.slice(7).trim();
  if (!token) return { error: NextResponse.json({ error: "Sesi login tidak valid. Silakan login kembali." }, { status: 401 }) };
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return { error: NextResponse.json({ error: "Konfigurasi Supabase belum lengkap di server." }, { status: 503 }) };
  const client = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "Sesi login tidak valid atau sudah kedaluwarsa. Silakan login kembali." }, { status: 401 }) };
  return { client, user: data.user };
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.client.from("hotel_budget_reports")
    .select("id,hotel_name,period_label,calculated_data,validation_data,created_at,form_data")
    .eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(25);
  if (error) {
    console.error("Hotel budget report read failed:", error);
    return NextResponse.json({ error: "Laporan belum dapat dibaca. Pastikan migrasi tabel Hotel Budget sudah dijalankan di Supabase." }, { status: 503 });
  }
  return NextResponse.json({ reports: data || [] });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if ("error" in auth) return auth.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ID laporan tidak valid." }, { status: 400 });
  const { data, error } = await auth.client.from("hotel_budget_reports").delete()
    .eq("id", id).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) {
    console.error("Hotel budget report delete failed:", error);
    return NextResponse.json({ error: "Laporan tidak dapat dihapus." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Laporan tidak ditemukan atau bukan milik akun ini." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if ("error" in auth) return auth.error;
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_500_000) return NextResponse.json({ error: "Data form terlalu besar." }, { status: 413 });
    const body = await request.json();
    const form = body?.form;
    if (!form || typeof form !== "object" || Array.isArray(form) || typeof form.hotelName !== "string" || typeof form.period !== "string" || !form.statistics || !form.accounts) {
      return NextResponse.json({ error: "Struktur form tidak valid." }, { status: 400 });
    }
    if (JSON.stringify(form).length > 1_500_000) return NextResponse.json({ error: "Data form terlalu besar." }, { status: 413 });
    const hotelName = form.hotelName.trim().slice(0, 180);
    const period = form.period.trim().slice(0, 100);
    if (!hotelName || !period) return NextResponse.json({ passed: false, issues: ["Nama hotel dan periode wajib diisi."], warnings: [] }, { status: 422 });
    const stats = form.statistics;
    const yearStart = numeric(form.yearStart);
    if (yearStart === null || !Number.isInteger(yearStart) || yearStart < 1900 || yearStart > 2200) return NextResponse.json({ passed:false, issues:["Tahun awal forecast harus berupa tahun valid antara 1900–2200."], warnings:[] }, { status:422 });
    const days = numeric(stats.days), rooms = numeric(stats.rooms);
    if (days === null || days <= 0 || days > 366) return NextResponse.json({ passed: false, issues: ["Hari operasional harus diisi antara 1–366."], warnings: [] }, { status: 422 });
    if (rooms === null || rooms <= 0 || rooms > 100000) return NextResponse.json({ passed: false, issues: ["Jumlah kamar harus berupa angka positif yang masuk akal."], warnings: [] }, { status: 422 });
    const totalRoomBuild = days * rooms;
    const issues: string[] = [];
    const warnings: string[] = [];
    const statKeys = ["outInventory","houseUse","outOfOrder","complimentary","roomPaid"] as const;
    for (const key of statKeys) {
      const raw = stats[key];
      if (raw === "" || raw === null || raw === undefined) issues.push("Statistik "+key+" wajib diisi. Masukkan 0 jika telah dipastikan tidak ada nilai.");
      else if (numeric(raw) === null) issues.push("Statistik "+key+" harus berupa angka yang valid.");
    }
    const deductions: [string,number][] = ["outInventory","houseUse","outOfOrder"].map(k => [k,numeric(stats[k]) ?? 0] as [string,number]);
    for (const [key,value] of deductions) if (!Number.isFinite(value) || value < 0) issues.push("Statistik "+key+" tidak boleh negatif atau tidak valid.");
    if (deductions.reduce((s,x)=>s+x[1],0)>totalRoomBuild) issues.push("Out of Inventory + House Use + Out of Order melebihi Total Room Build.");
    const roomAvailable=totalRoomBuild-deductions.reduce((s,x)=>s+x[1],0);
    const comp=numeric(stats.complimentary)??0, paid=numeric(stats.roomPaid)??0;
    if (comp<0||paid<0) issues.push("Complimentary dan Room Paid tidak boleh negatif.");
    if (comp+paid>roomAvailable) issues.push("Complimentary + Room Paid melebihi Room Available. Periksa room nights dan statistik inventori.");
    if (!form.confirmAccountReview) issues.push("Centang konfirmasi bahwa seluruh akun yang relevan sudah ditinjau dan akun kosong memang tidak berlaku atau tidak memiliki nilai.");
    const accounts = form.accounts as Record<string, any>;
    for (const line of ACCOUNT_LINES) {
      const row=accounts[line.code] || {};
      for (const column of ["actual","budget","lastYear"] as const) {
        const raw=row[column];
        if (raw===undefined||raw===null||raw==="") continue;
        const value=numeric(raw);
        if (value===null) issues.push(line.code+" "+line.label+": nilai "+column+" bukan angka yang valid.");
        else if (value<0 && !line.allowNegative) issues.push(line.code+" "+line.label+": nilai "+column+" tidak boleh negatif.");
      }
    }
    for (const key of ["roomRevenue","fbRevenue","otherRevenue","costOfSales","payroll","operatingExpenses","overhead"] as const) {
      if (sumGroup(accounts,key,"actual")===null) issues.push("Belum ada nilai Actual pada kelompok "+key+". Isi angka atau masukkan 0 bila telah dipastikan tidak ada transaksi.");
    }
    const calculations=calculateBudget(form);
    if (calculations.roomAvailable!==null && calculations.roomAvailable<0) issues.push("Room Available hasil perhitungan bernilai negatif.");
    if (calculations.occupancy!==null && (calculations.occupancy<0 || calculations.occupancy>100)) issues.push("Occupancy harus berada antara 0% dan 100%.");
    if (calculations.revenue===null || calculations.revenue<=0) issues.push("Total revenue harus lebih dari nol untuk menerbitkan P&L.");
    if (calculations.costs===null) issues.push("Total biaya operasional tidak dapat dihitung dari akun Actual yang diisi.");
    const actualBlankCount=ACCOUNT_LINES.filter(line=>numeric(accounts[line.code]?.actual)===null).length;
    if (actualBlankCount) warnings.push(actualBlankCount+" baris akun Actual kosong. Baris kosong tidak otomatis dianggap nol; pastikan akun yang tidak berlaku sudah ditinjau.");
    if (!Array.isArray(form.forecast?.monthly) || form.forecast.monthly.length!==12) issues.push("Forecast bulanan harus memuat tepat 12 bulan.");
    if (!Array.isArray(form.forecast?.annual) || form.forecast.annual.length!==10) issues.push("Forecast multi-tahun harus memuat tepat 10 tahun.");
    for (const [label,rows,keys] of [
      ["Forecast bulanan",form.forecast?.monthly||[],["occupancy","adr","fbRevenue","otherRevenue","operatingCosts"]],
      ["Forecast tahunan",form.forecast?.annual||[],["occupancy","adr","fbRevenue","otherRevenue","operatingCosts"]]
    ] as [string,any[],string[]][]) {
      for (const row of rows) for (const key of keys) {
        if (row[key]!=="" && row[key]!==null && row[key]!==undefined) {
          const value=numeric(row[key]);
          if (value===null || value<0 || (key==="occupancy" && value>100)) issues.push(label+" "+row.label+" — "+key+" tidak valid.");
        }
      }
    }
    if (issues.length) return NextResponse.json({ passed:false, issues:[...new Set(issues)].slice(0,30), warnings, summary:"Pemeriksaan deterministik gagal. Laporan belum disimpan." }, { status:422 });

    const apiKey=process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ passed:false, issues:["GEMINI_API_KEY tidak tersedia; AI Orchestrator wajib menyelesaikan validasi sebelum penyimpanan."], warnings, error:"Validasi AI belum tersedia. Laporan belum disimpan." }, { status:503 });
    const google=createGoogleGenerativeAI({apiKey});
    const reviewPrompt=`Validasi akhir laporan hotel CoreStay. Jangan mengubah angka, jangan mengarang nilai kosong, dan jangan menyatakan akun kosong sama dengan nol. Periksa konsistensi statistik kamar, occupancy, ADR, RevPAR, rekonsiliasi total revenue, operating cost, GOP, margin, serta variance actual-budget-last year. Kalkulasi server (sumber kebenaran matematis): ${JSON.stringify(calculations)}. Statistik: ${JSON.stringify(stats)}. Akun P&L (JSON): ${JSON.stringify(accounts)}. Forecast: ${JSON.stringify(form.forecast)}. Jika ada ketidaksesuaian material, passed=false. Ringkasan Bahasa Indonesia singkat. Warnings boleh berisi data yang belum lengkap, tetapi jangan meloloskan kesalahan aritmetika.`;
    let review: z.infer<typeof ReviewSchema>|null=null;
    let lastError: unknown=null;
    for (const modelId of ["gemini-3.8-flash","gemini-3.5-flash-lite","gemini-2.5-flash","gemini-2.0-flash"]) {
      try {
        const result=await generateObject({
          model:google(modelId), schema:ReviewSchema, maxRetries:0,
          abortSignal:AbortSignal.timeout(12000),
          system:"Anda adalah CORESTAY HOTEL BUDGET ORCHESTRATOR. Reviewer final yang konservatif. Validasi berdasarkan bukti. Jangan menghitung ulang dengan angka berbeda dan jangan pernah mengubah input. Jika ada keraguan material, tolak.",
          prompt:reviewPrompt
        });
        review=result.object;
        break;
      } catch(error) { lastError=error; console.error("Hotel Budget Orchestrator model failed",modelId,error); }
    }
    if (!review) {
      console.error("Hotel Budget Orchestrator unavailable",lastError);
      return NextResponse.json({ passed:false, issues:["AI Orchestrator tidak berhasil menyelesaikan validasi final. Laporan belum disimpan."], warnings, error:"Layanan AI sedang sibuk atau tidak tersedia. Data form tetap ada; coba lagi." }, { status:503 });
    }
    const allIssues=[...new Set(review.issues)];
    const allWarnings=[...new Set([...warnings,...review.warnings])];
    if (!review.passed || allIssues.length) return NextResponse.json({ passed:false, issues:allIssues.length?allIssues:["AI Orchestrator belum menyetujui laporan."], warnings:allWarnings, summary:review.summary }, { status:422 });
    const validation={passed:true,summary:review.summary,warnings:allWarnings,orchestrator:"CORESTAY HOTEL BUDGET ORCHESTRATOR",deterministicChecks:true,aiReview:true,validatedAt:new Date().toISOString()};
    const { data: saved, error: saveError } = await auth.client.from("hotel_budget_reports").insert({
      user_id:auth.user.id, hotel_name:hotelName, period_label:period,
      form_data:form, calculated_data:calculations, validation_data:validation
    }).select("id,hotel_name,period_label,calculated_data,validation_data,created_at").single();
    if (saveError || !saved) {
      console.error("Hotel budget report save failed",saveError);
      return NextResponse.json({ passed:false, issues:["Validasi lolos, tetapi laporan belum tersimpan ke Supabase. Pastikan migrasi tabel telah dijalankan."], warnings:allWarnings, error:"Gagal menyimpan laporan. Tidak ditampilkan sebagai tersimpan." }, { status:503 });
    }
    return NextResponse.json({ passed:true, report:saved, warnings:allWarnings, summary:review.summary, orchestrator:validation.orchestrator });
  } catch(error) {
    console.error("Hotel Budget report POST failed",error);
    return NextResponse.json({ passed:false, issues:["Terjadi kesalahan saat memvalidasi atau menyimpan laporan."], error:"Validasi final gagal. Laporan belum disimpan." }, { status:500 });
  }
}
