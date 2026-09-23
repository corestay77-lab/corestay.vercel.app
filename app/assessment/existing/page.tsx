"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  label: string;
  score: number;
};

type Question = {
  category: string;
  title: string;
  question: string;
  options: Option[];
};

const options: Option[] = [
  { label: "Belum ada / tidak dilakukan", score: 0 },
  { label: "Masih sangat terbatas", score: 25 },
  { label: "Sudah ada tetapi belum konsisten", score: 50 },
  { label: "Sudah berjalan dan dimonitor", score: 75 },
  { label: "Sudah optimal dan dievaluasi rutin", score: 100 },
];

const questions: Question[] = [
  {
    category: "revenue",
    title: "Revenue Management & Pricing",
    question: "Sejauh mana hotel menerapkan strategi pricing berbasis demand, segmentasi pasar, seasonality, dan pergerakan kompetitor?",
    options: [
      { label: "Belum memiliki struktur pricing; tarif lebih banyak ditetapkan secara flat atau berdasarkan kebiasaan.", score: 0 },
      { label: "Sudah ada penyesuaian tarif pada periode tertentu, tetapi belum menggunakan data demand dan kompetitor secara sistematis.", score: 25 },
      { label: "Dynamic pricing mulai diterapkan untuk beberapa periode atau segmen, namun belum konsisten antar-channel.", score: 50 },
      { label: "Pricing berbasis demand, seasonality, segmentasi, dan kompetitor sudah dijalankan serta direview secara berkala.", score: 75 },
      { label: "Strategi pricing dinamis terintegrasi dengan forecast, pickup, market intelligence, dan evaluasi revenue secara rutin.", score: 100 },
    ],
  },
  {
    category: "revenue",
    title: "Revenue Management & Pricing",
    question: "Sejauh mana manajemen menggunakan Occupancy, ADR, RevPAR, pickup, dan forecast sebagai dasar pengambilan keputusan revenue?",
    options: [
      { label: "KPI revenue belum tersedia atau hanya dilihat saat diperlukan.", score: 0 },
      { label: "Occupancy dan ADR tersedia, tetapi belum dianalisis secara rutin untuk keputusan bisnis.", score: 25 },
      { label: "Occupancy, ADR, dan RevPAR sudah dipantau, namun analisis tren dan forecast belum konsisten.", score: 50 },
      { label: "KPI utama direview secara periodik dan digunakan untuk mengarahkan pricing serta strategi penjualan.", score: 75 },
      { label: "Dashboard KPI, pickup, forecast, pace, dan variance menjadi bagian rutin dari revenue meeting dan decision making.", score: 100 },
    ],
  },
  {
    category: "revenue",
    title: "Revenue Management & Pricing",
    question: "Seberapa efektif hotel mengelola OTA, direct booking, corporate, wholesale, dan channel mix untuk menjaga net revenue?",
    options: [
      { label: "Distribusi masih bergantung pada satu atau dua channel tanpa strategi channel mix yang jelas.", score: 0 },
      { label: "Beberapa channel sudah aktif, tetapi kontribusi, biaya komisi, dan performanya belum dibandingkan.", score: 25 },
      { label: "Channel mix mulai dikelola berdasarkan volume dan revenue, namun belum ada target kontribusi yang jelas.", score: 50 },
      { label: "Hotel memiliki target channel mix dan secara berkala mengevaluasi revenue, conversion, serta distribution cost.", score: 75 },
      { label: "Channel mix dioptimalkan berdasarkan net ADR, acquisition cost, conversion, parity, dan profitability per channel.", score: 100 },
    ],
  },
  {
    category: "revenue",
    title: "Revenue Management & Pricing",
    question: "Seberapa terstruktur hotel mengelola promotion, discount, corporate rate, package, dan direct booking agar tidak menggerus ADR?",
    options: [
      { label: "Promo dan discount diberikan tanpa framework, target segment, atau evaluasi hasil yang jelas.", score: 0 },
      { label: "Promo sudah dilakukan pada periode tertentu, tetapi approval, segmentasi, dan evaluasi masih terbatas.", score: 25 },
      { label: "Hotel mulai memiliki promo berdasarkan periode atau segmen, namun belum seluruhnya diukur terhadap ADR dan conversion.", score: 50 },
      { label: "Setiap program memiliki target, periode, segmentasi, mekanisme approval, dan evaluasi performance.", score: 75 },
      { label: "Promotion strategy dikelola berdasarkan contribution margin, displacement, demand forecast, dan hasil kampanye secara terukur.", score: 100 },
    ],
  },

  {
    category: "sales",
    title: "Sales, Marketing & Distribution",
    question: "Seberapa tajam hotel mendefinisikan target market, customer segment, positioning, dan value proposition dibandingkan kompetitor setempat?",
    options: [
      { label: "Target market dan positioning belum dirumuskan secara formal.", score: 0 },
      { label: "Segmen utama sudah diketahui secara umum, tetapi belum diterjemahkan menjadi positioning dan value proposition yang jelas.", score: 25 },
      { label: "Segmentasi dan positioning sudah tersedia, namun penerapannya belum konsisten pada produk dan komunikasi.", score: 50 },
      { label: "Target segment, positioning, value proposition, dan competitive set menjadi acuan sales serta marketing.", score: 75 },
      { label: "Positioning ditopang market intelligence, customer insight, competitive mapping, dan dievaluasi berdasarkan performance segment.", score: 100 },
    ],
  },
  {
    category: "sales",
    title: "Sales, Marketing & Distribution",
    question: "Seberapa efektif tim Sales mengembangkan corporate account, government, group, MICE, travel trade, dan account potensial lainnya?",
    options: [
      { label: "Aktivitas sales bersifat reaktif dan belum memiliki account list atau target akuisisi.", score: 0 },
      { label: "Beberapa account sudah dikelola, tetapi prospecting dan follow-up belum memiliki ritme yang terukur.", score: 25 },
      { label: "Account management dan prospecting sudah berjalan dengan pipeline sederhana, namun conversion belum dianalisis konsisten.", score: 50 },
      { label: "Sales memiliki account segmentation, sales call plan, pipeline, target produksi, dan review berkala.", score: 75 },
      { label: "Strategic account management berjalan dengan revenue target per account, pipeline forecasting, conversion tracking, dan retention plan.", score: 100 },
    ],
  },
  {
    category: "sales",
    title: "Sales, Marketing & Distribution",
    question: "Seberapa terukur hotel menjalankan digital marketing, content, reputation management, campaign, dan customer acquisition?",
    options: [
      { label: "Aktivitas digital belum memiliki kalender, target, atau pengukuran hasil.", score: 0 },
      { label: "Media sosial dan promosi digital sudah berjalan, tetapi masih berorientasi pada aktivitas, bukan hasil bisnis.", score: 25 },
      { label: "Campaign dan content plan sudah tersedia dengan beberapa metrik seperti reach, engagement, atau booking.", score: 50 },
      { label: "Digital campaign memiliki target acquisition, tracking conversion, content calendar, dan evaluasi performance.", score: 75 },
      { label: "Marketing dikelola melalui attribution, ROAS/CAC, CRM, remarketing, reputation score, dan optimasi berbasis customer data.", score: 100 },
    ],
  },

  {
    category: "operasional",
    title: "Hotel Operations & Service Quality",
    question: "Sejauh mana hotel memiliki SOP, service standard, checklist, dan work instruction yang lengkap untuk setiap fungsi operasional?",
    options: [
      { label: "Sebagian besar proses masih mengandalkan kebiasaan dan pengalaman individu.", score: 0 },
      { label: "SOP tersedia pada beberapa departemen utama, namun belum lengkap atau belum diperbarui.", score: 25 },
      { label: "Mayoritas proses kritis sudah memiliki SOP dan checklist, tetapi implementasinya belum seragam.", score: 50 },
      { label: "SOP, checklist, service standard, dan work instruction tersedia serta direview secara berkala.", score: 75 },
      { label: "Dokumentasi operasional terintegrasi dengan audit, training, quality assurance, incident review, dan continuous improvement.", score: 100 },
    ],
  },
  {
    category: "operasional",
    title: "Hotel Operations & Service Quality",
    question: "Seberapa konsisten setiap departemen menjalankan standar kerja dan melakukan handover antar-shift maupun antar-departemen?",
    options: [
      { label: "Pelaksanaan kerja sangat bergantung pada individu dan belum memiliki mekanisme kontrol yang konsisten.", score: 0 },
      { label: "Standar kerja diketahui oleh tim, tetapi handover dan supervisory control masih sering terlewat.", score: 25 },
      { label: "Handover dan briefing sudah dilakukan, namun kualitas pelaksanaan berbeda antar-shift atau departemen.", score: 50 },
      { label: "Supervisor melakukan monitoring, briefing, checklist, dan corrective action secara konsisten.", score: 75 },
      { label: "Disiplin operasional didukung audit trail, service recovery log, cross-department coordination, dan review KPI layanan.", score: 100 },
    ],
  },
  {
    category: "operasional",
    title: "Hotel Operations & Service Quality",
    question: "Seberapa efektif hotel mengendalikan guest experience, cleanliness, maintenance, complaint handling, dan service recovery?",
    options: [
      { label: "Keluhan dan isu kualitas ditangani setelah terjadi tanpa sistem monitoring yang terstruktur.", score: 0 },
      { label: "Sudah ada pemeriksaan kualitas dan penanganan keluhan, tetapi dokumentasi dan follow-up belum konsisten.", score: 25 },
      { label: "Quality check, complaint log, dan preventive maintenance sudah berjalan pada area tertentu.", score: 50 },
      { label: "Guest feedback, inspection, complaint closure, preventive maintenance, dan service recovery dimonitor oleh manajemen.", score: 75 },
      { label: "Hotel menggunakan VOC, review analytics, QA audit, preventive maintenance KPI, root-cause analysis, dan service recovery measurement.", score: 100 },
    ],
  },
  {
    category: "operasional",
    title: "Hotel Operations & Service Quality",
    question: "Seberapa efektif hotel mengendalikan departmental cost, productivity, utility, wastage, dan operational efficiency tanpa menurunkan service standard?",
    options: [
      { label: "Biaya operasional belum memiliki target dan kontrol yang terstruktur.", score: 0 },
      { label: "Beberapa biaya utama dipantau, tetapi variance dan productivity belum dianalisis secara rutin.", score: 25 },
      { label: "Departmental budget dan cost monitoring sudah tersedia, namun corrective action belum konsisten.", score: 50 },
      { label: "Cost per occupied room, productivity, utility, wastage, dan budget variance direview secara berkala.", score: 75 },
      { label: "Operational efficiency dikendalikan melalui productivity benchmark, engineering controls, procurement discipline, cost-per-unit, dan continuous improvement.", score: 100 },
    ],
  },

  {
    category: "sdm",
    title: "People, Organization & Performance",
    question: "Seberapa jelas struktur organisasi, job description, span of control, delegation of authority, dan accountability di hotel?",
    options: [
      { label: "Struktur dan tanggung jawab masih informal serta banyak bergantung pada individu.", score: 0 },
      { label: "Struktur organisasi sudah tersedia, tetapi beberapa fungsi dan kewenangan masih tumpang tindih.", score: 25 },
      { label: "Job description dan reporting line mayoritas sudah jelas, namun accountability belum sepenuhnya terukur.", score: 50 },
      { label: "Organization structure, job description, authority matrix, dan accountability diterapkan secara konsisten.", score: 75 },
      { label: "Organisasi dirancang berdasarkan workload, productivity, succession, competency framework, dan business requirement.", score: 100 },
    ],
  },
  {
    category: "sdm",
    title: "People, Organization & Performance",
    question: "Seberapa terstruktur hotel melakukan manpower planning, recruitment, selection, onboarding, dan deployment berdasarkan kebutuhan operasi?",
    options: [
      { label: "Recruitment dilakukan terutama saat posisi kosong tanpa manpower plan dan workforce forecast.", score: 0 },
      { label: "Kebutuhan tenaga kerja mulai dipetakan, tetapi belum menggunakan workload dan productivity standard.", score: 25 },
      { label: "Manpower budget dan recruitment process sudah tersedia, namun workforce planning belum sepenuhnya berbasis forecast.", score: 50 },
      { label: "Manpower plan, recruitment timeline, competency requirement, onboarding, dan deployment dikendalikan secara sistematis.", score: 75 },
      { label: "Workforce planning menggunakan occupancy forecast, productivity ratio, skill matrix, talent pipeline, dan succession planning.", score: 100 },
    ],
  },
  {
    category: "sdm",
    title: "People, Organization & Performance",
    question: "Seberapa efektif hotel mengelola training, competency development, KPI individu, appraisal, engagement, dan succession?",
    options: [
      { label: "Training dan evaluasi kinerja belum memiliki kalender, indikator, atau dokumentasi yang konsisten.", score: 0 },
      { label: "Training dilakukan berdasarkan kebutuhan sesaat dan appraisal sudah ada tetapi belum menjadi dasar pengembangan.", score: 25 },
      { label: "Training plan, KPI, dan appraisal tersedia untuk sebagian besar posisi, namun linkage dengan career path masih terbatas.", score: 50 },
      { label: "Competency matrix, training plan, KPI, appraisal, coaching, dan development plan berjalan secara periodik.", score: 75 },
      { label: "Talent management terintegrasi dengan competency framework, performance calibration, career path, succession, dan ROI training.", score: 100 },
    ],
  },

  {
    category: "financial",
    title: "Financial Control & Profitability",
    question: "Seberapa andal hotel menghasilkan monthly P&L yang tepat waktu, akurat, dan dapat digunakan untuk mengevaluasi departmental profitability?",
    options: [
      { label: "Laporan keuangan belum tersedia secara rutin atau belum dapat digunakan untuk membaca kinerja hotel.", score: 0 },
      { label: "P&L tersedia, tetapi proses closing lambat dan rekonsiliasi atau klasifikasi biaya masih sering bermasalah.", score: 25 },
      { label: "Monthly P&L sudah tersedia dengan struktur yang cukup baik, namun variance analysis belum konsisten.", score: 50 },
      { label: "P&L diterbitkan tepat waktu, direkonsiliasi, dianalisis terhadap budget/forecast, dan dibahas dalam management review.", score: 75 },
      { label: "Financial reporting terintegrasi dengan departmental profitability, USALI-based analysis, forecast, scenario planning, dan management action.", score: 100 },
    ],
  },
  {
    category: "financial",
    title: "Financial Control & Profitability",
    question: "Seberapa kuat hotel mengendalikan departmental cost melalui budgeting, purchasing control, inventory, stock variance, dan cost-per-unit?",
    options: [
      { label: "Pengeluaran lebih banyak dikendalikan berdasarkan kebutuhan harian tanpa budget dan approval discipline yang jelas.", score: 0 },
      { label: "Budget dan purchasing process sudah ada, tetapi monitoring variance dan inventory belum konsisten.", score: 25 },
      { label: "Department budget, purchasing approval, stock control, dan cost review sudah berjalan namun belum sepenuhnya terintegrasi.", score: 50 },
      { label: "Budget versus actual, purchasing compliance, inventory variance, food cost, dan departmental cost direview rutin.", score: 75 },
      { label: "Cost control menggunakan zero-based review, supplier benchmarking, inventory analytics, yield control, cost-per-occupied-room, dan variance action plan.", score: 100 },
    ],
  },
  {
    category: "financial",
    title: "Financial Control & Profitability",
    question: "Seberapa baik manajemen memahami GOP, cash flow, working capital, break-even, profitability driver, dan kebutuhan pendanaan hotel?",
    options: [
      { label: "Fokus utama masih pada omzet dan saldo kas tanpa analisis profitability atau cash flow yang memadai.", score: 0 },
      { label: "Cash flow dan profit sudah diperhatikan, tetapi forecast dan driver utama belum dipetakan secara sistematis.", score: 25 },
      { label: "GOP, cash flow, dan beberapa profitability indicator sudah dianalisis, namun belum menjadi management routine.", score: 50 },
      { label: "Cash flow forecast, GOP, break-even, working capital, dan profitability driver dibahas dalam review manajemen.", score: 75 },
      { label: "Management menggunakan integrated financial model, scenario analysis, cash conversion, break-even sensitivity, dan capital planning.", score: 100 },
    ],
  },

  {
    category: "management",
    title: "Leadership, Strategy & Business Performance",
    question: "Sejauh mana keputusan manajemen hotel didasarkan pada data operasional, commercial performance, financial result, guest insight, dan market intelligence?",
    options: [
      { label: "Keputusan dominan berdasarkan pengalaman atau judgement tanpa dashboard dan analisis pendukung yang konsisten.", score: 0 },
      { label: "Data tersedia dari beberapa departemen, tetapi belum terintegrasi sebagai dasar keputusan manajemen.", score: 25 },
      { label: "Management menggunakan KPI dan laporan departemen, namun analisis root cause dan cross-functional insight belum rutin.", score: 50 },
      { label: "Commercial, operational, guest, dan financial data dibahas secara terintegrasi dalam management review.", score: 75 },
      { label: "Hotel menerapkan performance dashboard, data governance, predictive insight, scenario analysis, dan fact-based decision making.", score: 100 },
    ],
  },
  {
    category: "management",
    title: "Leadership, Strategy & Business Performance",
    question: "Seberapa disiplin owner dan management menjalankan business review, KPI review, action tracking, serta accountability lintas departemen?",
    options: [
      { label: "Business review tidak memiliki jadwal dan tindak lanjut yang terdokumentasi.", score: 0 },
      { label: "Review dilakukan ketika muncul masalah, tetapi action item dan PIC belum selalu ditindaklanjuti.", score: 25 },
      { label: "Management meeting dan KPI review sudah berjalan, namun konsistensi action tracking masih bervariasi.", score: 50 },
      { label: "Review memiliki agenda, KPI, action plan, PIC, deadline, dan follow-up yang terdokumentasi.", score: 75 },
      { label: "Performance governance berjalan dengan monthly business review, rolling action tracker, accountability matrix, escalation, dan closed-loop management.", score: 100 },
    ],
  },
  {
    category: "management",
    title: "Leadership, Strategy & Business Performance",
    question: "Seberapa jelas hotel memiliki strategic plan, annual target, budget, initiative portfolio, dan prioritas peningkatan kinerja yang terukur?",
    options: [
      { label: "Target bisnis belum diterjemahkan menjadi strategic priorities dan action plan yang terukur.", score: 0 },
      { label: "Target tahunan sudah ada, tetapi belum sepenuhnya diturunkan menjadi KPI, initiative, budget, dan PIC.", score: 25 },
      { label: "Strategic plan dan KPI sudah tersedia, namun prioritas initiative serta monitoring milestone belum konsisten.", score: 50 },
      { label: "Strategic priorities diterjemahkan menjadi target, budget, KPI, initiative, PIC, timeline, dan review berkala.", score: 75 },
      { label: "Strategy execution menggunakan balanced performance framework, initiative governance, scenario planning, milestone control, dan continuous re-prioritization.", score: 100 },
    ],
  },
];

