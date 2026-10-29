# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## APLIKASI ABSENSI PERKULIAHAN BERBASIS WEB RESPONSIF (VALIDASI LOKASI GPS)

Versi 2.0 — 29 Oktober 2026
Mata Kuliah Rekayasa Perangkat Lunak — Tugas Akhir

> Dokumen ini menggantikan draft versi 1.0 (`SRS_Absensi_Mahasiswa_Format_IEEE830.docx`).
> Seluruh kebutuhan di bawah telah disesuaikan dengan desain yang benar-benar dibangun
> (lihat [spec desain](superpowers/specs/2026-10-05-aplikasi-absensi-design.md)), bukan
> lagi opsi-opsi yang masih dipertimbangkan. Riwayat keputusan atas pertanyaan terbuka
> pada draft sebelumnya ada di Lampiran B.

---

## Daftar Isi

1. Pendahuluan
   1.1 Tujuan
   1.2 Ruang Lingkup
   1.3 Definisi, Akronim, dan Singkatan
   1.4 Referensi
   1.5 Gambaran Umum Dokumen
2. Deskripsi Umum
   2.1 Perspektif Produk
   2.2 Fungsi Produk
   2.3 Karakteristik Pengguna
   2.4 Batasan
   2.5 Asumsi dan Ketergantungan
   2.6 Alokasi Kebutuhan
3. Kebutuhan Spesifik
   3.1 Antarmuka Eksternal
   3.2 Kebutuhan Fungsional
   3.3 Kebutuhan Kinerja
   3.4 Kebutuhan Logis Basis Data
   3.5 Batasan Desain
   3.6 Atribut Kualitas Sistem
   3.7 Kebutuhan Lain
Lampiran A. Alur Proses Utama
Lampiran B. Riwayat Keputusan Desain

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen Software Requirements Specification (SRS) ini mendefinisikan kebutuhan
perangkat lunak Aplikasi Absensi Perkuliahan — sistem web responsif yang mencatat
kehadiran mahasiswa dan dosen berbasis validasi lokasi GPS, dilengkapi jurnal mengajar
dosen dan pengelolaan data akademik oleh admin. Dokumen ini menjadi acuan bagi
pengembang, penguji, dosen pembimbing, dan pihak berkepentingan lain untuk memahami
fungsi yang harus disediakan oleh aplikasi.

### 1.2 Ruang Lingkup

Aplikasi Absensi Perkuliahan digunakan untuk mencatat kehadiran mahasiswa dan dosen
dalam sesi perkuliahan secara digital, menggantikan pencatatan manual di kertas.
Sistem menyediakan tiga peran pengguna:

- **Admin** — mengelola data master akademik (Program Studi, Mata Kuliah, Kelas,
  Jadwal mingguan) serta akun Dosen dan Mahasiswa, dan memantau rekap kehadiran
  seluruh kelas.
- **Dosen** — membuka sesi absensi untuk kelas yang diampu (lokasi GPS dosen saat itu
  menjadi titik acuan radius), mengisi jurnal mengajar (materi, capaian pembelajaran,
  catatan, dan foto dokumentasi opsional), serta melihat rekap kehadiran kelasnya
  dengan opsi ekspor.
- **Mahasiswa** — melakukan absensi yang hanya berhasil jika sesi sedang berjalan dan
  lokasi GPS mahasiswa berada dalam radius yang ditentukan, serta melihat jadwal,
  riwayat kehadiran, dan materi yang telah diajarkan.

Tujuan utama aplikasi adalah mengurangi kecurangan absensi (titip absen) melalui
validasi lokasi yang ditegakkan di sisi server, mempercepat rekap kehadiran untuk
keperluan akademik, dan mendokumentasikan proses belajar-mengajar (materi dan capaian)
secara terstruktur per sesi.

### 1.3 Definisi, Akronim, dan Singkatan

