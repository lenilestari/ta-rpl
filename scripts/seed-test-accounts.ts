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
