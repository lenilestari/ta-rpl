# Aplikasi Absensi Perkuliahan

Aplikasi web responsif untuk mengelola absensi perkuliahan berbasis lokasi (GPS),
dibangun sebagai Tugas Akhir. Mendukung tiga peran pengguna — Admin, Dosen, dan
Mahasiswa — dengan antarmuka mobile-first (bottom navigation) untuk Dosen &
Mahasiswa, dan dashboard desktop untuk Admin.

## Fitur

**Admin**
- Kelola data master: Prodi, Mata Kuliah, Kelas, Jadwal mingguan
- Kelola akun Dosen & Mahasiswa (dibuat manual, tanpa self-registration)
- Melihat rekap kehadiran seluruh kelas

**Dosen**
- Membuka sesi absensi — lokasi GPS dosen saat itu menjadi titik acuan radius
- Mengisi jurnal mengajar (materi, capaian pembelajaran, catatan, foto dokumentasi)
- Melihat rekap kehadiran mahasiswa per kelas yang diampu, dengan export Excel/PDF

**Mahasiswa**
- Absen kehadiran — hanya aktif jika sesi sedang berjalan dan lokasi GPS mahasiswa
  berada dalam radius yang ditentukan dosen
- Melihat jadwal, riwayat kehadiran, dan materi yang telah diajarkan

## Keamanan

Validasi akses dan jarak lokasi ditegakkan di level database (Postgres Row Level
Security + Postgres function), bukan hanya di kode aplikasi — sehingga tidak mudah
dimanipulasi dari sisi client.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) (Postgres, Auth, Storage, Row Level Security)
- [antd](https://ant.design) — UI panel Admin
- [antd-mobile](https://mobile.ant.design) — UI Dosen & Mahasiswa (bottom navigation)
- [Vitest](https://vitest.dev) — unit & integration test
- Deploy: [Vercel](https://vercel.com)

## Setup Lokal

### 1. Clone & install dependencies

```bash
git clone https://github.com/lenilestari/ta-rpl.git
cd ta-rpl
npm install
```

### 2. Siapkan project Supabase

Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard), lalu dari
**Project Settings → API** salin **Project URL**, **anon public key**, dan
**service_role key**.

Salin `.env.local.example` menjadi `.env.local` dan isi tiga nilai tersebut:

```bash
cp .env.local.example .env.local
```

### 3. Jalankan migrasi database

Buka **SQL Editor** di Supabase Dashboard, lalu jalankan isi setiap file di
`supabase/migrations/` secara berurutan (sesuai nomor urutnya).

Alternatif: gunakan [Supabase CLI](https://supabase.com/docs/guides/local-development)
untuk menjalankan stack Supabase secara lokal lewat Docker (`npx supabase start`),
cocok untuk pengembangan tanpa mengubah data di project cloud.

### 4. Buat akun uji coba (opsional, untuk development)

```bash
npm run seed:test-accounts
```

Membuat tiga akun: `admin@test.local`, `dosen@test.local`, `mahasiswa@test.local`
(password `Password123!`).

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Menjalankan Test

```bash
npm run test
```

Mencakup unit test (logika murni) dan integration test (terhubung ke project
Supabase yang dikonfigurasi di `.env.local`).

## Struktur Folder

```
app/
  admin/        halaman & layout Admin (dashboard desktop)
  dosen/        halaman & layout Dosen (mobile, bottom navigation)
  mahasiswa/    halaman & layout Mahasiswa (mobile, bottom navigation)
  login/        halaman login
components/     komponen React yang dipakai lintas halaman
lib/
  supabase/     Supabase client (browser & server)
  auth/         util otorisasi (route guard per role)
scripts/        skrip bantu (seed akun uji coba, dll)
supabase/
  migrations/   migrasi SQL (schema, RLS policy)
tests/          unit & integration test
docs/superpowers/
  specs/        dokumen desain/spesifikasi
  plans/        rencana implementasi
```

## Screenshot

_(akan ditambahkan setelah antarmuka utama selesai dibangun)_
