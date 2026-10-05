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
