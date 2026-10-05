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
