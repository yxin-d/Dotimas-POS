'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package,
  Users, Receipt, Wallet, LogOut
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
    const supabase = createClient({})
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <span className="font-bold text-gray-900 text-lg">POS System</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}