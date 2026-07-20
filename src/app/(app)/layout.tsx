'use client'

import { useState, useEffect } from 'react'
import Header from '@/src/components/layout/header'
import Sidebar from '@/src/components/layout/sidebar'
import { cn } from '@/lib/utils/utils'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) {
      setIsCollapsed(stored === 'true')
    }
  }, [])

  const handleToggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const handleMenuClick = () => {
    setIsMobileOpen(true)
  }

  const handleMobileClose = () => {
    setIsMobileOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onMobileClose={handleMobileClose}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={handleMenuClick}
          isSidebarCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className={cn(
          "flex-1 overflow-y-auto p-4 transition-all duration-300",
          // Adjust padding for sidebar width (optional)
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}