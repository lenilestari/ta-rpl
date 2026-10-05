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
