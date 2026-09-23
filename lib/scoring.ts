export type Category =
  | "revenue"
  | "operasional"
  | "sdm"
  | "manajemen";

export type AssessmentResult = {
  score: number;
  status: string;
  priority: "TINGGI" | "SEDANG" | "RENDAH";
  diagnosis: string;
  recommendation: string;
};

export function getStatus(score: number) {
  if (score >= 80) {
    return "Baik";
  }

  if (score >= 65) {
    return "Cukup Baik";
  }

  if (score >= 50) {
    return "Perlu Perbaikan";
  }

  return "Prioritas Tinggi";
}

export function getPriority(
  score: number
): "TINGGI" | "SEDANG" | "RENDAH" {
  if (score < 60) {
    return "TINGGI";
  }

  if (score < 75) {
    return "SEDANG";
  }

  return "RENDAH";
}

export function getDiagnosis(
  category: Category,
  score: number
): AssessmentResult {
  const status = getStatus(score);
  const priority = getPriority(score);

  let diagnosis = "";
  let recommendation = "";

  if (category === "revenue") {
    if (score < 50) {
      diagnosis =
        "Strategi revenue hotel menunjukkan kelemahan yang cukup signifikan. Potensi pendapatan kamar kemungkinan belum dimaksimalkan melalui pricing, occupancy, channel mix dan analisis revenue.";

      recommendation =
        "Lakukan Revenue Reset dengan mengevaluasi BAR, ADR, RevPAR, occupancy, segmentasi tamu, harga OTA dan kontribusi setiap channel.";
    } else if (score < 70) {
      diagnosis =
        "Revenue hotel sudah berjalan tetapi masih terdapat ruang besar untuk meningkatkan optimalisasi harga dan pendapatan.";

      recommendation =
        "Mulai lakukan evaluasi harga secara berkala berdasarkan demand, kompetitor, occupancy dan performa masing-masing channel.";
    } else {
      diagnosis =
        "Fondasi revenue hotel sudah cukup baik dan memiliki sistem yang relatif terarah.";

      recommendation =
        "Fokus pada optimasi dynamic pricing, peningkatan RevPAR dan pengembangan revenue mix.";
    }
  }

  if (category === "operasional") {
    if (score < 50) {
      diagnosis =
        "Sistem operasional hotel masih memiliki ketergantungan tinggi terhadap individu dan belum memiliki standar kerja yang cukup kuat.";

      recommendation =
        "Prioritaskan pembangunan SOP, checklist, job description, quality control dan sistem audit operasional.";
    } else if (score < 70) {
      diagnosis =
        "Operasional hotel sudah berjalan tetapi konsistensi sistem masih perlu diperkuat.";

      recommendation =
        "Standarisasikan pekerjaan kritis dan mulai gunakan checklist serta KPI operasional.";
    } else {
      diagnosis =
        "Fondasi operasional hotel sudah relatif baik dan sistem kerja cukup terstruktur.";

      recommendation =
        "Fokus pada continuous improvement, quality control dan efisiensi biaya operasional.";
    }
  }

  if (category === "sdm") {
    if (score < 50) {
      diagnosis =
        "Sistem SDM merupakan salah satu risiko utama hotel. Operasional berpotensi terlalu bergantung pada individu tertentu.";

      recommendation =
        "Bangun struktur organisasi, job description, SOP kerja, KPI individu dan sistem training yang konsisten.";
    } else if (score < 70) {
      diagnosis =
        "Tim hotel sudah memiliki struktur dasar tetapi masih terdapat ruang untuk meningkatkan accountability dan produktivitas.";

      recommendation =
        "Perkuat KPI, evaluasi kinerja, training dan pembagian tanggung jawab setiap posisi.";
    } else {
      diagnosis =
        "Fondasi SDM hotel sudah cukup sehat dan struktur kerja relatif jelas.";

      recommendation =
        "Fokus pada peningkatan produktivitas, talent development dan succession planning.";
    }
  }

  if (category === "manajemen") {
    if (score < 50) {
      diagnosis =
        "Kontrol manajemen merupakan area kritis. Pengambilan keputusan berpotensi terlalu bergantung pada intuisi dibandingkan data.";

      recommendation =
        "Bangun dashboard owner yang memonitor revenue, occupancy, ADR, RevPAR, biaya dan KPI utama secara rutin.";
    } else if (score < 70) {
      diagnosis =
        "Sistem manajemen sudah berjalan tetapi belum sepenuhnya menggunakan data sebagai dasar pengambilan keputusan.";

      recommendation =
        "Perkuat reporting, KPI review, financial control dan dashboard manajemen.";
    } else {
      diagnosis =
        "Kontrol manajemen hotel sudah relatif kuat dan memiliki dasar pengambilan keputusan yang baik.";

      recommendation =
        "Fokus pada predictive analysis, budgeting dan peningkatan profitabilitas.";
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

export function getOverallDiagnosis(score: number) {
  if (score < 50) {
    return {
      status: "Prioritas Tinggi",
      description:
        "Hotel membutuhkan perbaikan fundamental pada beberapa area bisnis sebelum masuk ke tahap optimasi.",
    };
  }

  if (score < 65) {
    return {
      status: "Perlu Perbaikan",
      description:
        "Hotel memiliki fondasi bisnis, tetapi terdapat beberapa area yang dapat menghambat pertumbuhan revenue dan profitabilitas.",
    };
  }

  if (score < 80) {
    return {
      status: "Cukup Baik",
      description:
        "Hotel memiliki fondasi yang cukup sehat namun masih memiliki peluang signifikan untuk meningkatkan kinerja.",
    };
  }

  return {
    status: "Baik",
    description:
      "Fondasi bisnis hotel sudah cukup kuat. Fokus berikutnya adalah optimasi profitabilitas dan pertumbuhan.",
  };
}
