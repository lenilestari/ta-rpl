# Project Setup & Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Supabase foundation — database schema, RLS-first security, authentication, and the three role-based UI shells (Admin dashboard, Dosen mobile, Mahasiswa mobile) — so each role can log in and land on a working, empty-but-correct home screen for their role.

**Architecture:** Next.js App Router (TypeScript) talking to Supabase (Postgres + Auth) via `@supabase/ssr`. All authorization is enforced by Postgres Row Level Security, not application code. `antd` powers the Admin dashboard shell; `antd-mobile` powers the Dosen/Mahasiswa bottom-nav shell, which stays bottom-nav at every viewport width (centered, max-width container on large screens) rather than switching to a sidebar.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Supabase (Postgres, Auth, RLS), `@supabase/ssr`, `@supabase/supabase-js`, `antd` + `@ant-design/nextjs-registry`, `antd-mobile`, Vitest (unit + integration tests), `tsx` (run TS scripts), `dotenv`.

**Spec:** [docs/superpowers/specs/2026-10-05-aplikasi-absensi-design.md](../specs/2026-10-05-aplikasi-absensi-design.md)

This plan covers the foundation only (Plan 1 of several). Subsequent plans will cover: attendance sessions & geolocation check-in, teaching journal, admin CRUD screens, and reporting/export — each building on the schema, auth, and shells established here.

## Global Constraints

- Stack is fixed: Next.js App Router + TypeScript, Supabase (Postgres/Auth/RLS), `antd` for Admin, `antd-mobile` for Dosen/Mahasiswa, deploy target Vercel. No Tailwind (antd handles styling).
- RLS-first: every application table has Row Level Security **enabled**, with no table left accessible by default grants alone.
- No self-registration: accounts are created only via the admin-side service-role script/action (`auth.users` + `profiles` created together, compensating delete on partial failure).
- The Dosen/Mahasiswa shell is bottom-nav at every breakpoint — content is capped at a centered `max-width` (~520px) on large screens, it never switches to a sidebar layout.
- No cron/background jobs anywhere in this phase; "sesi aktif" status (future plan) is computed on read, never stored as a derived boolean.
- Default `radius_meter` for a session is 100 (adjustable per session later) — this only affects the `sesi` table default in this plan; the check logic itself is a later plan.

## Review Focus

