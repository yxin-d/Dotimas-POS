'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package,
  Users, Receipt, Wallet, LogOut, Smartphone
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pos',       label: 'POS',         icon: ShoppingCart },
  { href: '/products',  label: 'Products',    icon: Package },
  { href: '/customers', label: 'Customers',   icon: Users },
  { href: '/sales',     label: 'Sales',       icon: Receipt },
  { href: '/gcash',     label: 'GCash',       icon: Smartphone },
  { href: '/expenses',  label: 'Expenses',    icon: Wallet },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-border">
        <span className="font-bold text-ink text-base">Tindahan</span>
        <p className="text-xs text-ink-faint mt-0.5">POS System</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/pos' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-primary-soft text-primary font-semibold'
                  : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 pb-4 border-t border-border pt-3">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
            text-ink-faint hover:text-danger hover:bg-danger-soft transition-colors w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}