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
