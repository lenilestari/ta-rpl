# Desain: Aplikasi Absensi Perkuliahan (Tugas Akhir)

## 1. Tujuan & Latar Belakang

Aplikasi web responsif untuk mengelola absensi perkuliahan berbasis lokasi (geolocation),
mencakup absensi mahasiswa, absensi dosen, serta jurnal mengajar (materi & capaian
pembelajaran per sesi). Dibangun sebagai tugas akhir, akan di-upload ke GitHub dengan
README yang menjelaskan project secara lengkap.

**Target pengguna:** satu institusi/prodi (skala tugas akhir, bukan multi-kampus).

## 2. Aktor & Hak Akses

| Aktor | Layout | Akses utama |
|---|---|---|
| **Admin** | Dashboard desktop (sidebar + tabel) | Kelola Prodi, Mata Kuliah, Kelas, Jadwal, akun Dosen & Mahasiswa; lihat rekap kehadiran global |
| **Dosen** | Mobile bottom-nav, responsif ke layar besar | Buka sesi absen (titik GPS jadi acuan radius), isi jurnal mengajar, lihat rekap kehadiran kelas yang diampu + export |
| **Mahasiswa** | Mobile bottom-nav, responsif ke layar besar | Absen (hanya aktif saat sesi berjalan & lokasi dalam radius), lihat jadwal, riwayat kehadiran, materi yang sudah diajarkan |

Akun Dosen & Mahasiswa dibuat manual oleh Admin (NIDN/NIM + password) — tidak ada
self-registration.

## 3. Tech Stack

- **Frontend:** Next.js 14+ (App Router, TypeScript)
- **Backend/DB:** Supabase (Postgres + Auth), Row Level Security (RLS) aktif
- **UI Library:**
  - **antd** — untuk panel Admin (Layout, Sider, Table, Form)
  - **antd-mobile** — untuk Dosen & Mahasiswa (TabBar sebagai bottom navigation, List, Dialog, Picker)
- **Export laporan:** `xlsx` (Excel), print-to-PDF browser (PDF) — menghindari dependency PDF yang berat
- **Deployment:** Vercel
- **Geolocation:** Browser Geolocation API (`navigator.geolocation.getCurrentPosition`)

## 4. Model Data (Postgres)

```
prodi(id, nama)

profiles(id uuid references auth.users, role enum[admin|dosen|mahasiswa],
         nama, nidn_nim, prodi_id)

mata_kuliah(id, kode, nama, sks, prodi_id)

kelas(id, nama, mata_kuliah_id, dosen_id, angkatan)

enrollment(id, kelas_id, mahasiswa_id)
  -- mahasiswa terdaftar di satu/lebih kelas

jadwal(id, kelas_id, hari, jam_mulai, jam_selesai, ruang)
  -- jadwal mingguan berulang

sesi(id, jadwal_id, tanggal, dosen_lat, dosen_lng, radius_meter,
     opened_at, closed_at)
  -- instance harian dari jadwal, dibuka dosen

absensi(id, sesi_id, mahasiswa_id, waktu_absen, lat, lng, jarak_meter)

jurnal_mengajar(id, sesi_id, materi, capaian, catatan)
```

Status "sesi aktif" dihitung on-the-fly (antara `opened_at` dan `closed_at`, atau
`jam_selesai` jadwal jika `closed_at` belum diisi) — tanpa cron job/background worker.

## 5. Keamanan: RLS + Postgres Function

Pendekatan **RLS-first**: aturan akses ditegakkan di level database, bukan hanya di
kode aplikasi.

- RLS policies:
  - Admin: akses penuh semua tabel.
  - Dosen: baca/tulis hanya pada `kelas`/`jadwal`/`sesi`/`jurnal_mengajar` miliknya
    sendiri (`dosen_id = auth.uid()`); baca `absensi` milik mahasiswa di kelasnya.
  - Mahasiswa: baca jadwal & materi dari kelas tempat dia ter-enroll; insert
    `absensi` hanya untuk dirinya sendiri; baca riwayat `absensi` miliknya sendiri.
- Postgres functions (`security definer`, dipanggil via RPC dari server action):
  - `fn_open_sesi(jadwal_id, lat, lng)` — dosen membuka sesi, menyimpan titik GPS
    dosen sebagai acuan.
  - `fn_absen(sesi_id, lat, lng)` — menghitung jarak haversine dari koordinat
    mahasiswa ke titik dosen; menolak jika di luar `radius_meter` atau sesi tidak
    aktif; jika valid, insert ke `absensi` dengan `jarak_meter` tercatat.

Validasi jarak dilakukan **di server (Postgres function)**, bukan di client, agar
tidak mudah dimanipulasi.

## 6. Struktur Halaman & Navigasi

- `/login` — satu halaman login untuk semua role, redirect sesuai role setelah
  autentikasi.
- `/admin/*` — layout antd (Sider + konten): Prodi, Mata Kuliah, Kelas, Jadwal,
  Mahasiswa, Dosen, Rekap Global.
- `/dosen/*` — antd-mobile TabBar: Beranda (dashboard ringkasan + jadwal hari ini +
  tombol buka sesi), Jurnal, Rekap (+ export), Profil.
- `/mahasiswa/*` — antd-mobile TabBar: Beranda (dashboard ringkasan + jadwal hari
  ini + tombol absen), Riwayat, Materi, Profil.

**Dashboard Beranda Dosen** menampilkan: jumlah kelas diampu & sesi bulan ini, jadwal
hari ini, dan grafik ringkas tingkat kehadiran mahasiswa per kelas.

**Dashboard Beranda Mahasiswa** menampilkan: persentase kehadiran keseluruhan, jadwal
hari ini, dan grafik ringkas kehadiran per mata kuliah.

### Responsif lintas perangkat

Layout Dosen/Mahasiswa (bottom-nav) dipakai di semua ukuran layar — tidak berganti
jadi sidebar di layar besar. Di layar ≥768px (tablet/laptop/desktop), konten dibatasi
`max-width` (sekitar 480–600px) dan diposisikan di tengah, mirip tampilan aplikasi
chat web di browser desktop. Pendekatan ini konsisten di semua breakpoint dan tidak
memerlukan dua varian layout terpisah.

## 7. Laporan & Export

Halaman Rekap (Dosen & Admin) menampilkan tabel: Nama Mahasiswa, Total Hadir, Total
Sesi, Persentase Kehadiran — dengan filter Mata Kuliah/Kelas/rentang tanggal. Tombol
export menghasilkan file Excel (`xlsx`) dan opsi cetak ke PDF lewat dialog print
browser. Dosen hanya melihat kelas yang diampu; Admin melihat rekap seluruh kelas.

## 8. README (untuk GitHub)

README mencakup: deskripsi project & latar belakang tugas akhir, daftar fitur per
role, tech stack, cara setup lokal (env var Supabase, menjalankan migrasi SQL,
`npm run dev`), struktur folder, dan tempat untuk screenshot.

## 9. Di Luar Scope (saat ini)

- Multi-kampus/multi-institusi.
- Self-registration akun (akun dibuat manual oleh Admin).
- Upload foto dokumentasi jurnal mengajar.
- Notifikasi push/real-time alert.
- Cron job/auto-close sesi otomatis (status dihitung on-the-fly).