| Istilah | Definisi |
|---|---|
| SRS | Software Requirements Specification; dokumen spesifikasi kebutuhan perangkat lunak. |
| SDD | Software Design Description; dokumen deskripsi desain perangkat lunak. |
| Admin | Pengguna yang mengelola data master akademik dan akun pengguna lain. |
| Dosen | Pengguna yang mengampu kelas, membuka sesi absensi, dan mengisi jurnal mengajar. |
| Mahasiswa | Pengguna yang terdaftar di suatu kelas dan melakukan absensi pada sesi perkuliahan. |
| Sesi | Instansiasi harian dari suatu jadwal kelas, dibuka oleh dosen pada hari perkuliahan berlangsung. |
| Radius | Jarak maksimum (dalam meter) antara lokasi GPS mahasiswa dan titik GPS dosen agar absensi dianggap sah. |
| Jurnal Mengajar | Catatan materi, capaian pembelajaran, dan dokumentasi yang diisi dosen setelah sesi perkuliahan. |
| RLS | Row Level Security; mekanisme basis data Postgres yang membatasi akses baris data berdasarkan identitas dan peran pengguna. |
| GPS | Global Positioning System; sumber informasi lokasi perangkat. |

### 1.4 Referensi

- IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications* (format acuan dokumen ini).
- [docs/superpowers/specs/2026-10-05-aplikasi-absensi-design.md](superpowers/specs/2026-10-05-aplikasi-absensi-design.md) — spesifikasi desain project.
- [docs/SDD.md](SDD.md) — deskripsi desain perangkat lunak (dokumen pendamping).

### 1.5 Gambaran Umum Dokumen

Bagian 1 menjelaskan tujuan, ruang lingkup, istilah, dan referensi. Bagian 2
menjelaskan konteks produk, fungsi, pengguna, batasan, dan asumsi. Bagian 3
mendefinisikan antarmuka serta kebutuhan fungsional dan nonfungsional secara
terperinci. Lampiran berisi alur proses utama dan riwayat keputusan desain.

## 2. Deskripsi Umum

### 2.1 Perspektif Produk

Aplikasi merupakan sistem web responsif yang diakses melalui peramban (browser), baik
di ponsel, tablet, maupun laptop/desktop — bukan aplikasi mobile native. Antarmuka
Dosen dan Mahasiswa menggunakan pola navigasi bawah (*bottom navigation*) bergaya
aplikasi mobile yang tetap konsisten di layar besar (konten dibatasi lebar tengah).
Antarmuka Admin menggunakan pola dashboard dengan sidebar, yang menyesuaikan menjadi
menu dapat-disembunyikan (*collapsible drawer*) di layar sempit.

Sistem berkomunikasi dengan basis data dan layanan autentikasi pusat secara daring
(*online*). Validasi lokasi dilakukan dengan membandingkan koordinat GPS perangkat
mahasiswa terhadap koordinat GPS perangkat dosen yang direkam saat sesi dibuka.
Seluruh aturan akses data (siapa boleh membaca/menulis data apa) ditegakkan di level
basis data, bukan hanya di kode aplikasi — rincian mekanismenya dijelaskan di SDD.

### 2.2 Fungsi Produk

- Autentikasi pengguna berbasis email dan kata sandi, dengan pengalihan halaman sesuai
  peran (Admin/Dosen/Mahasiswa) setelah berhasil masuk.
- Admin mengelola data Program Studi, Mata Kuliah, Kelas, Jadwal mingguan, dan akun
  Dosen/Mahasiswa.
- Dosen membuka dan menutup sesi absensi untuk jadwalnya pada hari berjalan.
- Mahasiswa melakukan absensi pada sesi yang sedang aktif, dengan validasi lokasi GPS.
- Dosen mengisi jurnal mengajar (materi, capaian pembelajaran, catatan, foto opsional)
  untuk setiap sesi yang telah dibuka.
