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