- RLS misconfigured allowing cross-role/cross-user data leakage (e.g., one mahasiswa reading another's profile row) — exercised by Task 6's RLS integration tests.
- A logged-in user for one role manually navigating to another role's URL (e.g., mahasiswa typing `/admin`) must be redirected, not merely hidden by UI — exercised by Task 10's route-guard unit tests plus its manual cross-role check.
- Login with invalid credentials, or a valid auth user with no matching `profiles` row, must show a clear error instead of crashing or leaving a blank page — exercised by Task 7's login action.
- The mobile shell must stay usable (not stretched edge-to-edge, not clipped) on a wide desktop viewport, since the requirement explicitly covers laptop/desktop/tablet, not just phones — exercised by Task 9's manual multi-width check.
- An account-creation failure partway through (auth user created, profile insert fails) must not leave an orphaned, unusable login — exercised by Task 5's compensating-delete behavior and its test.

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx` (placeholder, replaced in Task 7), `vitest.config.ts`, `vitest.setup.ts`, `.env.local.example`, `.gitignore` (from `create-next-app`)

**Interfaces:**
- Produces: a buildable Next.js App Router project with `antd` wired into the root layout via `AntdRegistry`; `npm run dev`, `npm run build`, `npm run test` scripts; Vitest configured to load `.env.local` before tests run.

- [ ] **Step 1: Scaffold with create-next-app**

Run (from the repo root, which currently only has `docs/` and `.git/`):

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir=false --import-alias "@/*" --no-tailwind --use-npm
```

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install antd @ant-design/nextjs-registry @ant-design/icons antd-mobile @supabase/supabase-js @supabase/ssr
npm install -D vitest dotenv tsx
```

- [ ] **Step 3: Wire AntdRegistry into the root layout**

Replace the generated `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'

export const metadata: Metadata = {
  title: 'Aplikasi Absensi Perkuliahan',
  description: 'Sistem absensi perkuliahan berbasis lokasi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Add Vitest config that loads `.env.local`**

Create `vitest.setup.ts`:

```ts
import { config } from 'dotenv'

config({ path: '.env.local' })
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

- [ ] **Step 5: Add the `test` and `seed:test-accounts` scripts to `package.json`**

In `package.json`, under `"scripts"`, add:

```json
"test": "vitest run",
"seed:test-accounts": "tsx scripts/seed-test-accounts.ts"
```

(The `seed:test-accounts` script is wired up now so Task 5 only has to add the file it points to.)

- [ ] **Step 6: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: Verify the project builds**

Run: `npm run build`
Expected: build completes with no TypeScript or compile errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with antd and vitest"
```

---

### Task 2: Supabase project wiring

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`

**Interfaces:**
- Consumes: `.env.local` values created in this task (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Produces: `createClient()` from `lib/supabase/client.ts` (browser, for Client Components), `async createClient()` from `lib/supabase/server.ts` (Server Components/Actions), and a session-refreshing `middleware.ts` with no role logic yet (role logic is added in Task 10).

- [ ] **Step 1: Create a Supabase project (manual)**

This step needs your own Supabase account and can't be scripted:

1. Go to the Supabase dashboard and create a new project.
2. From Project Settings → API, copy the **Project URL**, **anon public key**, and **service_role key**.
3. Copy `.env.local.example` to `.env.local` and fill in the three values:

```bash
cp .env.local.example .env.local
```

- [ ] **Step 2: Create the browser Supabase client**

`lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create the server Supabase client**

`lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component render; middleware refreshes the
            // session instead, so this is safe to ignore here.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create session-refreshing middleware**

`middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Verify the app still builds with the new files**

Run: `npm run build`
Expected: build completes with no errors (these files aren't used by any page yet, so this just confirms there are no type errors).

- [ ] **Step 6: Commit**

```bash
git add lib/supabase middleware.ts .env.local.example
git commit -m "feat: wire up Supabase browser/server clients and session middleware"
```

---

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Test: `tests/schema.integration.test.ts`

**Interfaces:**
- Consumes: `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`.
- Produces: Postgres tables `prodi`, `profiles`, `mata_kuliah`, `kelas`, `enrollment`, `jadwal`, `sesi`, `absensi`, `jurnal_mengajar`, and the `public.user_role` enum — consumed by every later task.

- [ ] **Step 1: Write the schema migration file**

`supabase/migrations/0001_schema.sql`:

```sql
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
```

`foto_url` stores a Supabase Storage path (not binary data) and stays nullable in this
plan — the Storage bucket, its RLS-equivalent storage policies, and the upload UI are
built in the later Teaching Journal plan. Reserving the column now avoids a schema
migration later.

- [ ] **Step 2: Write the verification test**

`tests/schema.integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const expectedTables = [
  'prodi',
  'profiles',
  'mata_kuliah',
  'kelas',
  'enrollment',
  'jadwal',
  'sesi',
  'absensi',
  'jurnal_mengajar',
]

describe('schema: tabel inti', () => {
  it.each(expectedTables)('tabel %s ada dan bisa diquery', async (table) => {
    const { error } = await admin.from(table).select('*').limit(1)
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx vitest run tests/schema.integration.test.ts`
Expected: FAIL — every table query errors with something like `relation "public.prodi" does not exist`.

- [ ] **Step 4: Apply the migration**

Open the Supabase dashboard → SQL Editor → paste the full contents of `supabase/migrations/0001_schema.sql` → Run.

- [ ] **Step 5: Run the test again and confirm it passes**

Run: `npx vitest run tests/schema.integration.test.ts`
Expected: PASS — all 9 table checks succeed.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_schema.sql tests/schema.integration.test.ts
git commit -m "feat: add core database schema migration"
```

---

### Task 4: RLS policies

**Files:**
- Create: `supabase/migrations/0002_rls.sql`
- Test: `tests/rls-enabled.integration.test.ts`

**Interfaces:**
- Consumes: tables from Task 3.
- Produces: RLS enabled + policies on all 9 tables; `public.current_role() returns user_role`; `public.is_rls_enabled(p_table text) returns boolean` (test-only introspection helper) — consumed by Task 6's behavioral tests.

- [ ] **Step 1: Write the RLS migration file**

`supabase/migrations/0002_rls.sql`:

```sql
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
```

- [ ] **Step 2: Write the RLS-enabled verification test**

`tests/rls-enabled.integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const tables = [
  'prodi', 'profiles', 'mata_kuliah', 'kelas', 'enrollment',
  'jadwal', 'sesi', 'absensi', 'jurnal_mengajar',
]

describe('RLS diaktifkan di semua tabel inti', () => {
  it.each(tables)('RLS aktif untuk tabel %s', async (table) => {
    const { data, error } = await admin.rpc('is_rls_enabled', { p_table: table })
    expect(error).toBeNull()
    expect(data).toBe(true)
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx vitest run tests/rls-enabled.integration.test.ts`
Expected: FAIL — `is_rls_enabled` function doesn't exist yet.

- [ ] **Step 4: Apply the migration**

Supabase dashboard → SQL Editor → paste `supabase/migrations/0002_rls.sql` → Run.

- [ ] **Step 5: Run the test again and confirm it passes**

Run: `npx vitest run tests/rls-enabled.integration.test.ts`
Expected: PASS — all 9 tables report RLS enabled.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_rls.sql tests/rls-enabled.integration.test.ts
git commit -m "feat: enable RLS and add per-role policies on all core tables"
```

---

### Task 5: Seed test accounts

**Files:**
- Create: `scripts/seed-test-accounts.ts`
- Test: `tests/seed-accounts.integration.test.ts`

**Interfaces:**
- Consumes: `profiles` table (Task 3), RLS policies (Task 4, via service-role which bypasses RLS).
- Produces: three accounts usable by every later task and by manual testing: `admin@test.local` / `dosen@test.local` / `mahasiswa@test.local`, all with password `Password123!`, and `nidn_nim` values `ADM001` / `NIDN001` / `NIM001` respectively.

- [ ] **Step 1: Write the seed script**

`scripts/seed-test-accounts.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type SeedAccount = {
  email: string
  password: string
  role: 'admin' | 'dosen' | 'mahasiswa'
  nama: string
  nidn_nim: string
}

const accounts: SeedAccount[] = [
  { email: 'admin@test.local', password: 'Password123!', role: 'admin', nama: 'Admin Uji Coba', nidn_nim: 'ADM001' },
  { email: 'dosen@test.local', password: 'Password123!', role: 'dosen', nama: 'Dosen Uji Coba', nidn_nim: 'NIDN001' },
  { email: 'mahasiswa@test.local', password: 'Password123!', role: 'mahasiswa', nama: 'Mahasiswa Uji Coba', nidn_nim: 'NIM001' },
]

async function createAccount(account: SeedAccount) {
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
  })

  if (userError || !userData.user) {
    throw new Error(`Gagal membuat auth user ${account.email}: ${userError?.message}`)
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userData.user.id,
    role: account.role,
    nama: account.nama,
    nidn_nim: account.nidn_nim,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    throw new Error(
      `Gagal membuat profile untuk ${account.email}, auth user dihapus kembali: ${profileError.message}`
    )
  }

  console.log(`Akun dibuat: ${account.email} (${account.role})`)
}

async function main() {
  for (const account of accounts) {
    await createAccount(account)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
```

- [ ] **Step 2: Write the verification test**

`tests/seed-accounts.integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('akun uji coba', () => {
  it.each([
    ['ADM001', 'admin'],
    ['NIDN001', 'dosen'],
    ['NIM001', 'mahasiswa'],
  ])('akun dengan nidn_nim %s punya role %s', async (nidnNim, role) => {
    const { data, error } = await admin
      .from('profiles')
      .select('role')
      .eq('nidn_nim', nidnNim)
      .single()

    expect(error).toBeNull()
    expect(data?.role).toBe(role)
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx vitest run tests/seed-accounts.integration.test.ts`
Expected: FAIL — no matching rows yet (`data` is null, `error` reports no rows).

- [ ] **Step 4: Run the seed script**

Run: `npm run seed:test-accounts`
Expected: three "Akun dibuat: ..." lines logged, exit code 0.

- [ ] **Step 5: Run the test again and confirm it passes**

Run: `npx vitest run tests/seed-accounts.integration.test.ts`
Expected: PASS for all three accounts.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-test-accounts.ts tests/seed-accounts.integration.test.ts
git commit -m "feat: add seed script for admin/dosen/mahasiswa test accounts"
```

---

### Task 6: RLS behavioral integration tests

**Files:**
- Create: `tests/rls.integration.test.ts`

**Interfaces:**
- Consumes: seeded accounts from Task 5, RLS policies from Task 4.
- Produces: no new runtime code — this task is the automated proof that the policies in Task 4 behave correctly for the profiles/mata_kuliah cases that don't require any kelas/enrollment data yet (that deeper cross-kelas isolation is exercised once Admin CRUD creates real kelas/enrollment data, in a later plan).

- [ ] **Step 1: Write the behavioral test**

`tests/rls.integration.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function signInAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl, anonKey)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Gagal login sebagai ${email}: ${error.message}`)
  return client
}

describe('RLS: tabel profiles dan mata_kuliah', () => {
  let mahasiswaClient: SupabaseClient
  let adminClient: SupabaseClient
  let dosenProfileId: string

  beforeAll(async () => {
    mahasiswaClient = await signInAs('mahasiswa@test.local', 'Password123!')
    adminClient = await signInAs('admin@test.local', 'Password123!')

    const { data: dosenProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('nidn_nim', 'NIDN001')
      .single()
    dosenProfileId = dosenProfile!.id
  })

  it('mahasiswa tidak bisa melihat profile dosen lain', async () => {
    const { data, error } = await mahasiswaClient
      .from('profiles')
      .select('id')
      .eq('id', dosenProfileId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('mahasiswa bisa melihat profile miliknya sendiri', async () => {
    const { data: authData } = await mahasiswaClient.auth.getUser()
    const { data, error } = await mahasiswaClient
      .from('profiles')
      .select('id')
      .eq('id', authData.user!.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('admin bisa melihat profile siapa saja', async () => {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', dosenProfileId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('mahasiswa tidak bisa insert ke tabel mata_kuliah', async () => {
    const { error } = await mahasiswaClient.from('mata_kuliah').insert({
      kode: 'TEST101',
      nama: 'Test',
      sks: 3,
      prodi_id: '00000000-0000-0000-0000-000000000000',
    })

    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and confirm it passes**

Run: `npx vitest run tests/rls.integration.test.ts`
Expected: PASS for all four assertions. If any fail, re-check the corresponding policy in `supabase/migrations/0002_rls.sql` before moving on — this is the task that proves the security model actually works.

- [ ] **Step 3: Commit**

```bash
git add tests/rls.integration.test.ts
git commit -m "test: verify RLS cross-role isolation on profiles and mata_kuliah"
```

---

### Task 7: Login page, auth action, and role-based redirect

**Files:**
- Create: `app/login/page.tsx`, `app/login/login-form.tsx`, `app/login/actions.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 2), seeded accounts (Task 5).
- Produces: `login(email: string, password: string): Promise<{ error: string } | never>` in `app/login/actions.ts` (redirects on success — never returns normally); `/` redirects to `/login` or `/{role}` depending on auth state.

- [ ] **Step 1: Write the login server action**

`app/login/actions.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email atau password salah' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (!profile) {
    return { error: 'Akun ditemukan tetapi profil belum lengkap. Hubungi admin.' }
  }

  redirect(`/${profile.role}`)
}
```

- [ ] **Step 2: Write the login form**

`app/login/login-form.tsx`:

```tsx
'use client'

import { Form, Input, Button, Alert } from 'antd'
import { useState, useTransition } from 'react'
import { login } from './actions'

type FormValues = {
  email: string
  password: string
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFinish(values: FormValues) {
    setError(null)
    startTransition(async () => {
      const result = await login(values.email, values.password)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <Form layout="vertical" onFinish={handleFinish}>
      <h1 style={{ marginBottom: 24 }}>Masuk</h1>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email wajib diisi' }]}>
        <Input autoComplete="username" />
      </Form.Item>
      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Password wajib diisi' }]}
      >
        <Input.Password autoComplete="current-password" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={isPending}>
          Masuk
        </Button>
      </Form.Item>
    </Form>
  )
}
```

- [ ] **Step 3: Write the login page**

`app/login/page.tsx`:

```tsx
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <LoginForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Replace the root page with an auth-state redirect**

`app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(profile ? `/${profile.role}` : '/login')
}
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `http://localhost:3000`.

1. Expect redirect to `/login`.
2. Submit wrong credentials (e.g. `admin@test.local` / `wrongpass`) → expect the red "Email atau password salah" alert, no crash.
3. Submit `admin@test.local` / `Password123!` → expect redirect to `/admin` (404 is fine for now — the route doesn't exist until Task 8 — but the redirect itself must happen).
4. Repeat with `dosen@test.local` → expect redirect to `/dosen`.
5. Repeat with `mahasiswa@test.local` → expect redirect to `/mahasiswa`.

- [ ] **Step 6: Commit**

```bash
git add app/login app/page.tsx
git commit -m "feat: add login page with role-based redirect"
```

---

### Task 8: Admin dashboard shell

**Files:**
- Create: `app/admin/admin-shell.tsx`, `app/admin/layout.tsx`, `app/admin/page.tsx`

**Interfaces:**
- Produces: `AdminShell` component wrapping all `/admin/*` routes with an `antd` `Layout` + `Sider` + `Menu`, collapsible via a hamburger button so the Admin panel stays usable on a phone-width screen too; placeholder dashboard page at `/admin`.

- [ ] **Step 1: Write the Admin shell component**

`app/admin/admin-shell.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Layout, Menu, Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: '/admin', label: 'Dashboard' },
  { key: '/admin/prodi', label: 'Prodi' },
  { key: '/admin/mata-kuliah', label: 'Mata Kuliah' },
  { key: '/admin/kelas', label: 'Kelas' },
  { key: '/admin/jadwal', label: 'Jadwal' },
  { key: '/admin/mahasiswa', label: 'Mahasiswa' },
  { key: '/admin/dosen', label: 'Dosen' },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
      >
        <div style={{ color: '#fff', padding: 16, fontWeight: 600 }}>Admin Absensi</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <span style={{ marginLeft: 12 }}>Panel Admin</span>
        </Header>
        <Content style={{ margin: 16 }}>{children}</Content>
      </Layout>
    </Layout>
  )
}
```

`collapsed` is controlled explicitly (rather than left to antd's default trigger) because `collapsedWidth="0"` hides the built-in trigger along with the sider — without this hamburger button, a user on a phone-width screen could never reopen the sidebar.

- [ ] **Step 2: Write the Admin layout**

`app/admin/layout.tsx`:

```tsx
import { AdminShell } from './admin-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
```

- [ ] **Step 3: Write the placeholder dashboard page**

`app/admin/page.tsx`:

```tsx
export default function AdminDashboardPage() {
  return <div>Dashboard Admin (ringkasan akan ditambahkan di tahap berikutnya)</div>
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as `admin@test.local`.

1. At desktop width (≥992px): expect redirected to `/admin`, dark sidebar with 7 menu items visible by default, clicking "Mata Kuliah" navigates to `/admin/mata-kuliah` (a 404 is fine — that page is built in a later plan — but the sidebar navigation itself must work).
2. At phone width (e.g. browser devtools device toolbar, 375px wide): expect the sidebar starts collapsed (width 0), the hamburger button is visible in the header, tapping it opens the sidebar, tapping a menu item navigates and the sidebar closes again on the next tap of the hamburger — confirming Admin stays usable on a phone, not just desktop.

- [ ] **Step 5: Commit**

```bash
git add app/admin
git commit -m "feat: add Admin dashboard shell with sidebar navigation"
```

---

### Task 9: Dosen & Mahasiswa mobile shell

**Files:**
- Create: `components/mobile-shell.tsx`, `app/dosen/layout.tsx`, `app/dosen/page.tsx`, `app/dosen/jurnal/page.tsx`, `app/dosen/rekap/page.tsx`, `app/dosen/profil/page.tsx`, `app/mahasiswa/layout.tsx`, `app/mahasiswa/page.tsx`, `app/mahasiswa/riwayat/page.tsx`, `app/mahasiswa/materi/page.tsx`, `app/mahasiswa/profil/page.tsx`

**Interfaces:**
- Produces: `MobileShell({ children, tabs }: { children: React.ReactNode; tabs: { key: string; title: string }[] })` in `components/mobile-shell.tsx`, reused by both `/dosen/*` and `/mahasiswa/*` layouts.

- [ ] **Step 1: Write the shared mobile shell**

`components/mobile-shell.tsx`:

```tsx
'use client'

import { TabBar } from 'antd-mobile'
import { useRouter, usePathname } from 'next/navigation'

type TabItem = {
  key: string
  title: string
}

export function MobileShell({
  children,
  tabs,
}: {
  children: React.ReactNode
  tabs: TabItem[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 56 }}>{children}</div>
        <div style={{ position: 'sticky', bottom: 0 }}>
          <TabBar activeKey={pathname} onChange={(key) => router.push(key)}>
            {tabs.map((tab) => (
              <TabBar.Item key={tab.key} title={tab.title} />
            ))}
          </TabBar>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the Dosen layout and placeholder pages**

`app/dosen/layout.tsx`:

```tsx
import { MobileShell } from '@/components/mobile-shell'

const tabs = [
  { key: '/dosen', title: 'Beranda' },
  { key: '/dosen/jurnal', title: 'Jurnal' },
  { key: '/dosen/rekap', title: 'Rekap' },
  { key: '/dosen/profil', title: 'Profil' },
]

export default function DosenLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell tabs={tabs}>{children}</MobileShell>
}
```

`app/dosen/page.tsx`:

```tsx
export default function DosenBerandaPage() {
  return (
    <div style={{ padding: 16 }}>Beranda Dosen (dashboard ringkasan ditambahkan di tahap berikutnya)</div>
  )
}
```

`app/dosen/jurnal/page.tsx`:

```tsx
export default function DosenJurnalPage() {
  return <div style={{ padding: 16 }}>Jurnal Mengajar (ditambahkan di tahap berikutnya)</div>
}
```

`app/dosen/rekap/page.tsx`:

```tsx
export default function DosenRekapPage() {
  return <div style={{ padding: 16 }}>Rekap Kehadiran (ditambahkan di tahap berikutnya)</div>
}
```

`app/dosen/profil/page.tsx`:

```tsx
export default function DosenProfilPage() {
  return <div style={{ padding: 16 }}>Profil Dosen (ditambahkan di tahap berikutnya)</div>
}
```

- [ ] **Step 3: Write the Mahasiswa layout and placeholder pages**

`app/mahasiswa/layout.tsx`:

```tsx
import { MobileShell } from '@/components/mobile-shell'

const tabs = [
  { key: '/mahasiswa', title: 'Beranda' },
  { key: '/mahasiswa/riwayat', title: 'Riwayat' },
  { key: '/mahasiswa/materi', title: 'Materi' },
  { key: '/mahasiswa/profil', title: 'Profil' },
]

export default function MahasiswaLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell tabs={tabs}>{children}</MobileShell>
}
```

`app/mahasiswa/page.tsx`:

```tsx
export default function MahasiswaBerandaPage() {
  return (
    <div style={{ padding: 16 }}>
      Beranda Mahasiswa (dashboard ringkasan ditambahkan di tahap berikutnya)
    </div>
  )
}
```

`app/mahasiswa/riwayat/page.tsx`:

```tsx
export default function MahasiswaRiwayatPage() {
  return <div style={{ padding: 16 }}>Riwayat Kehadiran (ditambahkan di tahap berikutnya)</div>
}
```

`app/mahasiswa/materi/page.tsx`:

```tsx
export default function MahasiswaMateriPage() {
  return <div style={{ padding: 16 }}>Materi yang Diajarkan (ditambahkan di tahap berikutnya)</div>
}
```

`app/mahasiswa/profil/page.tsx`:

```tsx
export default function MahasiswaProfilPage() {
  return <div style={{ padding: 16 }}>Profil Mahasiswa (ditambahkan di tahap berikutnya)</div>
}
```

- [ ] **Step 4: Manual verification across viewport widths**

Run: `npm run dev`. Log in as `dosen@test.local`, then as `mahasiswa@test.local`, and for each:

1. At a narrow viewport (e.g. browser devtools device toolbar, 375px wide): confirm the bottom TabBar is pinned to the bottom, content scrolls above it, and tapping each tab navigates correctly (active tab highlighted).
2. At a wide viewport (e.g. 1440px wide): confirm the content column stays capped at ~520px and is centered (not stretched edge-to-edge), with the bottom TabBar still visible at the bottom of that centered column — this is the check for the "must also work on laptop/desktop" requirement.

- [ ] **Step 5: Commit**

```bash
git add components/mobile-shell.tsx app/dosen app/mahasiswa
git commit -m "feat: add shared mobile shell with bottom nav for Dosen and Mahasiswa"
```

---

### Task 10: Role-based route protection

**Files:**
- Create: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `middleware.ts` base from Task 2, `profiles.role` column from Task 3.
- Produces: `matchRoleRoutePrefix(path: string): string | null` and `isRoleAllowedForPath(path: string, role: string | null): boolean` in `lib/auth/route-guard.ts`, used by the updated `middleware.ts`.

- [ ] **Step 1: Write the failing unit tests for the route-guard helpers**

`lib/auth/route-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchRoleRoutePrefix, isRoleAllowedForPath } from './route-guard'

describe('matchRoleRoutePrefix', () => {
  it('mengenali prefix /admin', () => {
    expect(matchRoleRoutePrefix('/admin/kelas')).toBe('/admin')
  })

  it('mengembalikan null untuk path publik', () => {
    expect(matchRoleRoutePrefix('/login')).toBeNull()
  })
})

describe('isRoleAllowedForPath', () => {
  it('mahasiswa tidak boleh akses /admin', () => {
    expect(isRoleAllowedForPath('/admin/kelas', 'mahasiswa')).toBe(false)
  })

  it('dosen boleh akses /dosen', () => {
    expect(isRoleAllowedForPath('/dosen/jurnal', 'dosen')).toBe(true)
  })

  it('path publik selalu diizinkan', () => {
    expect(isRoleAllowedForPath('/login', null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run lib/auth/route-guard.test.ts`
Expected: FAIL — `./route-guard` module doesn't exist yet.

- [ ] **Step 3: Implement the route-guard helpers**

`lib/auth/route-guard.ts`:

```ts
const ROLE_ROUTE_PREFIXES: Record<string, 'admin' | 'dosen' | 'mahasiswa'> = {
  '/admin': 'admin',
  '/dosen': 'dosen',
  '/mahasiswa': 'mahasiswa',
}

export function matchRoleRoutePrefix(path: string): string | null {
  return Object.keys(ROLE_ROUTE_PREFIXES).find((prefix) => path.startsWith(prefix)) ?? null
}

export function isRoleAllowedForPath(path: string, role: string | null): boolean {
  const prefix = matchRoleRoutePrefix(path)
  if (!prefix) return true
  return role === ROLE_ROUTE_PREFIXES[prefix]
}
```

- [ ] **Step 4: Run the tests again and confirm they pass**

Run: `npx vitest run lib/auth/route-guard.test.ts`
Expected: PASS for all 5 assertions.

- [ ] **Step 5: Wire the guard into middleware**

Replace `middleware.ts` with:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { matchRoleRoutePrefix, isRoleAllowedForPath } from '@/lib/auth/route-guard'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path === '/login'
  const matchedPrefix = matchRoleRoutePrefix(path)

  if (!user && matchedPrefix) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && matchedPrefix) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!isRoleAllowedForPath(path, profile?.role ?? null)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: Manual cross-role verification**

Run: `npm run dev`.

1. Log in as `mahasiswa@test.local`, then manually navigate the browser to `http://localhost:3000/admin`. Expect: redirected to `/login`, not the admin dashboard.
2. Log in as `dosen@test.local`, then manually navigate to `http://localhost:3000/mahasiswa`. Expect: redirected to `/login`.
3. Log in as `admin@test.local`, confirm `/admin` still loads normally (no regression).

- [ ] **Step 7: Commit**

```bash
git add lib/auth middleware.ts
git commit -m "feat: enforce role-based route protection in middleware"
```
