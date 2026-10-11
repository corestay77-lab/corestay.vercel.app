import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Input = z.object({
  overall: z.number().min(0).max(100),
  status: z.string().max(120),
  risk: z.string().max(120),
  diagnosis: z.string().max(4000),
  recommendation: z.string().max(4000),
  areaResults: z.array(z.object({
    category: z.string().max(160),
    title: z.string().max(200),
    score: z.number().min(0).max(100),
    level: z.string().max(120),
    recommendation: z.string().max(2000),
    diagnosis: z.string().max(2000).optional(),
  })).min(1).max(20),
  priorityActions: z.array(z.string().max(2000)).max(30),
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

export async function POST(request: Request) {
  try {
    const parsed = Input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Struktur hasil pre-opening assessment tidak valid." }, { status: 422 });
    const data = parsed.data;
    const errors: string[] = [];
    const warnings: string[] = ["Hasil berasal dari self-assessment; dokumen proyek dan bukti lapangan belum diperiksa secara independen."];
    const categories = data.areaResults.map((area) => area.category.trim().toLowerCase());
    if (new Set(categories).size !== categories.length) errors.push("Ada kategori area readiness yang duplikat.");
    if (!data.diagnosis.trim() || !data.recommendation.trim()) warnings.push("Diagnosis atau rekomendasi keseluruhan belum lengkap.");
    if (data.areaResults.some((area) => !area.title.trim() || !area.recommendation.trim())) warnings.push("Ada area yang belum memiliki judul atau rekomendasi lengkap.");
    if (!data.priorityActions.length) warnings.push("Belum ada tindakan prioritas yang dicantumkan.");
    if (errors.length) return NextResponse.json({ success: false, error: "Hasil assessment tidak lolos pemeriksaan struktur.", validation: { errors, warnings } }, { status: 422 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "AI Orchestrator belum aktif: GEMINI_API_KEY tidak tersedia." }, { status: 503 });
    const google = createGoogleGenerativeAI({ apiKey });
    const modelIds = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    let review: z.infer<typeof Review> | null = null;
    const prompt = [
      "Tinjau hasil Pre-opening Hotel Readiness Assessment CoreStay sebagai reviewer kedua.",
      "JANGAN mengubah skor atau menghitung ulang skor keseluruhan karena formula pembobotan tidak disediakan dalam payload.",
      "Dokumen proyek dan bukti lapangan tidak dilampirkan. Jangan mengklaim kesiapan faktual, kepatuhan, penyelesaian pekerjaan, atau akar penyebab yang belum dibuktikan.",
      "Periksa kewajaran narasi terhadap skor, relevansi rekomendasi sebelum opening, klaim yang terlalu pasti, dan keterbatasan evidence.",
      "Gunakan PASSED_WITH_WARNINGS bila keterbatasan evidence atau wording penting masih perlu diperhatikan. Buat checks konkret dan jangan membuat fakta/angka baru.",
      "DATA ASSESSMENT:\n" + JSON.stringify(data),
    ].join("\n\n");
    for (const modelId of modelIds) {
      try {
        const generated = await generateObject({
          model: google(modelId), schema: Review,
          system: "Anda adalah CoreStay AI Orchestrator untuk quality review kesiapan hotel sebelum opening. Evidence-based, konservatif, transparan, dan tidak mengubah skor.",
          prompt, maxRetries: 0, abortSignal: AbortSignal.timeout(18000),
        });
        review = generated.object;
        break;
      } catch (error) {
        console.error("Pre-opening orchestrator review failed:", modelId, error);
      }
    }
    if (!review) return NextResponse.json({ success: false, error: "AI Orchestrator belum menyelesaikan review. Hasil tetap merupakan self-assessment dan belum mendapat validasi AI.", retryable: true }, { status: 503 });
    if (warnings.length || review.warnings.length || review.checks.some((check) => check.status === "WARNING")) {
      review.status = "PASSED_WITH_WARNINGS";
      review.warnings = [...new Set([...review.warnings, ...warnings])].slice(0, 5);
    }
    return NextResponse.json({ success: true, orchestration: {
      version: "corestay-preopening-orchestrator-v1", completed: true,
      validatedAt: new Date().toISOString(), scorePreserved: true,
      overallScore: data.overall, review,
      deterministicChecks: { passed: true, errors: [], warnings },
    } });
  } catch (error) {
    console.error("Pre-opening assessment orchestration error:", error);
    return NextResponse.json({ success: false, error: "AI Orchestrator gagal memproses hasil pre-opening assessment." }, { status: 500 });
  }
}
