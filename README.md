This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Email Notifikasi Otomatis (Live)

Setiap kali user menyelesaikan assessment (baik alur *existing hotel* maupun
*pre-opening*) dan submit form lead, rekap hasilnya otomatis dikirim via email
ke tim CoreStay lewat [Resend](https://resend.com).

Setup:

1. Copy `.env.example` menjadi `.env.local`.
2. Isi `RESEND_API_KEY` (dari dashboard Resend) dan `ASSESSMENT_NOTIFY_EMAIL`
   (alamat email tim/admin yang menerima notifikasi lead baru).
3. (Opsional, untuk produksi) Verifikasi domain pengirim di Resend, lalu isi
   `ASSESSMENT_FROM_EMAIL`. Tanpa verifikasi domain, pengiriman memakai alamat
   default `onboarding@resend.dev` yang hanya bisa mengirim ke email pemilik
   akun Resend.

Logic pengiriman ada di `app/api/notify-assessment/route.ts` dan dipanggil dari
`app/lead/page.tsx` (existing hotel) serta
`app/assessment/pre-opening/lead/page.tsx` (pre-opening) tepat setelah data
lead berhasil disimpan/divalidasi. Kegagalan pengiriman email tidak
menghalangi user melanjutkan ke halaman hasil — error hanya dicatat di log
server.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
