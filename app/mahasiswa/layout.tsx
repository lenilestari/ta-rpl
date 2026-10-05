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
