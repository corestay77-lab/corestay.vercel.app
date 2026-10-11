import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Input = z.object({
  hotelName: z.string().max(200).optional(),
  city: z.string().max(200).optional(),
  overall: z.number().min(0).max(100),
  status: z.string().max(80).optional(),
  risk: z.string().max(80).optional(),
  business: z.number().min(0).max(100),
  revenue: z.number().min(0).max(100),
  operations: z.number().min(0).max(100),
  people: z.number().min(0).max(100),
  profitability: z.number().min(0).max(100),
  weights: z.record(z.string(), z.number().min(0).max(100)),
  areaResults: z.array(z.object({
    key: z.string().max(80),
    title: z.string().max(200),
    score: z.number().min(0).max(100),
    level: z.string().max(80),
    diagnosis: z.string().max(1500),
    recommendation: z.string().max(1500),
  })).max(10),
  diagnosis: z.string().max(3000),
  recommendation: z.string().max(3000),
  methodology: z.string().max(500).optional(),
  dataRule: z.string().max(500).optional(),
  assessmentVersion: z.string().max(120).optional(),
});

const Review = z.object({
  status: z.enum(["PASSED", "PASSED_WITH_WARNINGS"]),
  summary: z.string().max(1200),
  checks: z.array(z.object({
    name: z.string().max(120),
    status: z.enum(["PASS", "WARNING"]),
    detail: z.string().max(500),
  })).max(6),
  warnings: z.array(z.string().max(500)).max(5),
});

function weightedScore(data: z.infer<typeof Input>) {
  const expectedWeights = { business: 20, revenue: 25, operations: 20, people: 15, profitability: 20 };
  const totalWeight = Object.values(expectedWeights).reduce((sum, value) => sum + value, 0);
  return Math.round(
    data.business * expectedWeights.business / totalWeight +
    data.revenue * expectedWeights.revenue / totalWeight +
    data.operations * expectedWeights.operations / totalWeight +
    data.people * expectedWeights.people / totalWeight +
    data.profitability * expectedWeights.profitability / totalWeight
  );
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = Input.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Struktur hasil assessment tidak valid.", issues: parsed.error.issues.map((issue) => issue.message) }, { status: 422 });
    }
    const data = parsed.data;
    const expectedWeights = { business: 20, revenue: 25, operations: 20, people: 15, profitability: 20 };
    const errors: string[] = [];
    const warnings: string[] = ["Hasil ini berasal dari self-assessment; dokumen pendukung operasional belum diperiksa dalam proses ini."];

    for (const [key, expected] of Object.entries(expectedWeights)) {
      if (data.weights[key] !== expected) errors.push(`Bobot area ${key} tidak sesuai standar (${expected}%).`);
      if (!data.areaResults.some((area) => area.key === key)) errors.push(`Hasil area ${key} tidak ditemukan.`);
      const area = data.areaResults.find((item) => item.key === key);
      if (area && area.score !== data[key as keyof typeof expectedWeights]) errors.push(`Skor area ${key} tidak konsisten antara ringkasan dan detail.`);
    }

    const expectedOverall = weightedScore(data);
    if (data.overall !== expectedOverall) errors.push(`Skor total tidak sesuai bobot tetap: skor tampil ${data.overall}, perhitungan ulang ${expectedOverall}.`);
    if (!data.diagnosis.trim() || !data.recommendation.trim()) warnings.push("Ringkasan diagnosis atau rekomendasi belum lengkap.");
    if (data.areaResults.some((area) => !area.diagnosis.trim() || !area.recommendation.trim())) warnings.push("Ada area yang belum memiliki diagnosis atau rekomendasi.");
    if (errors.length) {
      return NextResponse.json({ success: false, error: "Hasil assessment tidak lolos pemeriksaan konsistensi.", validation: { errors, warnings } }, { status: 422 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "AI Orchestrator belum aktif: GEMINI_API_KEY tidak tersedia." }, { status: 503 });

    const google = createGoogleGenerativeAI({ apiKey });
    const modelIds = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    let review: z.infer<typeof Review> | null = null;
    let lastError: unknown = null;
    const prompt = [
      "Tinjau hasil self-assessment Hotel Existing CoreStay sebagai reviewer kedua.",
      "JANGAN mengubah atau menghitung ulang skor. Tidak ada dokumen bukti operasional yang dilampirkan; karena itu jangan mengklaim temuan faktual, akar penyebab, kerugian, fraud, atau dampak finansial yang belum dibuktikan.",
      "Periksa konsistensi narasi dengan skor, apakah diagnosis dan rekomendasi terlalu pasti untuk self-assessment, dan apakah keterbatasan evidence dinyatakan secara jelas.",
      "Jika hasil dapat dipakai sebagai screening awal dengan batasan yang jelas, status PASSED. Jika ada klaim berlebihan, kekurangan data penting, atau wording yang perlu direview, gunakan PASSED_WITH_WARNINGS.",
      "Buat 3-5 checks yang konkret. Beri WARNING untuk keterbatasan evidence yang relevan. Jangan membuat angka atau fakta baru.",
      "DATA HASIL ASSESSMENT:\n" + JSON.stringify(data),
      "Pemeriksaan deterministik server telah lolos: bobot kategori, skor detail, dan skor total."
    ].join("\n\n");

    for (const modelId of modelIds) {
      try {
        const generated = await generateObject({
          model: google(modelId),
          schema: Review,
          system: "Anda adalah AI Orchestrator CoreStay untuk quality review hasil Hospitality Business Assessment. Evidence-based, konservatif, transparan. Jangan pernah mengubah skor input.",
          prompt,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(18000),
        });
        review = generated.object;
        break;
      } catch (error) {
        lastError = error;
        console.error("Existing assessment orchestrator review failed:", modelId, error);
      }
    }

    if (!review) {
      return NextResponse.json({ success: false, error: "AI Orchestrator belum menyelesaikan review. Hasil tetap merupakan self-assessment dan belum mendapat validasi AI.", retryable: true }, { status: 503 });
    }

    if (warnings.length || review.warnings.length || review.checks.some((check) => check.status === "WARNING")) {
      review.status = "PASSED_WITH_WARNINGS";
      review.warnings = [...new Set([...review.warnings, ...warnings])].slice(0, 5);
    }

    return NextResponse.json({
      success: true,
      orchestration: {
        version: "corestay-existing-orchestrator-v1",
        completed: true,
        validatedAt: new Date().toISOString(),
        scoringMethod: "deterministic-weighted-self-assessment",
        scorePreserved: true,
        overallScore: data.overall,
        expectedOverallScore: expectedOverall,
        review,
        deterministicChecks: { passed: true, errors: [], warnings },
      },
    });
  } catch (error) {
    console.error("Existing assessment orchestration error:", error);
    return NextResponse.json({ success: false, error: "AI Orchestrator gagal memproses hasil assessment." }, { status: 500 });
  }
}
