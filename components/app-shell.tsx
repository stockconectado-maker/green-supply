'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const esLogin = pathname === '/login'

  if (esLogin) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7]">

      <Sidebar />

      <div className="min-h-screen lg:pl-[240px]">
        {children}
      </div>

    </div>
  )
}