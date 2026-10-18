# Our Memories - Frontend Web App

Aplikasi web privat Vue 3 + Vite + TypeScript untuk Our Memories.

## Fitur Utama
- **Desain "Soft Romantic Minimal"**: Menggunakan token CSS variables, palet lembut pinky-white modern, dan kontras teruji WCAG AA.
- **Tipografi Elegan**: Headings dengan *Fraunces* (serif) dan antarmuka dengan *Quicksand* (rounded sans-serif).
- **Mobile First**: Target sentuh terstandarisasi (>= 44x44px), tanpa horizontal overflow, responsif dari HP hingga layar lebar.
- **Zero-Byte Server Upload**: Upload dan stream langsung ke Cloudflare R2 melalui Presigned URL S3.
- **Dukungan Format Modern**: Integrasi heic2any untuk thumbnail format iPhone (.heic) dan exifr untuk ekstraksi tanggal foto.

## Cara Menjalankan Lokal

1. Salin environment:
   ```bash
   cp .env.example .env
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan development server:
   ```bash
   npm run dev
   ```
4. Build untuk production:
   ```bash
   npm run build
   ```

## Deploy ke Vercel
Aplikasi ini sudah dilengkapi dengan file `vercel.json` yang menangani *SPA routing rewrites* ke `/index.html` dan menambahkan HTTP security headers.
Cukup hubungkan repository GitHub frontend ke proyek Vercel baru dengan framework preset "Vite".
