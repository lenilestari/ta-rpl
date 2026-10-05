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
