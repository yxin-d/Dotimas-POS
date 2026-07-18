'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import ProductGrid from '@/src/components/pos/product-grid'
import Cart from '@/src/components/pos/cart'
import CheckoutModal from '@/src/components/pos/checkout-modal'
import CustomerPicker from '@/src/components/pos/customer-picker'
import StartingCashModal from '@/src/components/pos/starting-cash-modal'
import CloseDayModal from '@/src/components/pos/close-day-modal'
import CustomItemModal from '@/src/components/pos/custom-item'
import HoldInvoicePanel from '@/src/components/pos/hold-invoice-panel'
import type { Product, Customer, ProductCategory } from '@/types/database'
import { Search, UtensilsCrossed, PauseCircle, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { todayPH } from '@/lib/utils/currency'

const supabase = createClient()

type Modal = 'checkout' | 'customer' | 'customItem' | 'hold' | 'closeDay' | null

export default function POSPage() {
  const [products, setProducts]       = useState<Product[]>([])
  const [categories, setCategories]   = useState<ProductCategory[]>([])
  const [activeCategory, setCategory] = useState<string | null>(null)  // null = All
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState<Modal>(null)

  // Session cash state
  const [startingCash, setStartingCash]   = useState<number | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  const { addItem, customer, setCustomer } = useCart()

  // ── Load products + categories ──────────────────────────
  useEffect(() => {
    async function load() {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('product_categories').select('*').order('sort_order'),
      ])
      if (prodRes.error) toast.error('Failed to load products')
      else setProducts(prodRes.data ?? [])
      setCategories(catRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Check today's session ────────────────────────────────
  useEffect(() => {
    async function checkSession() {
      const today = todayPH()
      const { data } = await supabase
        .from('pos_sessions')
        .select('starting_cash, closed_at')
        .eq('session_date', today)
        .single()

      if (data) {
        setStartingCash(data.starting_cash)
      }
      // No session = first open today → show starting cash modal
      setSessionLoaded(true)
    }
    checkSession()
  }, [])

  // ── Barcode scanner ──────────────────────────────────────
  const handleBarcode = useCallback((barcode: string) => {
    const match = products.find(p => p.barcode === barcode)
    if (match) {
      if (match.stocks <= 0) { toast.error(`${match.name} is out of stock`); return }
      addItem(match)
      toast.success(`Added ${match.name}`)
    } else {
      toast.error(`No product: ${barcode}`)
    }
  }, [products, addItem])

  useBarcodeScanner(handleBarcode)

  // ── Filtered products ────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
    const matchCategory = !activeCategory || p.category_id === activeCategory
    return matchSearch && matchCategory
  })

  // Don't render POS until session check is done
  if (!sessionLoaded) return null

  return (
    <div className="flex h-full overflow-hidden bg-canvas">

      {/* Starting cash modal — shown if no session today */}
      {startingCash === null && (
        <StartingCashModal onConfirm={(cash) => setStartingCash(cash)} />
      )}

      {/* Left — product area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border shrink-0">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search or scan barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-sunken border border-transparent rounded-xl pl-10 pr-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-surface"
            />
          </div>

          {/* Customer picker */}
          <button
            onClick={() => setModal('customer')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap
              ${customer
                ? 'bg-primary-soft border-primary/20 text-primary-dark'
                : 'bg-surface border-border text-ink-faint hover:bg-surface-sunken'
              }`}
          >
            <span className="w-4 h-4 rounded-full bg-current opacity-20 shrink-0" />
            {customer ? customer.name : 'Guest'}
          </button>
          {customer && (
            <button onClick={() => setCustomer(null)} className="text-ink-faint hover:text-ink text-lg">×</button>
          )}

          {/* Custom item (canteen) */}
          <button
            onClick={() => setModal('customItem')}
            title="Add custom / canteen item"
            className="p-2 rounded-xl border border-border text-ink-faint hover:text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors"
          >
            <UtensilsCrossed size={16} />
          </button>

          {/* Hold */}
          <button
            onClick={() => setModal('hold')}
            title="Hold / resume orders"
            className="p-2 rounded-xl border border-border text-ink-faint hover:text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors"
          >
            <PauseCircle size={16} />
          </button>

          {/* Close day */}
          <button
            onClick={() => setModal('closeDay')}
            title="Close day"
            className="p-2 rounded-xl border border-border text-ink-faint hover:text-danger hover:border-danger/40 hover:bg-danger-soft transition-colors"
          >
            <PowerOff size={16} />
          </button>
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 px-4 py-2 border-b border-border bg-surface overflow-x-auto shrink-0">
            <CategoryTab
              label="All"
              active={activeCategory === null}
              onClick={() => setCategory(null)}
            />
            {categories.map(cat => (
              <CategoryTab
                key={cat.id}
                label={cat.name}
                active={activeCategory === cat.id}
                onClick={() => setCategory(activeCategory === cat.id ? null : cat.id)}
              />
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid
            products={filtered}
            loading={loading}
            onAdd={(product) => {
              if (product.stocks <= 0) { toast.error(`${product.name} is out of stock`); return }
              addItem(product)
            }}
          />
        </div>
      </div>

      {/* Right — cart */}
      <Cart onCheckout={() => setModal('checkout')} />

      {/* Modals */}
      {modal === 'checkout' && (
        <CheckoutModal onClose={() => setModal(null)} onSuccess={() => setModal(null)} />
      )}
      {modal === 'customer' && (
        <CustomerPicker
          onSelect={(c: Customer) => { setCustomer(c); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'customItem' && (
        <CustomItemModal onClose={() => setModal(null)} />
      )}
      {modal === 'hold' && (
        <HoldInvoicePanel onClose={() => setModal(null)} />
      )}
      {modal === 'closeDay' && (
        <CloseDayModal startingCash={startingCash ?? 0} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
        ${active
          ? 'bg-primary text-white'
          : 'bg-surface-sunken text-ink-soft hover:text-ink hover:bg-surface border border-border'
        }`}
    >
      {label}
    </button>
  )
}