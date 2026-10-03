import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const FinancialAssessment = z.object({
  financialHealthScore: z.number().min(0).max(100),
  executiveSummary: z.string(),
  revenueAnalysis: z.string(),
  costAnalysis: z.string(),
  profitAnalysis: z.string(),
  risks: z.array(z.string()).max(8),
  recommendations: z.array(z.string()).max(8),
  actionPlan: z.array(z.string()).max(8),
  extractedFigures: z.array(z.object({
    label: z.string(),
    value: z.string(),
    period: z.string(),
  })).max(40),
});

export async function POST(request: Request) {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File PDF belum dipilih." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File harus berformat PDF." }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran PDF maksimal 4 MB." }, { status: 400 });
    }

    if (!process.env.AI_GATEWAY_API_KEY) {
      console.error("Financial assessment: AI_GATEWAY_API_KEY is missing in the runtime environment.");
      return NextResponse.json({
        error: "AI Gateway belum aktif pada deployment ini. Periksa Environment Variable AI_GATEWAY_API_KEY pada Vercel Production, lalu redeploy.",
        code: "AI_GATEWAY_KEY_MISSING",
      }, { status: 503 });
    }

    const buffer = await file.arrayBuffer();
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    const parsed = await extractText(pdf, { mergePages: true });
    const extractedText = parsed.text.trim();

    if (!extractedText) {
      return NextResponse.json({
        error: "PDF tidak memiliki teks yang dapat dibaca. Untuk PDF hasil scan/foto, OCR perlu ditambahkan pada tahap berikutnya.",
        code: "PDF_TEXT_EMPTY",
      }, { status: 422 });
    }

    const cleanedText = extractedText.slice(0, 120000);

    let object: z.infer<typeof FinancialAssessment>;
    try {
      const result = await generateObject({
        model: openai("gpt-5.5"),
        schema: FinancialAssessment,
        system: `Anda adalah CoreStay Financial Assessment Engine untuk hotel di Indonesia.
Analisa laporan keuangan secara konservatif dan berbasis angka.
Jangan mengarang angka yang tidak ada. Jika angka tidak ditemukan, tulis "Tidak tersedia".
Kenali Rupiah, juta, ribu, persen, debit/kredit, revenue, COGS, payroll, OPEX, GOP/EBITDA dan laba/rugi.
Pisahkan fakta dari interpretasi.
Financial health score 0-100 harus mencerminkan kesehatan finansial berdasarkan data yang benar-benar tersedia.
Berikan rekomendasi praktis untuk owner/management hotel.
Action plan harus konkret dan berurutan.`,
        prompt: `Analisa laporan keuangan hotel berikut.

Nama file: ${file.name}

Teks hasil ekstraksi PDF:
---
${cleanedText}
---

Keluarkan:
1. Financial Health Score.
2. Executive Summary.
3. Revenue Analysis.
4. Cost Analysis.
5. Profit Analysis.
6. Risiko/red flags paling penting.
7. Recommendations.
8. Action Plan.
9. Angka keuangan yang berhasil ditemukan, dengan periode dan satuan sesuai laporan.

Jangan mengisi angka yang tidak tertulis di dokumen.`,
      });
      object = result.object;
    } catch (aiError) {
      console.error("Financial assessment AI error:", aiError);
      const message = aiError instanceof Error ? aiError.message : String(aiError);
      return NextResponse.json({
        error: "AI Gateway gagal memproses analisa. Periksa AI Gateway API key, kredit/limit Gateway, dan model yang digunakan.",
        code: "AI_GATEWAY_REQUEST_FAILED",
        detail: message.slice(0, 500),
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      pages: parsed.totalPages,
      result: object,
    });
  } catch (error) {
    console.error("Financial assessment error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: "Server gagal membaca atau memproses PDF.",
      code: "FINANCIAL_ASSESSMENT_SERVER_ERROR",
      detail: message.slice(0, 500),
    }, { status: 500 });
  } finally {
    if (pdf) {
      try {
        pdf.cleanup();
      } catch (cleanupError) {
        console.error("PDF parser cleanup error:", cleanupError);
      }
    }
  }
}
