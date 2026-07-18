'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package,
  Users, Receipt, Wallet, LogOut, Store
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos',        label: 'POS',        icon: ShoppingCart },
  { href: '/products',   label: 'Products',   icon: Package },
  { href: '/customers',  label: 'Customers',  icon: Users },
  { href: '/sales',      label: 'Sales',      icon: Receipt },
  { href: '/expenses',   label: 'Expenses',   icon: Wallet },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Store size={16} className="text-white" strokeWidth={1.75} />
        </div>
        <span className="font-bold text-ink text-sm leading-tight">Tindahan<br/>POS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-primary-soft text-primary-dark'
                  : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
                }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
              )}
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-sm font-medium text-ink-faint hover:text-danger hover:bg-danger-soft transition-colors w-full"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