- Mahasiswa melihat jadwal, riwayat kehadiran pribadi, dan materi yang telah diajarkan.
- Dosen dan Admin melihat rekap kehadiran per kelas/mata kuliah dengan opsi ekspor
  (Excel dan cetak PDF melalui dialog cetak peramban).
- Dashboard ringkasan kehadiran ditampilkan pada halaman beranda Dosen dan Mahasiswa.

### 2.3 Karakteristik Pengguna

| Pengguna | Karakteristik dan kebutuhan |
|---|---|
| Mahasiswa | Pengguna perangkat mobile maupun desktop; membutuhkan alur absensi yang singkat dan jelas, serta dapat melihat status kehadirannya sendiri. |
| Dosen | Membutuhkan kontrol atas kapan sesi absensi dibuka, serta akses cepat untuk mencatat materi yang diajarkan dan memantau rekap kehadiran kelasnya. |
| Admin | Mengelola data akademik dan akun pengguna; terbiasa dengan antarmuka dashboard berbasis tabel/formulir di layar desktop. |

### 2.4 Batasan

- Validasi lokasi memerlukan izin akses lokasi (GPS) aktif pada perangkat pengguna.
- Absensi memerlukan koneksi jaringan aktif; sistem ini tidak menyediakan mode
  pencatatan luring (*offline*) dengan sinkronisasi belakangan.
- Akun Dosen dan Mahasiswa dibuat secara manual oleh Admin — tidak ada pendaftaran
  mandiri (*self-registration*).
- Akses data dibatasi sesuai peran pengguna, ditegakkan di level basis data.
- Aplikasi ditujukan untuk satu institusi/program studi (skala tugas akhir), bukan
  sistem multi-kampus.

### 2.5 Asumsi dan Ketergantungan

- Data Program Studi, Mata Kuliah, Kelas, Jadwal, Dosen, dan Mahasiswa dimasukkan ke
  sistem oleh Admin sebelum perkuliahan berjalan.
- Setiap pengguna memiliki satu akun yang terhubung ke tepat satu peran (Admin, Dosen,
  atau Mahasiswa).
- Layanan basis data dan autentikasi pusat (pihak ketiga) tersedia dan dapat diakses
  selama aplikasi digunakan.
- Perangkat pengguna memiliki kemampuan GPS dan mengizinkan akses lokasi ke peramban.

### 2.6 Alokasi Kebutuhan

Seluruh kebutuhan pada Bagian 3 dialokasikan sebagai kebutuhan versi pertama
(tidak ada kebutuhan yang ditunda ke versi berikutnya). Fitur yang sebelumnya berstatus
opsional pada draft sebelumnya (pengenalan wajah, absensi QR, cadangan lokal luring)
tidak termasuk ruang lingkup versi ini — lihat Lampiran B untuk alasannya.

## 3. Kebutuhan Spesifik

### 3.1 Antarmuka Eksternal

#### 3.1.1 Antarmuka Pengguna

- Halaman masuk (login) dengan email dan kata sandi.
- Beranda Dosen/Mahasiswa: dashboard ringkasan kehadiran + jadwal hari ini + tombol
  aksi utama (buka sesi / absen).
- Halaman jurnal mengajar (Dosen): formulir materi, capaian, catatan, unggah foto.
- Halaman riwayat kehadiran dan materi (Mahasiswa).
- Halaman rekap kehadiran dengan filter kelas/mata kuliah/rentang tanggal dan tombol
  ekspor (Dosen & Admin).
- Dashboard Admin: sidebar navigasi ke halaman kelola Prodi, Mata Kuliah, Kelas,
  Jadwal, Mahasiswa, dan Dosen, masing-masing berupa tabel data dan formulir CRUD.
- Pesan status yang jelas untuk setiap hasil aksi: berhasil, gagal beserta alasannya
  (misalnya di luar radius, sesi belum/tidak lagi aktif).

#### 3.1.2 Antarmuka Perangkat Keras

