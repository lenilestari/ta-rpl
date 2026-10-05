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
