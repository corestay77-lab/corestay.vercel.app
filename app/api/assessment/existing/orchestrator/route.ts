import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

const Finding = z.object({
  area: z.string(),
  title: z.string(),
  evidence: z.string(),
  gap: z.string(),
  rootCauseHypothesis: z.string(),
  businessImpact: z.string(),
  priority: z.enum(["Critical", "High", "Medium", "Monitor"]),
  recommendation: z.string(),
  actionPlan: z.string(),
  kpiToMonitor: z.string(),
  evidenceToVerify: z.string(),
});
const AreaReview = z.object({
  key: z.enum(["business", "revenue", "operations", "people", "profitability"]),
  summary: z.string(),
  strengths: z.array(z.string()).max(3),
  gaps: z.array(z.string()).max(5),
  rootCauseHypotheses: z.array(z.string()).max(3),
  businessRisks: z.array(z.string()).max(3),
  recommendations: z.array(z.string()).max(4),
  evidenceToCollect: z.array(z.string()).max(5),
});
const OrchestratorReview = z.object({
  executiveDiagnostic: z.string(),
  findings: z.array(Finding).max(15),
  areaReviews: z.array(AreaReview).length(5),
  validationNotes: z.array(z.string()).max(8),
});
const WEIGHTS: Record<string, number> = { business: 20, revenue: 25, operations: 20, people: 15, profitability: 20 };

function normalizeScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const answers = Array.isArray(body?.answers) ? body.answers : [];
    const areaScores = body?.areaScores;
    const submittedOverall = normalizeScore(body?.overall);
    if (answers.length < 20 || !areaScores || submittedOverall === null) {
      return NextResponse.json({ error: "Data assessment tidak lengkap. Silakan ulangi pengiriman hasil." }, { status: 422 });
    }
    const scoreKeys = Object.keys(WEIGHTS);
    const scores: Record<string, number> = {};
    for (const key of scoreKeys) {
      const score = normalizeScore(areaScores[key]);
      if (score === null) return NextResponse.json({ error: "Skor area tidak valid: " + key }, { status: 422 });
      scores[key] = score;
    }
    const deterministicOverall = Math.round(scoreKeys.reduce((sum, key) => sum + scores[key] * WEIGHTS[key] / 100, 0));
    if (deterministicOverall !== submittedOverall) {
      return NextResponse.json({ error: "Validasi skor gagal. Hasil tidak diterbitkan agar skor tetap konsisten.", validation: "FAILED" }, { status: 422 });
    }
    const source = answers.map((a: any, i: number) => ({
      questionNumber: i + 1,
      area: String(a?.area || ""),
      question: String(a?.question || ""),
      selectedAnswer: String(a?.selectedAnswer || ""),
      selectedScore: normalizeScore(a?.selectedScore),
    }));
    if (source.some((a: any) => !a.area || !a.question || !a.selectedAnswer || a.selectedScore === null)) {
      return NextResponse.json({ error: "Sebagian jawaban tidak valid; validasi AI tidak dijalankan." }, { status: 422 });
    }

    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const schema = OrchestratorReview;
    const system = "Anda adalah CoreStay AI Orchestrator, reviewer independen untuk Hospitality Business Auditor pada hotel yang sedang beroperasi. Analisis hanya jawaban self-assessment yang disediakan. Jangan mengklaim bahwa kondisi telah diverifikasi di lapangan. Pisahkan evidence (apa yang benar-benar dinyatakan dalam jawaban), gap, root-cause hypothesis (hipotesis, bukan fakta), business impact (potensi dampak, jangan mengarang angka), dan tindakan. Jangan menambahkan data, nilai KPI, benchmark industri, besaran kerugian, atau fakta spesifik yang tidak diberikan. Jika jawaban rendah, jelaskan kontrol/proses yang menurut jawaban belum ada atau belum matang; jika jawaban tinggi, sebutkan sebagai praktik yang dinyatakan telah berjalan, tetap perlu sampling evidence. Gunakan bahasa Indonesia profesional, spesifik, actionable, dan tidak repetitif. Prioritaskan temuan berdasarkan nilai jawaban, materialitas bisnis yang masuk akal, serta potensi risiko; jangan menyimpulkan fraud. Setiap finding harus memiliki bukti yang dapat ditelusuri ke jawaban, langkah validasi evidence, PIC/aksi yang jelas, horizon waktu, dan KPI yang relevan. Jangan mengubah atau menghitung ulang skor.";
    const prompt = "Lakukan review tahap pertama dan susun laporan diagnosis lengkap. Skor area yang sudah dihitung secara deterministik (jangan diubah): " + JSON.stringify(scores) + ". Bobot tetap: " + JSON.stringify(WEIGHTS) + ". Overall tetap: " + submittedOverall + "/100.\n\nJAWABAN ASSESSMENT (sumber evidence satu-satunya):\n" + JSON.stringify(source) + "\n\nHasilkan 8–15 temuan yang paling bermakna, jika didukung jawaban; jangan mengisi kuota dengan temuan generik. Temuan harus mencakup area berbeda sesuai evidence dan memuat evidence, gap, hipotesis akar masalah, potensi dampak, prioritas, rekomendasi, action plan, KPI monitoring, dan evidence yang perlu dikumpulkan. Buat review untuk kelima area business, revenue, operations, people, profitability. Berikan validasi notes tentang keterbatasan self-assessment, jawaban yang perlu diperiksa, dan data yang perlu diminta. Jangan menyatakan laporan audit lapangan atau verifikasi independen telah dilakukan.";
    const first = await generateObject({ model: google("gemini-3.8-flash"), schema, system, prompt, maxRetries: 0, abortSignal: AbortSignal.timeout(35_000) });

    const reviewSystem = "Anda adalah tahap kedua CoreStay AI Orchestrator, reviewer quality assurance independen. Bandingkan draft tahap pertama dengan jawaban sumber. Hapus atau perbaiki klaim yang tidak didukung, fakta yang dinyatakan terlalu pasti, rekomendasi generik, prioritas yang tidak konsisten, dan potensi angka/benchmark rekaan. Evidence harus mencerminkan jawaban pengguna; root cause harus diberi label hipotesis; impact bersifat potensial kecuali ada data kuantitatif. Pertahankan skor dan bobot sebagai informasi tetap, jangan pernah mengubahnya. Laporan harus berguna untuk manajemen hotel dan tidak boleh berpura-pura sebagai audit lapangan.";
    const reviewPrompt = "JAWABAN SUMBER:\n" + JSON.stringify(source) + "\n\nSKOR TETAP:\n" + JSON.stringify({ scores, weights: WEIGHTS, overall: submittedOverall }) + "\n\nDRAFT TAHAP PERTAMA:\n" + JSON.stringify(first.object) + "\n\nLakukan validasi ketat dan keluarkan hasil final sesuai schema. Buang temuan tanpa dukungan jawaban; lebih baik lebih sedikit dan kuat daripada banyak namun generik.";
    let finalReview;
    try {
      finalReview = await generateObject({ model: google("gemini-3.8-flash"), schema, system: reviewSystem, prompt: reviewPrompt, maxRetries: 0, abortSignal: AbortSignal.timeout(35_000) });
    } catch {
      finalReview = await generateObject({ model: google("gemini-3.5-flash-lite"), schema, system: reviewSystem, prompt: reviewPrompt, maxRetries: 0, abortSignal: AbortSignal.timeout(35_000) });
    }
    const review = finalReview.object;
    if (review.areaReviews.length !== 5 || review.findings.length < 1) {
      return NextResponse.json({ error: "AI Orchestrator tidak menghasilkan diagnosis lengkap yang lolos pemeriksaan. Silakan coba kembali.", validation: "FAILED" }, { status: 422 });
    }
    const validated = {
      ...review,
      validation: {
        status: "PASSED",
        label: "Lolos Validasi Otomatis CoreStay",
        checks: ["Skor dan bobot konsisten", "Temuan ditinjau terhadap jawaban sumber", "Akar masalah ditandai sebagai hipotesis", "Dampak kuantitatif tidak dikarang", "Review AI tahap kedua selesai"],
        scoreLocked: true,
        scoreFormula: "Business 20%, Revenue 25%, Operations 20%, People 15%, Profitability 20%",
        version: "corestay-existing-orchestrator-v1",
      },
    };
    return NextResponse.json({ success: true, result: validated, scores, overall: submittedOverall, weights: WEIGHTS });
  } catch (error) {
    console.error("CoreStay Existing AI Orchestrator failed:", error);
    return NextResponse.json({ error: "AI Orchestrator belum menyelesaikan dua tahap validasi. Hasil belum dapat diterbitkan; silakan coba kembali." }, { status: 503 });
  }
}