- Perangkat dengan peramban web modern (ponsel, tablet, laptop, atau desktop).
- Modul GPS/layanan lokasi perangkat, digunakan saat membuka sesi (Dosen) dan saat
  absen (Mahasiswa).
- Kamera perangkat, digunakan secara opsional saat mengunggah foto dokumentasi jurnal
  mengajar.

#### 3.1.3 Antarmuka Perangkat Lunak

- Layanan autentikasi pihak ketiga untuk identifikasi pengguna dan manajemen sesi
  login.
- Layanan basis data pusat untuk menyimpan seluruh data akademik dan kehadiran.
- Geolocation API bawaan peramban untuk memperoleh koordinat GPS pengguna.

#### 3.1.4 Antarmuka Komunikasi

Aplikasi bertukar data dengan layanan basis data dan autentikasi pusat melalui
HTTPS. Apabila layanan tidak dapat dijangkau, aplikasi harus menampilkan pesan
kegagalan yang jelas kepada pengguna. Rincian teknis protokol dan skema data
dijelaskan pada SDD.

### 3.2 Kebutuhan Fungsional

| ID | Pernyataan Kebutuhan |
|---|---|
| FR-01 | Sistem harus mengautentikasi pengguna (email dan kata sandi) sebelum memberikan akses ke fitur apa pun. |
| FR-02 | Sistem harus mengalihkan pengguna ke halaman beranda sesuai perannya (Admin/Dosen/Mahasiswa) setelah berhasil masuk. |
| FR-03 | Sistem harus mencegah pengguna mengakses halaman milik peran lain, baik melalui navigasi maupun tautan langsung. |
| FR-04 | Admin harus dapat menambah, mengubah, melihat, dan menghapus data Program Studi, Mata Kuliah, Kelas, dan Jadwal mingguan. |
| FR-05 | Admin harus dapat membuat akun Dosen dan Mahasiswa beserta data identitasnya (nama, NIDN/NIM). |
| FR-06 | Dosen harus dapat melihat daftar jadwal kelas yang diampu, termasuk jadwal hari berjalan. |
| FR-07 | Dosen harus dapat membuka sesi absensi untuk jadwal hari berjalan; sistem merekam koordinat GPS dosen saat sesi dibuka sebagai titik acuan. |
| FR-08 | Dosen harus dapat menutup sesi absensi yang sedang berjalan. |
| FR-09 | Mahasiswa hanya dapat melakukan absensi apabila terdaftar pada kelas terkait, sesi sedang aktif, dan lokasi GPS mahasiswa berada dalam radius yang ditetapkan dari titik acuan dosen. |
| FR-10 | Sistem harus menolak absensi beserta alasannya (sesi tidak aktif atau lokasi di luar radius) apabila salah satu syarat pada FR-09 tidak terpenuhi. |
| FR-11 | Sistem harus mencegah satu mahasiswa tercatat hadir lebih dari satu kali pada sesi yang sama. |
| FR-12 | Dosen harus dapat mengisi jurnal mengajar (materi, capaian pembelajaran, catatan, dan foto dokumentasi opsional) untuk setiap sesi yang telah dibuka. |
| FR-13 | Mahasiswa harus dapat melihat riwayat kehadirannya sendiri beserta materi yang telah diajarkan pada kelas yang diikuti. |
| FR-14 | Dosen harus dapat melihat rekap kehadiran mahasiswa untuk kelas yang diampunya. |
| FR-15 | Admin harus dapat melihat rekap kehadiran untuk seluruh kelas. |
| FR-16 | Sistem harus menyediakan ekspor rekap kehadiran ke berkas Excel dan opsi cetak ke PDF. |
| FR-17 | Sistem harus menampilkan dashboard ringkasan (persentase/ grafik kehadiran) pada halaman beranda Dosen dan Mahasiswa. |
| FR-18 | Sistem harus memberi tahu pengguna apabila akses lokasi GPS, kamera, atau koneksi jaringan tidak tersedia ketika diperlukan. |
| FR-19 | Sistem harus membatasi setiap operasi baca/tulis data sesuai hak akses peran pengguna yang sedang masuk. |
| FR-20 | Sistem harus mencatat waktu absensi dan jarak hasil validasi lokasi pada setiap catatan kehadiran untuk keperluan penelusuran. |

