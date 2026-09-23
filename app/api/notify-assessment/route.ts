import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type AreaScore = {
  title: string;
  score: number;
  label?: string;
  diagnosis?: string;
  recommendation?: string;
};

type NotifyPayload = {
  hotelType: "existing" | "preopening";
  hotelName?: string;
  city?: string;
  overall: number;
  status?: string;
  risk?: string;
  diagnosis?: string;
  areas?: AreaScore[];
  priorities?: AreaScore[];
  priorityActions?: string[];
  recommendation?: string;
  contact?: {
    nama?: string;
    whatsapp?: string;
    email?: string;
    kamar?: string;
  };
};

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clampScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
}

function getStatus(score: number) {
  if (score >= 80) return { label: "READY", color: "#22c55e" };
  if (score >= 60) return { label: "NEED IMPROVEMENT", color: "#eab308" };
  if (score >= 40) return { label: "HIGH RISK", color: "#f97316" };
  return { label: "CRITICAL", color: "#ef4444" };
}

function normalizeAreas(areas: AreaScore[] = []) {
  return areas.map((area) => ({
    ...area,
    score: clampScore(area.score),
  }));
}

function renderAreaRows(areas: AreaScore[] = []) {
  if (!areas.length) {
    return "<tr><td colspan='5' style='padding:14px;color:#94a3b8'>Tidak ada data area.</td></tr>";
  }

  return areas
    .map((area) => {
      const status = getStatus(area.score);
      return `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px">
            ${escapeHtml(area.title)}
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#0f172a;font-weight:800;font-size:13px">
            ${area.score}%
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:${status.color};font-weight:800;font-size:11px">
            ${status.label}
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:12px;line-height:1.55">
            ${escapeHtml(area.diagnosis || "")}
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:12px;line-height:1.55">
            ${escapeHtml(area.recommendation || "")}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPriorityCards(priorities: AreaScore[] = []) {
  return priorities
    .map((area, index) => {
      const status = getStatus(area.score);
      return `
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:10px;background:#ffffff">
          <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em">
            Priority ${index + 1}
          </div>
          <div style="margin-top:5px;font-size:15px;font-weight:800;color:#0f172a">
            ${escapeHtml(area.title)}
          </div>
          <div style="margin-top:5px;font-size:13px;font-weight:800;color:${status.color}">
            ${area.score}% — ${status.label}
          </div>
          ${area.recommendation ? `<div style="margin-top:8px;font-size:12px;line-height:1.6;color:#475569">${escapeHtml(area.recommendation)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function buildEmailHtml(payload: NotifyPayload) {
  const overall = clampScore(payload.overall);
  const status = payload.status || getStatus(overall).label;
  const areas = normalizeAreas(payload.areas);
  const priorities = normalizeAreas(payload.priorities).slice(0, 3);
  const isExisting = payload.hotelType === "existing";
  const title =
    payload.hotelType === "existing"
      ? "Existing Hotel Business Health Assessment"
      : "Pre-opening Readiness Report";

  return `
  <div style="margin:0;background:#f1f5f9;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#0f172a;padding:28px 30px;color:#ffffff">
        <div style="font-size:12px;color:#67e8f9;font-weight:800;letter-spacing:.14em;text-transform:uppercase">
          CoreStay Advisory
        </div>
        <div style="font-size:24px;font-weight:800;margin-top:8px">${isExisting ? "Existing Hotel Business Health Report" : "Pre-opening Readiness Report"}</div>
        <div style="font-size:13px;color:#cbd5e1;margin-top:6px">
          ${escapeHtml(payload.hotelName || "Hotel")} • ${escapeHtml(payload.city || "-")}${payload.contact?.kamar ? ` • ${escapeHtml(payload.contact.kamar)} kamar` : ""} • ${isExisting ? "Existing Hotel" : "Pre-opening"}
        </div>
      </div>

      <div style="padding:26px 30px">
        <div style="display:inline-block;border-radius:999px;background:#fef2f2;color:#dc2626;padding:7px 11px;font-size:11px;font-weight:800;letter-spacing:.04em">
          ${escapeHtml(status)}
        </div>

        <table role="presentation" style="width:100%;margin-top:16px;border-collapse:collapse">
          <tr>
            <td style="width:50%;vertical-align:top;padding:18px;background:#ecfeff;border-radius:14px">
              <div style="font-size:12px;color:#0e7490;font-weight:700">${isExisting ? "OVERALL BUSINESS HEALTH" : "OVERALL READINESS"}</div>
              <div style="font-size:42px;line-height:1.1;color:#0891b2;font-weight:900;margin-top:4px">${overall}<span style="font-size:18px">/100</span></div>
            </td>
            <td style="width:16px"></td>
            <td style="vertical-align:top;padding:18px;background:#f8fafc;border-radius:14px">
              <div style="font-size:12px;color:#64748b;font-weight:700">${isExisting ? "BUSINESS RISK" : "OPENING RISK"}</div>
              <div style="font-size:22px;font-weight:900;margin-top:8px;color:#dc2626">${escapeHtml(payload.risk || (overall < 40 ? "HIGH" : overall < 60 ? "HIGH" : overall < 80 ? "MEDIUM" : "LOW"))}</div>
            </td>
          </tr>
        </table>

        ${payload.diagnosis ? `
        <div style="margin-top:22px;padding:18px;border-left:4px solid #06b6d4;background:#f8fafc">
          <div style="font-size:12px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:.08em">Executive Diagnosis</div>
          <div style="font-size:13px;line-height:1.7;color:#334155;margin-top:7px">${escapeHtml(payload.diagnosis)}</div>
        </div>` : ""}

        <div style="margin-top:24px">
          <div style="font-size:17px;font-weight:800;color:#0f172a">${isExisting ? "Existing Hotel Performance Score" : "Pre-opening Readiness Score"}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${isExisting ? "Perbandingan kondisi enam area utama bisnis hotel berdasarkan jawaban assessment Anda." : "Nilai kesiapan hotel berdasarkan setiap area strategis."}</div>
          <table style="width:100%;border-collapse:collapse;margin-top:10px">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:10px;text-align:left;font-size:11px;color:#64748b">AREA</th>
                <th style="padding:10px;text-align:right;font-size:11px;color:#64748b">SCORE</th>
                <th style="padding:10px;text-align:right;font-size:11px;color:#64748b">STATUS</th>\n                <th style="padding:10px;text-align:left;font-size:11px;color:#64748b">DIAGNOSIS</th>\n                <th style="padding:10px;text-align:left;font-size:11px;color:#64748b">REKOMENDASI</th>
              </tr>
            </thead>
            <tbody>${renderAreaRows(areas)}</tbody>
          </table>
        </div>

        ${priorities.length ? `
        <div style="margin-top:26px">
          <div style="font-size:17px;font-weight:800;color:#0f172a">${isExisting ? "3 Area Prioritas Perbaikan" : "3 Area Prioritas Sebelum Opening"}</div>
          ${renderPriorityCards(priorities)}
        </div>` : ""}

        ${payload.priorityActions?.length ? `
        <div style="margin-top:26px"><div style="font-size:17px;font-weight:800;color:#0f172a">30-Day Priority Action</div>${payload.priorityActions.map((action) => `<div style="margin-top:10px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-size:12px;line-height:1.6;color:#475569">${escapeHtml(action)}</div>`).join("")}</div>` : ""}

        ${payload.recommendation ? `
        <div style="margin-top:26px;padding:18px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px"><div style="font-size:17px;font-weight:800;color:#0f172a">Rekomendasi CoreStay Advisory</div><div style="font-size:12px;line-height:1.7;color:#334155;margin-top:8px">${escapeHtml(payload.recommendation)}</div></div>` : ""}

        ${payload.contact ? `
        <div style="margin-top:26px;padding:18px;background:#f8fafc;border-radius:12px">
          <div style="font-size:14px;font-weight:800">Data Kontak</div>
          <div style="font-size:12px;line-height:1.8;color:#475569;margin-top:6px">
            Nama: ${escapeHtml(payload.contact.nama || "-")}<br>
            WhatsApp: ${escapeHtml(payload.contact.whatsapp || "-")}<br>
            Email: ${escapeHtml(payload.contact.email || "-")}<br>
            Jumlah Kamar: ${escapeHtml(payload.contact.kamar || "-")}
          </div>
        </div>` : ""}

        <div style="margin-top:26px;padding-top:18px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8">
          CoreStay Advisory — ${title}
        </div>
      </div>
    </div>
  </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NotifyPayload;

    if (!payload || typeof payload.overall !== "number") {
      return NextResponse.json({ ok: false, error: "Payload tidak valid." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    const fromEmail =
      process.env.NOTIFY_FROM_EMAIL || "CoreStay Assessment <onboarding@resend.dev>";

    if (!apiKey || !notifyEmail) {
      console.error("RESEND_API_KEY atau NOTIFY_EMAIL belum di-set di environment variables.");
      return NextResponse.json({ ok: false, error: "Email service belum dikonfigurasi." }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const assessmentLabel = payload.hotelType === "existing" ? "Existing Hotel" : "Pre-opening";
    const subject = `Assessment Baru: ${payload.hotelName || "Hotel"} — ${clampScore(payload.overall)}/100 (${assessmentLabel})`;

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
    return NextResponse.json({ ok: false, error: "Terjadi kesalahan saat mengirim email." }, { status: 500 });
  }
}
