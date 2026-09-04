export type PreOpeningCategory =
  | "concept"
  | "commercial"
  | "operasional"
  | "sdm"
  | "management";

export type PreOpeningResult = {
  score: number;
  status: string;
  priority: "TINGGI" | "SEDANG" | "RENDAH";
  diagnosis: string;
  recommendation: string;
};

export function getPreOpeningStatus(score: number) {
  if (score >= 80) return "Ready";
  if (score >= 65) return "Needs Improvement";
  if (score >= 50) return "At Risk";
  return "Critical";
}

export function getPreOpeningPriority(
  score: number
): "TINGGI" | "SEDANG" | "RENDAH" {
  if (score < 60) return "TINGGI";
  if (score < 75) return "SEDANG";
  return "RENDAH";
}

export function getPreOpeningDiagnosis(
  category: PreOpeningCategory,
  score: number
): PreOpeningResult {
  const status = getPreOpeningStatus(score);
  const priority = getPreOpeningPriority(score);

  let diagnosis = "";
  let recommendation = "";

  if (category === "concept") {
    if (score < 50) {
      diagnosis =
        "Fondasi konsep dan kelayakan hotel belum cukup kuat untuk menjadi dasar keputusan pre-opening.";

      recommendation =
        "Prioritaskan review konsep, positioning, target market, competitive mapping dan feasibility sebelum masuk ke tahap opening.";
    } else if (score < 70) {
      diagnosis =
        "Konsep hotel sudah mulai terbentuk tetapi masih terdapat beberapa aspek strategis yang perlu diperjelas.";

      recommendation =
        "Perkuat positioning, target market, competitive advantage dan validasi feasibility.";
    } else {
      diagnosis =
        "Fondasi konsep dan positioning hotel sudah relatif siap untuk masuk ke tahap implementasi.";

      recommendation =
        "Fokus pada penyelarasan seluruh keputusan produk, pricing dan operasional dengan positioning hotel.";
    }
  }

  if (category === "commercial") {
    if (score < 50) {
      diagnosis =
        "Commercial readiness masih rendah. Hotel berisiko memasuki opening tanpa strategi revenue dan distribution yang jelas.";

      recommendation =
        "Bangun BAR, room type pricing, segmentasi pasar, OTA strategy, distribution plan dan revenue calendar sebelum opening.";
    } else if (score < 70) {
      diagnosis =
        "Strategi commercial sudah mulai tersedia tetapi belum cukup terintegrasi untuk mendukung opening.";

      recommendation =
        "Finalisasi pricing architecture, channel mix, OTA setup dan strategi launching.";
    } else {
      diagnosis =
        "Commercial readiness hotel sudah cukup kuat dan memiliki dasar untuk memulai penjualan.";

      recommendation =
        "Lakukan final revenue simulation, rate loading, channel testing dan pre-opening sales activation.";
    }
  }

  if (category === "operasional") {
    if (score < 50) {
      diagnosis =
        "Operational readiness merupakan risiko kritis. Hotel belum memiliki sistem kerja yang cukup siap untuk menjalankan operasi.";

      recommendation =
        "Prioritaskan SOP, workflow, checklist, Front Office, Housekeeping, room readiness, quality control dan operational simulation.";
    } else if (score < 70) {
      diagnosis =
        "Sistem operasional sudah mulai terbentuk tetapi masih membutuhkan standardisasi dan simulasi sebelum opening.";

      recommendation =
        "Finalisasi SOP utama, checklist, workflow antar-departemen dan lakukan mock operation.";
    } else {
      diagnosis =
        "Operational readiness sudah relatif baik dan hotel memiliki fondasi untuk memasuki tahap opening.";

      recommendation =
        "Lakukan final operational audit, mock operation dan readiness inspection sebelum soft opening.";
    }
  }

  if (category === "sdm") {
    if (score < 50) {
      diagnosis =
        "Kesiapan SDM masih menjadi risiko utama karena struktur organisasi dan manpower belum cukup siap.";

      recommendation =
        "Finalisasi organization structure, manpower planning, recruitment, job description, training dan KPI.";
    } else if (score < 70) {
      diagnosis =
        "Struktur SDM sudah mulai tersedia tetapi masih membutuhkan penguatan recruitment dan training.";

      recommendation =
        "Percepat recruitment posisi kritis dan jalankan pre-opening training secara terstruktur.";
    } else {
      diagnosis =
        "Kesiapan SDM hotel sudah cukup baik untuk mendukung proses opening.";

      recommendation =
        "Fokus pada training intensif, competency assessment, SOP drill dan simulasi pelayanan.";
    }
  }

  if (category === "management") {
    if (score < 50) {
      diagnosis =
        "Management readiness masih kritis. Timeline, budget dan ownership terhadap proses pre-opening belum cukup kuat.";

      recommendation =
        "Bangun master opening timeline, pre-opening budget, PIC matrix, critical milestones dan weekly readiness meeting.";
    } else if (score < 70) {
      diagnosis =
        "Sistem manajemen pre-opening sudah berjalan tetapi masih membutuhkan kontrol yang lebih terstruktur.";

      recommendation =
        "Perkuat project tracking, budget monitoring, milestone review dan weekly management dashboard.";
    } else {
      diagnosis =
        "Management readiness sudah cukup baik dan proses pre-opening memiliki kontrol yang relatif jelas.";

      recommendation =
        "Fokus pada final readiness audit, risk management dan koordinasi menuju soft opening.";
    }
  }

  return {
    score,
    status,
    priority,
    diagnosis,
    recommendation,
  };
}

export function getOverallPreOpeningDiagnosis(score: number) {
  if (score < 50) {
    return {
      status: "Critical Readiness",
      description:
        "Hotel belum siap memasuki tahap opening. Beberapa fondasi strategis dan operasional perlu diselesaikan terlebih dahulu.",
    };
  }

  if (score < 65) {
    return {
      status: "At Risk",
      description:
        "Hotel memiliki beberapa fondasi yang sudah tersedia tetapi masih terdapat risiko signifikan menjelang opening.",
    };
  }

  if (score < 80) {
    return {
      status: "Needs Improvement",
      description:
        "Hotel cukup siap untuk menuju opening tetapi masih membutuhkan penyelesaian beberapa area kritis.",
    };
  }

  return {
    status: "Pre-Opening Ready",
    description:
      "Fondasi pre-opening hotel sudah cukup kuat. Fokus berikutnya adalah final readiness, mock operation dan persiapan soft opening.",
  };
}