### 3.3 Kebutuhan Kinerja

| ID | Persyaratan |
|---|---|
| PR-01 | Dalam kondisi jaringan normal, hasil validasi absensi (berhasil/gagal) harus ditampilkan ke mahasiswa dalam waktu singkat (target diuji pada tahap pengujian, bukan bagian normatif dokumen ini). |
| PR-02 | Sistem harus mampu menangani proses buka-sesi dan absen secara bersamaan oleh banyak mahasiswa dalam satu kelas tanpa menghasilkan data kehadiran ganda. |
| PR-03 | Perhitungan jarak lokasi harus diproses di sisi server sehingga hasilnya konsisten terlepas dari perangkat yang digunakan mahasiswa. |

### 3.4 Kebutuhan Logis Basis Data

Sistem perlu menyimpan kelompok data berikut. Struktur tabel, tipe data, dan relasi
rinci ditetapkan pada SDD (lihat Information viewpoint).

| Kelompok Data | Atribut Minimum yang Diperlukan |
|---|---|
| Pengguna (Profil) | ID pengguna, nama, peran (Admin/Dosen/Mahasiswa), NIDN/NIM, program studi. |
| Data Akademik | Program Studi, Mata Kuliah (kode, nama, SKS), Kelas (nama, angkatan, dosen pengampu), Jadwal (hari, jam, ruang). |
| Keikutsertaan Kelas | Relasi mahasiswa terdaftar pada kelas tertentu. |
| Sesi | ID sesi, jadwal terkait, tanggal, koordinat GPS dosen, radius, waktu dibuka/ditutup. |
| Catatan Absensi | ID catatan, mahasiswa, sesi, waktu absen, koordinat GPS mahasiswa, jarak hasil validasi. |
| Jurnal Mengajar | ID jurnal, sesi terkait, materi, capaian pembelajaran, catatan, tautan foto dokumentasi. |

### 3.5 Batasan Desain

- Solusi harus berupa aplikasi web responsif yang dapat diakses dari ponsel, tablet,
  maupun desktop tanpa instalasi tambahan.
- Validasi lokasi dan aturan akses data harus ditegakkan di sisi server/basis data,
  bukan hanya logika di sisi klien, agar tidak mudah dimanipulasi.
- Antarmuka Dosen dan Mahasiswa harus konsisten menggunakan pola navigasi bawah pada
  seluruh ukuran layar.
- Teknologi, bahasa pemrograman, framework, dan skema basis data secara rinci
  dijelaskan pada SDD, bukan pada dokumen ini.

### 3.6 Atribut Kualitas Sistem

| ID | Atribut | Persyaratan |
|---|---|---|
| QA-01 | Kemudahan penggunaan | Alur absensi dan pesan kesalahan harus mudah dipahami oleh mahasiswa dan dosen tanpa pelatihan khusus. |
| QA-02 | Keamanan | Pengguna hanya dapat mengakses fungsi dan data sesuai perannya; aturan ini ditegakkan di level basis data (lihat SDD). |
| QA-03 | Privasi | Koordinat lokasi pengguna hanya digunakan untuk proses validasi absensi dan tidak ditampilkan kepada pengguna lain di luar kebutuhan tersebut. |
| QA-04 | Keandalan | Satu sesi atau satu mahasiswa tidak boleh menghasilkan lebih dari satu catatan kehadiran untuk sesi yang sama. |
| QA-05 | Keterlacakan | Setiap catatan kehadiran menyimpan waktu dan jarak hasil validasi untuk keperluan audit. |
| QA-06 | Kompatibilitas | Antarmuka harus tetap dapat digunakan secara wajar pada lebar layar ponsel maupun desktop. |
| QA-07 | Pemeliharaan | Pesan kesalahan harus membantu pengguna memahami penyebab kegagalan (misalnya di luar radius, sesi tidak aktif). |