const ASSESSMENT_VERSION = "v2.1 — AUTO NEXT ACTIVE";

const categories = [
  "revenue",
  "sales",
  "operasional",
  "sdm",
  "financial",
  "management",
];

export default function ExistingAssessmentPage() {
  const router = useRouter();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [respondentName, setRespondentName] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [phone, setPhone] = useState("");
  const [showIdentity, setShowIdentity] = useState(false);

  const question = questions[current];
  const selectedAnswer = answers[current];

  function selectAnswer(score: number) {
    const updated = [...answers];
    updated[current] = score;
    setAnswers(updated);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      return;
    }

    setShowIdentity(true);
  }

  function submitAssessment() {
    if (!respondentName.trim() || !hotelName.trim() || !phone.trim()) return;

    const result = calculateResult(answers);

    sessionStorage.setItem(
      "corestay_assessment",
      JSON.stringify(result)
    );

    notifyAssessmentCompleted(result);
    router.push("/assessment/existing/result");
  }

  function previousQuestion() {
    if (current > 0) {
      setCurrent(current - 1);
    }
  }

  function calculateResult(finalAnswers: number[]) {
    const categoryScores: Record<string, number> = {};

    categories.forEach((category) => {
      const categoryQuestions = questions
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.category === category);

      const values = categoryQuestions.map(
        ({ index }) => finalAnswers[index] ?? 0
      );

      categoryScores[category] = values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) /
              values.length
          )
        : 0;
    });

    const overall = Math.round(
      categories.reduce(
        (sum, category) => sum + categoryScores[category],
        0
      ) / categories.length
    );

    return {
      respondentName,
      hotelName,
      phone,
      hotelType: "existing",
      overall,
      revenue: categoryScores.revenue,
      sales: categoryScores.sales,
      operasional: categoryScores.operasional,
      sdm: categoryScores.sdm,
      financial: categoryScores.financial,
      management: categoryScores.management,
      diagnosis:
        overall >= 80
          ? "Hotel memiliki kondisi bisnis yang relatif sehat dengan fondasi yang sudah berjalan baik."
          : overall >= 60
          ? "Hotel memiliki fondasi bisnis yang cukup baik, namun masih terdapat performance gap."
          : overall >= 40
          ? "Hotel memiliki beberapa area bisnis yang membutuhkan corrective action."
          : "Hotel membutuhkan corrective action yang terstruktur pada area bisnis prioritas.",
      recommendation:
        "Hasil assessment menunjukkan area bisnis yang perlu diprioritaskan untuk meningkatkan kesehatan dan performa hotel. Fokus utama diarahkan pada perbaikan area dengan skor terendah, revenue improvement, pricing strategy, operational efficiency, people readiness, sales development, financial control dan management KPI. CoreStay Advisory dapat membantu owner menyusun corrective action, KPI dan monitoring implementasi sampai perbaikan kinerja berjalan terukur.",
      areaResults: categories.map((category) => {
        const score = categoryScores[category];
        return {
          category,
          title:
            {
              revenue: "Revenue & Pricing",
              sales: "Sales & Marketing",
              operasional: "Operasional",
              sdm: "SDM",
              financial: "Financial",
              management: "Management & Strategy",
            }[category],
          score,
          level: score >= 80 ? "READY" : score >= 60 ? "NEED IMPROVEMENT" : score >= 40 ? "HIGH RISK" : "CRITICAL",
          diagnosis:
            score >= 80
              ? "Area berjalan baik dan perlu dipertahankan melalui monitoring KPI."
              : score >= 60
              ? "Area cukup baik tetapi masih memiliki gap performa yang perlu diperbaiki."
              : score >= 40
              ? "Area memiliki gap performa yang membutuhkan corrective action."
              : "Area berada pada kondisi kritis dan membutuhkan perbaikan segera.",
          recommendation:
            score >= 80
              ? "Pertahankan performa dan lakukan continuous improvement berbasis KPI."
              : score >= 60
              ? "Identifikasi performance gap, tetapkan corrective action dan monitor KPI secara rutin."
              : score >= 40
              ? "Lakukan corrective action terstruktur dan monitoring mingguan pada area ini."
              : "Jadikan area ini prioritas perbaikan segera dengan action plan, PIC dan target yang terukur.",
        };
      }),
    };
  }

  function notifyAssessmentCompleted(result: ReturnType<typeof calculateResult>) {
    const areaTitles: Record<string, string> = {
      revenue: "Revenue & Pricing",
      sales: "Sales & Marketing",
      operasional: "Operasional",
      sdm: "SDM",
      financial: "Financial",
      management: "Management & Strategy",
    };

    const areas = categories.map((category) => {
      const score = result[category as keyof typeof result] as number;
      const recommendation =
        score >= 80
          ? "Pertahankan performa dan lakukan continuous improvement berbasis KPI."
          : score >= 60
          ? "Identifikasi performance gap, tetapkan corrective action dan monitor KPI secara rutin."
          : score >= 40
          ? "Lakukan corrective action terstruktur dan monitoring mingguan pada area ini."
          : "Jadikan area ini prioritas perbaikan segera dengan action plan, PIC dan target yang terukur.";

      const diagnosis =
        score >= 80
          ? "Area berjalan baik dan perlu dipertahankan melalui monitoring KPI."
          : score >= 60
          ? "Area cukup baik tetapi masih memiliki gap performa yang perlu diperbaiki."
          : score >= 40
          ? "Area memiliki gap performa yang membutuhkan corrective action."
          : "Area berada pada kondisi kritis dan membutuhkan perbaikan segera.";

      return {
        title: areaTitles[category],
        score,
        diagnosis,
        recommendation,
      };
    });

    const priorities = [...areas].sort((a, b) => a.score - b.score).slice(0, 3);
    const finalRecommendation =
      "Hasil assessment menunjukkan area bisnis yang perlu diprioritaskan untuk meningkatkan kesehatan dan performa hotel. Fokus utama diarahkan pada perbaikan area dengan skor terendah, revenue improvement, pricing strategy, operational efficiency, people readiness, sales development, financial control dan management KPI. CoreStay Advisory dapat membantu owner menyusun corrective action, KPI dan monitoring implementasi sampai perbaikan kinerja berjalan terukur.";
    const status = result.overall >= 80 ? "READY" : result.overall >= 60 ? "NEED IMPROVEMENT" : result.overall >= 40 ? "HIGH RISK" : "CRITICAL";
    const risk = result.overall >= 80 ? "LOW" : result.overall >= 60 ? "MEDIUM" : "HIGH";
    const diagnosis = result.overall >= 80
      ? "Hotel memiliki kondisi bisnis yang relatif sehat dengan fondasi yang sudah berjalan baik. Fokus berikutnya adalah menjaga konsistensi dan optimasi kinerja."
      : result.overall >= 60
      ? "Hotel memiliki fondasi bisnis yang cukup baik, namun masih terdapat beberapa performance gap yang perlu diperbaiki secara terukur."
      : result.overall >= 40
      ? "Hotel memiliki beberapa area bisnis yang membutuhkan corrective action dan monitoring manajemen agar kinerja dapat ditingkatkan."
      : "Hotel membutuhkan corrective action yang terstruktur pada area bisnis prioritas sebelum target peningkatan kinerja dapat dicapai.";

    // Fire-and-forget: jangan blok navigasi user kalau email gagal terkirim.
    fetch("/api/notify-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelType: "existing",
        hotelName: result.hotelName,
        respondentName: result.respondentName,
        phone: result.phone,
        overall: result.overall,
        status,
        risk,
        diagnosis,
        areas,
        priorities,
        recommendation: finalRecommendation,
      }),
    }).catch((err) => {
      console.error("Gagal mengirim notifikasi email assessment:", err);
    });
  }

  const progress = Math.round(
    ((current + 1) / questions.length) * 100
  );

  if (showIdentity) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <header>
            <div className="flex items-center justify-between">
              <Image src="/logo.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">Hotel Existing</span>
            </div>
            <h1 className="mt-8 text-3xl font-bold md:text-4xl">Identitas Pengisi Assessment</h1>
            <p className="mt-3 text-slate-400">Lengkapi data berikut sebelum melihat hasil assessment.</p>
          </header>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Nama</label>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Nama pengisi assessment" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Nama Hotel</label>
                <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Nama hotel" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">No. Tlp</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400" />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <button type="button" onClick={() => setShowIdentity(false)} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400">
                ← Kembali
              </button>
              <button type="button" onClick={submitAssessment} disabled={!respondentName.trim() || !hotelName.trim() || !phone.trim()} className={"rounded-xl px-6 py-3 text-sm font-semibold transition " + ((!respondentName.trim() || !hotelName.trim() || !phone.trim()) ? "cursor-not-allowed bg-slate-800 text-slate-600" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300")}>
                Lihat Hasil →
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <header>
          <div className="flex items-center justify-between">
            <Image src="/logo.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">
                Hotel Existing
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-semibold text-emerald-300">
                {ASSESSMENT_VERSION}
              </span>
            </div>
          </div>

          <h1 className="mt-8 text-4xl font-bold md:text-5xl">
            Assessment Kesehatan Bisnis Hotel
          </h1>

          <p className="mt-4 text-slate-400">
            Evaluasi kondisi hotel berdasarkan 6 area utama bisnis hotel.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              Pertanyaan {current + 1} dari {questions.length}
            </span>

            <span className="font-semibold text-cyan-400">
              {progress}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            {question.title}
          </p>

          <h2 className="mt-3 text-2xl font-bold leading-9">
            {question.question}
          </h2>

          <div className="mt-7 space-y-3">
            <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-300">
              ✓ Auto Next aktif — pilih satu jawaban untuk langsung lanjut ke pertanyaan berikutnya.
            </div>
            {question.options.map((option, index) => (
              <button
                key={`${option.label}-${index}`}
                type="button"
                onClick={() => selectAnswer(option.score)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedAnswer === option.score
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-950 hover:border-cyan-400"
                }`}
              >
                <div className="font-medium">
                  {option.label}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Nilai: {option.score}
                </div>
              </button>
            ))}
          </div>
        </section>

        

        <div className="mt-8 flex items-center justify-start">
          <button
            type="button"
            onClick={previousQuestion}
            disabled={current === 0}
            className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
              current === 0
                ? "cursor-not-allowed border-slate-800 text-slate-700"
                : "border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-400"
            }`}
          >
            ← Sebelumnya
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Jawab berdasarkan kondisi hotel Anda saat ini. {ASSESSMENT_VERSION}
        </p>

      </div>
    </main>
  );
}








