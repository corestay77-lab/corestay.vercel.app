export default function PaketHargaPage() {
  const packages = [
    {
      code: "FREE",
      title: "Free Check",
      subtitle: "Gratis",
      description: "Untuk owner yang baru mengenal CoreStay dan ingin mendapatkan gambaran awal kondisi bisnis hotel.",
      items: ["Quick Hotel Health Check", "Beberapa indikator dasar", "Rekomendasi awal"],
      price: "Gratis",
      note: "Untuk owner yang baru mengenal CoreStay",
    },
    {
      code: "A",
      title: "Hotel Assessment",
      subtitle: "For Existing Hotels",
      description: "Diagnosis untuk menemukan masalah, peluang, dan prioritas perbaikan bisnis hotel.",
      items: ["Hotel Business Assessment", "Business Health Score", "Operational Review", "Revenue Review", "Risk & Red Flag", "Priority Recommendations"],
      price: "Rp499.000",
      note: "Assessment Project",
    },
    {
      code: "B",
      title: "Hotel Performance Acceleration Program",
      subtitle: "For Existing Hotels • 3–12 Months",
      description: "Program business improvement untuk meningkatkan performa hotel secara terukur.",
      items: ["Revenue Improvement", "Market Positioning", "Operational Enhancement", "Cost Efficiency", "Guest Experience Improvement", "Sustainable Growth Strategy"],
      price: "Rp2.500.000",
      note: "Base Fee / bulan + Success Fee 5%–10% dari incremental GOP",
    },
    {
      code: "C",
      title: "Hotel Business Transformation Program",
      subtitle: "Comprehensive Strategic Partnership",
      description: "CoreStay menjadi strategic partner untuk membantu hotel melakukan transformasi bisnis secara menyeluruh.",
      items: ["Business Strategy", "Operational Transformation", "Team Development", "Revenue Optimization", "Cost & Profitability Management", "Guest Experience", "Performance Management", "Long-Term Growth Planning"],
      price: "Rp7.500.000",
      note: "CoreStay Team Fee / bulan + Success Fee 5% dari GOP bila GOP Margin ≥ 30%",
    },
    {
      code: "D",
      title: "Hospitality Development & Pre-Opening Advisory",
      subtitle: "For New Hotel Development • 3–6 Months",
      description: "Advisory untuk owner/investor dari tahap konsep hingga kesiapan operasional hotel baru.",
      items: ["Concept Review", "Feasibility Summary", "Business Plan", "Budget & Financial Forecast", "Organization Structure", "SOP Framework", "Pre-Opening Checklist", "Operational Readiness Support"],
      price: "Rp35.000.000",
      note: "Fixed Project Fee",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay Business</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#17243d]">Paket & Harga</h1>
        <p className="mt-4 max-w-3xl text-[#66738a]">
          Solusi assessment dan advisory untuk bisnis hotel — mulai dari free check, assessment, performance improvement,
          business transformation, hingga hotel development dan pre-opening.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {packages.map((pkg) => (
            <section key={pkg.code} className="rounded-3xl border border-[#dce4ef] bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b8a80]">
                    {pkg.code === "FREE" ? "Free" : `Package ${pkg.code}`}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#17243d]">{pkg.title}</h2>
                  <p className="mt-1 text-sm font-medium text-[#203b68]">{pkg.subtitle}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#66738a]">{pkg.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-[#34425a]">
                {pkg.items.map((item) => <li key={item}>✓ {item}</li>)}
              </ul>
              <div className="mt-6 border-t border-[#edf1f6] pt-5">
                <p className="text-2xl font-bold text-[#203b68]">{pkg.price}</p>
                <p className="mt-1 text-xs leading-5 text-[#66738a]">{pkg.note}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