### 3.7 Kebutuhan Lain

- Radius lokasi default dan dapat disesuaikan per sesi oleh dosen (nilai bawaan 100
  meter, dapat diubah sesuai kebutuhan lapangan).
- Tidak ada proses otomatis terjadwal (*cron job*) untuk menutup sesi; status sesi
  aktif dihitung berdasarkan waktu saat data dibaca.

## Lampiran A. Alur Proses Utama

1. Admin menyiapkan data Mata Kuliah, Kelas, Jadwal, serta akun Dosen dan Mahasiswa.
2. Dosen masuk ke sistem dan melihat jadwal mengajar hari ini.
3. Pada jam perkuliahan, Dosen membuka sesi absensi; sistem merekam lokasi GPS dosen
   dan radius yang berlaku.
4. Mahasiswa masuk ke sistem dan menekan tombol Absen pada jadwal yang sedang aktif.
5. Sistem memeriksa lokasi GPS mahasiswa terhadap titik acuan dosen:
   - Jika dalam radius dan sesi aktif → kehadiran tercatat, status "Hadir" ditampilkan.
   - Jika di luar radius atau sesi tidak aktif → absensi ditolak beserta alasannya.
6. Setelah sesi selesai, Dosen menutup sesi dan mengisi jurnal mengajar (materi,
   capaian, catatan, foto opsional).
7. Mahasiswa dapat melihat status kehadirannya dan materi yang baru diajarkan.
8. Dosen dan Admin dapat melihat rekap kehadiran kapan saja dan mengekspornya.

## Lampiran B. Riwayat Keputusan Desain

Tabel berikut mendokumentasikan bagaimana setiap pertanyaan terbuka pada draft SRS
versi 1.0 diputuskan, sebagai bentuk ketertelusuran (*traceability*).

| Pertanyaan Terbuka (v1.0) | Keputusan Final |
|---|---|
| Metode absensi final: QR, GPS, pengenalan wajah, kode kelas, atau kombinasi? | **GPS saja** — validasi jarak terhadap lokasi dosen saat sesi dibuka, dihitung di server. QR dan pengenalan wajah tidak dipakai (kompleksitas dan isu privasi biometrik tidak sepadan dengan manfaatnya untuk skala tugas akhir). |
| Apakah absensi bisa tanpa internet (offline)? | **Tidak.** Absensi memerlukan koneksi aktif; tidak ada mode cadangan lokal dengan sinkronisasi belakangan, untuk menyederhanakan konsistensi data. |
| Apakah Dosen pakai aplikasi mobile atau dashboard web? | **Web responsif dengan navigasi bawah (bottom navigation)**, bukan dashboard tabel seperti Admin — karena Dosen lebih banyak berinteraksi saat bergerak di kelas. |
| Aturan radius lokasi, waktu absensi, keterlambatan, dan koreksi data? | **Radius ditentukan per sesi** (nilai bawaan 100 meter) oleh sistem; aturan keterlambatan dan koreksi data manual tidak termasuk ruang lingkup versi ini. |
| Apakah fitur cetak/ekspor wajib atau opsional? | **Wajib** — ekspor Excel dan cetak PDF tersedia di halaman rekap Dosen dan Admin. |
| Platform mobile minimum dan mekanisme akun pengguna? | Tidak relevan — aplikasi adalah **web responsif** (peramban modern apa pun), bukan aplikasi native. Akun dibuat manual oleh Admin, login dengan email dan kata sandi. |
| Peran Administrator, "jika diterapkan"? | **Diterapkan sebagai peran inti**, bukan opsional — Admin mengelola seluruh data master akademik. |
