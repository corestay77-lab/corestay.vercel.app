const templates = [
  { title: "Hotel Budget Template", category: "Finance", price: "Rp49.000", desc: "Template budget hotel yang siap digunakan untuk menyusun dan memonitor anggaran." },
  { title: "Hotel P&L Template", category: "Finance", price: "Rp59.000", desc: "Template Profit & Loss untuk memantau revenue, cost, GOP, dan margin hotel." },
  { title: "Front Office SOP", category: "Operations", price: "Rp79.000", desc: "Template SOP front office untuk membantu membangun proses kerja yang konsisten." },
  { title: "Housekeeping SOP", category: "Operations", price: "Rp79.000", desc: "Template SOP housekeeping untuk room cleaning, inspection, dan kontrol operasional." },
  { title: "Hotel Pre-Opening Checklist", category: "Pre-Opening", price: "Rp89.000", desc: "Checklist praktis untuk memantau kesiapan hotel sebelum opening." },
  { title: "Hotel Revenue Management Template", category: "Revenue", price: "Rp69.000", desc: "Template untuk membantu monitoring ADR, occupancy, RevPAR, dan pricing." },
];

export default function HotelToolkitPage() {
  const wa = "https://wa.me/6285109006363";
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay Business Tools</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#17243d]">CoreStay Hotel Toolkit</h1>
        <p className="mt-4 max-w-3xl text-[#66738a]">Template praktis untuk owner dan manajemen hotel. Pilih template, lakukan pembelian, lalu file siap digunakan.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((item) => (
            <section key={item.title} className="flex flex-col rounded-3xl border border-[#dce4ef] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#55756b]">{item.category}</span>
                <span className="text-xs font-semibold text-[#8a6b35]">Digital Template</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-[#17243d]">{item.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#66738a]">{item.desc}</p>
              <div className="mt-6 border-t border-[#edf1f6] pt-5">
                <p className="text-2xl font-bold text-[#203b68]">{item.price}</p>
                <a href={`${wa}?text=${encodeURIComponent(`Halo CoreStay, saya ingin membeli ${item.title} seharga ${item.price}.`)}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#17243d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#203b68]">Beli & Dapatkan Template ↗</a>
              </div>
            </section>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#17243d]">Cara mendapatkan template</h2>
          <p className="mt-2 text-sm leading-6 text-[#66738a]">Klik template yang dibutuhkan → lakukan pembayaran → CoreStay mengirimkan file template yang sudah dibeli. Toolkit dapat terus ditambah dengan template baru.</p>
        </div>
      </div>
    </main>
  );
}
