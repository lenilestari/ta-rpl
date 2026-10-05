alter table public.prodi enable row level security;
alter table public.profiles enable row level security;
alter table public.mata_kuliah enable row level security;
alter table public.kelas enable row level security;
alter table public.enrollment enable row level security;
alter table public.jadwal enable row level security;
alter table public.sesi enable row level security;
alter table public.absensi enable row level security;
alter table public.jurnal_mengajar enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_rls_enabled(p_table text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select relrowsecurity from pg_class where relname = p_table and relnamespace = 'public'::regnamespace;
$$;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles_admin_all" on public.profiles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- prodi
create policy "prodi_select_authenticated" on public.prodi
  for select using (auth.role() = 'authenticated');

create policy "prodi_admin_write" on public.prodi
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- mata_kuliah
create policy "mk_select_authenticated" on public.mata_kuliah
  for select using (auth.role() = 'authenticated');

create policy "mk_admin_write" on public.mata_kuliah
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- kelas
create policy "kelas_admin_all" on public.kelas
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "kelas_dosen_select_own" on public.kelas
  for select using (dosen_id = auth.uid());

create policy "kelas_mahasiswa_select_enrolled" on public.kelas
  for select using (
    exists (
      select 1 from public.enrollment e
      where e.kelas_id = kelas.id and e.mahasiswa_id = auth.uid()
    )
  );

-- enrollment
create policy "enrollment_admin_all" on public.enrollment
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "enrollment_dosen_select_own_kelas" on public.enrollment
  for select using (
    exists (
      select 1 from public.kelas k
      where k.id = enrollment.kelas_id and k.dosen_id = auth.uid()
    )
  );

create policy "enrollment_mahasiswa_select_own" on public.enrollment
  for select using (mahasiswa_id = auth.uid());

-- jadwal
create policy "jadwal_admin_all" on public.jadwal
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "jadwal_dosen_select_own" on public.jadwal
  for select using (
    exists (select 1 from public.kelas k where k.id = jadwal.kelas_id and k.dosen_id = auth.uid())
  );

create policy "jadwal_mahasiswa_select_enrolled" on public.jadwal
  for select using (
    exists (
      select 1 from public.enrollment e
      where e.kelas_id = jadwal.kelas_id and e.mahasiswa_id = auth.uid()
    )
  );

-- sesi
create policy "sesi_admin_select" on public.sesi
  for select using (public.current_role() = 'admin');

create policy "sesi_dosen_all_own" on public.sesi
  for all using (
    exists (
      select 1 from public.jadwal j join public.kelas k on k.id = j.kelas_id
      where j.id = sesi.jadwal_id and k.dosen_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jadwal j join public.kelas k on k.id = j.kelas_id
      where j.id = sesi.jadwal_id and k.dosen_id = auth.uid()
    )
  );

create policy "sesi_mahasiswa_select_enrolled" on public.sesi
  for select using (
    exists (
      select 1 from public.jadwal j join public.enrollment e on e.kelas_id = j.kelas_id
      where j.id = sesi.jadwal_id and e.mahasiswa_id = auth.uid()
    )
  );

-- absensi
create policy "absensi_admin_select" on public.absensi
  for select using (public.current_role() = 'admin');

create policy "absensi_dosen_select_own_kelas" on public.absensi
  for select using (
    exists (
      select 1 from public.sesi s
      join public.jadwal j on j.id = s.jadwal_id
      join public.kelas k on k.id = j.kelas_id
      where s.id = absensi.sesi_id and k.dosen_id = auth.uid()
    )
  );

create policy "absensi_mahasiswa_select_own" on public.absensi
  for select using (mahasiswa_id = auth.uid());

create policy "absensi_mahasiswa_insert_own" on public.absensi
  for insert with check (mahasiswa_id = auth.uid());

-- jurnal_mengajar
create policy "jurnal_admin_select" on public.jurnal_mengajar
  for select using (public.current_role() = 'admin');

create policy "jurnal_dosen_all_own" on public.jurnal_mengajar
  for all using (
    exists (
      select 1 from public.sesi s
      join public.jadwal j on j.id = s.jadwal_id
      join public.kelas k on k.id = j.kelas_id
      where s.id = jurnal_mengajar.sesi_id and k.dosen_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sesi s
      join public.jadwal j on j.id = s.jadwal_id
      join public.kelas k on k.id = j.kelas_id
      where s.id = jurnal_mengajar.sesi_id and k.dosen_id = auth.uid()
    )
  );

create policy "jurnal_mahasiswa_select_enrolled" on public.jurnal_mengajar
  for select using (
    exists (
      select 1 from public.sesi s
      join public.jadwal j on j.id = s.jadwal_id
      join public.enrollment e on e.kelas_id = j.kelas_id
      where s.id = jurnal_mengajar.sesi_id and e.mahasiswa_id = auth.uid()
    )
  );
