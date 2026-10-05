create type public.user_role as enum ('admin', 'dosen', 'mahasiswa');

create table public.prodi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  nama text not null,
  nidn_nim text not null unique,
  prodi_id uuid references public.prodi(id),
  created_at timestamptz not null default now()
);

create table public.mata_kuliah (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  sks integer not null check (sks > 0),
  prodi_id uuid not null references public.prodi(id),
  created_at timestamptz not null default now()
);

create table public.kelas (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  mata_kuliah_id uuid not null references public.mata_kuliah(id) on delete cascade,
  dosen_id uuid not null references public.profiles(id),
  angkatan integer not null,
  created_at timestamptz not null default now()
);

create table public.enrollment (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  mahasiswa_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kelas_id, mahasiswa_id)
);

create table public.jadwal (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid not null references public.kelas(id) on delete cascade,
  hari smallint not null check (hari between 1 and 7),
  jam_mulai time not null,
  jam_selesai time not null check (jam_selesai > jam_mulai),
  ruang text not null,
  created_at timestamptz not null default now()
);

create table public.sesi (
  id uuid primary key default gen_random_uuid(),
  jadwal_id uuid not null references public.jadwal(id) on delete cascade,
  tanggal date not null,
  dosen_lat double precision,
  dosen_lng double precision,
  radius_meter integer not null default 100,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (jadwal_id, tanggal)
);

create table public.absensi (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references public.sesi(id) on delete cascade,
  mahasiswa_id uuid not null references public.profiles(id) on delete cascade,
  waktu_absen timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  jarak_meter double precision not null,
  unique (sesi_id, mahasiswa_id)
);

create table public.jurnal_mengajar (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null unique references public.sesi(id) on delete cascade,
  materi text not null,
  capaian text not null,
  catatan text,
  foto_url text,
  created_at timestamptz not null default now()
);
