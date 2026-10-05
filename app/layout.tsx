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
