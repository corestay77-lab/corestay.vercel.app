import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type AreaScore = {
  title: string;
  score: number;
  label?: string;
};

type NotifyPayload = {
  hotelType: "existing" | "preopening";
  hotelName?: string;
  city?: string;
  overall: number;
  status?: string;
  diagnosis?: string;
  areas?: AreaScore[];
  priorities?: AreaScore[];
  contact?: {
    nama?: string;
    whatsapp?: string;
    email?: string;
    kamar?: string;
  };
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderAreaRows(areas: AreaScore[] = []) {
  if (!areas.length) return "<p style='color:#94a3b8'>-</p>";

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      ${areas
        .map(
          (area) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px">
            ${escapeHtml(area.title)}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#f87171;font-weight:700;text-align:right;font-size:14px">
            ${area.score}% ${area.label ? `(${escapeHtml(area.label)})` : ""}
          </td>
        </tr>`
        )
        .join("")}
    </table>
  `;
}

function buildEmailHtml(payload: NotifyPayload) {
  const title =
    payload.hotelType === "existing"
      ? "Existing Hotel Business Health Assessment"
      : "Pre-opening Hotel Readiness Assessment";

  return `
  <div style="background:#0b1220;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#f5f7fa">
    <div style="max-width:600px;margin:0 auto">
      <p style="color:#22d3ee;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase">
        CoreStay Advisory — Notifikasi Assessment Baru
      </p>

      <h1 style="font-size:22px;margin:8px 0 4px">
        ${escapeHtml(payload.hotelName || "Hotel (nama belum diisi)")}
      </h1>

      <p style="color:#9aa5b5;margin:0 0 20px;font-size:13px">
        ${escapeHtml(payload.city || "-")} • ${title}
      </p>

      <div style="background:#111a2c;border-radius:12px;padding:20px;margin-bottom:16px">
        <p style="color:#9aa5b5;font-size:12px;margin:0">Overall Score</p>
        <p style="color:#22d3ee;font-size:32px;font-weight:800;margin:4px 0">
          ${payload.overall}%
        </p>
        ${
          payload.status
            ? `<p style="color:#f87171;font-weight:700;font-size:14px;margin:0">${escapeHtml(
                payload.status
              )}</p>`
            : ""
        }
        ${
          payload.diagnosis
            ? `<p style="color:#cbd5e1;font-size:13px;margin-top:8px;line-height:1.6">${escapeHtml(
                payload.diagnosis
              )}</p>`
            : ""
        }
      </div>

      ${
        payload.areas?.length
          ? `<div style="background:#111a2c;border-radius:12px;padding:20px;margin-bottom:16px">
              <p style="color:#f5f7fa;font-weight:700;font-size:14px;margin:0 0 4px">Skor per Area</p>
              ${renderAreaRows(payload.areas)}
            </div>`
          : ""
      }

      ${
        payload.priorities?.length
          ? `<div style="background:#111a2c;border-radius:12px;padding:20px;margin-bottom:16px">
              <p style="color:#f59e0b;font-weight:700;font-size:14px;margin:0 0 4px">Prioritas Perbaikan</p>
              ${renderAreaRows(payload.priorities)}
            </div>`
          : ""
      }

      ${
        payload.contact
          ? `<div style="background:#111a2c;border-radius:12px;padding:20px">
              <p style="color:#f5f7fa;font-weight:700;font-size:14px;margin:0 0 8px">Data Kontak</p>
              <p style="color:#cbd5e1;font-size:13px;margin:2px 0">Nama: ${escapeHtml(
                payload.contact.nama || "-"
              )}</p>
              <p style="color:#cbd5e1;font-size:13px;margin:2px 0">WhatsApp: ${escapeHtml(
                payload.contact.whatsapp || "-"
              )}</p>
              <p style="color:#cbd5e1;font-size:13px;margin:2px 0">Email: ${escapeHtml(
                payload.contact.email || "-"
              )}</p>
              <p style="color:#cbd5e1;font-size:13px;margin:2px 0">Jumlah Kamar: ${escapeHtml(
                payload.contact.kamar || "-"
              )}</p>
            </div>`
          : `<p style="color:#64748b;font-size:12px">Belum ada data kontak (hotel existing saat ini belum mengumpulkan kontak sebelum melihat hasil).</p>`
      }

      <p style="color:#475569;font-size:11px;margin-top:24px;text-align:center">
        Email otomatis dari corestay.vercel.app
      </p>
    </div>
  </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NotifyPayload;

    if (!payload || typeof payload.overall !== "number") {
      return NextResponse.json(
        { ok: false, error: "Payload tidak valid." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    const fromEmail =
      process.env.NOTIFY_FROM_EMAIL || "CoreStay Assessment <onboarding@resend.dev>";

    if (!apiKey || !notifyEmail) {
      console.error(
        "RESEND_API_KEY atau NOTIFY_EMAIL belum di-set di environment variables."
      );

      return NextResponse.json(
        { ok: false, error: "Email service belum dikonfigurasi." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const subject = `Assessment Baru: ${payload.hotelName || "Hotel"} — ${
      payload.overall
    }% (${payload.hotelType === "existing" ? "Existing" : "Pre-opening"})`;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      subject,
      html: buildEmailHtml(payload),
    });

    if (error) {
      console.error("RESEND SEND ERROR:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("NOTIFY ASSESSMENT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan saat mengirim email." },
      { status: 500 }
    );
  }
}
