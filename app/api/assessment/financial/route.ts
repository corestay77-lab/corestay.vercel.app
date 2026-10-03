import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { generateObject } from "ai";
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
  let parser: PDFParse | null = null;

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

    const buffer = Buffer.from(await file.arrayBuffer());
    parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text.trim();

    if (!text) {
      return NextResponse.json({
        error: "PDF tidak memiliki teks yang dapat dibaca. Untuk PDF hasil scan/foto, OCR perlu ditambahkan pada tahap berikutnya.",
      }, { status: 422 });
    }

    const cleanedText = text.slice(0, 120000);

    const { object } = await generateObject({
      model: "openai/gpt-5.6-terra",
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

    return NextResponse.json({
      success: true,
      fileName: file.name,
      pages: parsed.total,
      result: object,
    });
  } catch (error) {
    console.error("Financial assessment error:", error);
    return NextResponse.json({
      error: "Laporan belum dapat dianalisa. Pastikan AI Gateway sudah dikonfigurasi di Vercel.",
    }, { status: 500 });
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (cleanupError) {
        console.error("PDF parser cleanup error:", cleanupError);
      }
    }
  }
}
