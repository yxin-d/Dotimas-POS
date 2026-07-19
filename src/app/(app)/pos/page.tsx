'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import ProductGrid from '@/src/components/pos/product-grid'
import Cart from '@/src/components/pos/cart'
import CheckoutModal from '@/src/components/pos/checkout-modal'
import CreditModal from '@/src/components/pos/credit-modal'
import HoldModal from '@/src/components/pos/hold-modal'
import HeldOrderModal from '@/src/components/pos/held-order-modal'
import StartingCashModal from '@/src/components/pos/starting-cash-modal'
import CloseDayModal from '@/src/components/pos/close-day-modal'
import CustomItemModal from '@/src/components/pos/custom-item-modal'
import type { Product, ProductCategory, HeldInvoice } from '@/types/database'
import { Search, UtensilsCrossed, PowerOff, Clock, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { todayPH, formatDate } from '@/lib/utils/currency'
import { formatPeso } from '@/lib/utils/currency'

const supabase = createClient()

type ActiveModal = 'checkout' | 'credit' | 'hold' | 'customItem' | 'closeDay' | null

export default function POSPage() {
  const [products, setProducts]         = useState<Product[]>([])
  const [categories, setCategories]     = useState<ProductCategory[]>([])
  const [activeCategory, setCategory]   = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [activeModal, setModal]         = useState<ActiveModal>(null)
  const [heldOrders, setHeldOrders]     = useState<HeldInvoice[]>([])
  const [openedHeld, setOpenedHeld]     = useState<HeldInvoice | null>(null)
  const [startingCash, setStartingCash] = useState<number | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  const { addItem } = useCart()

  // ── Load products + categories ────────────────────────────
  useEffect(() => {
    async function load() {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('product_categories').select('*').order('sort_order'),
      ])
      if (prodRes.error) toast.error('Failed to load products')
      setProducts(prodRes.data ?? [])
      setCategories(catRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Load held orders ──────────────────────────────────────
  async function fetchHeld() {
    const { data } = await supabase
      .from('held_invoices')
      .select('*')
      .eq('status', 'held')
      .order('created_at', { ascending: false })
    setHeldOrders((data as HeldInvoice[]) ?? [])
  }

  useEffect(() => { fetchHeld() }, [])

  // ── Session check ─────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('pos_sessions')
      .select('starting_cash')
      .eq('session_date', todayPH())
      .single()
      .then(({ data }) => {
        if (data) setStartingCash(data.starting_cash)
        setSessionLoaded(true)
      })
  }, [])

  // ── Barcode scanner ───────────────────────────────────────
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

  // ── Filtered products ─────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
    const matchCat = !activeCategory || p.category_id === activeCategory
    return matchSearch && matchCat
  })

  if (!sessionLoaded) return null

  return (
    <div className="flex h-full overflow-hidden bg-canvas">

      {/* Starting cash gate */}
      {startingCash === null && (
        <StartingCashModal onConfirm={(cash) => setStartingCash(cash)} />
      )}

      {/* ── Left: products ── */}
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

          <button
            onClick={() => setModal('customItem')}
            title="Add custom / canteen item"
            className="p-2 rounded-xl border border-border text-ink-faint hover:text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors"
          >
            <UtensilsCrossed size={16} />
          </button>

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
          <div className="flex gap-1.5 px-4 py-2 border-b border-border bg-surface overflow-x-auto shrink-0 scrollbar-none">
            <CategoryTab label="All" active={activeCategory === null} onClick={() => setCategory(null)} />
            {categories.map(cat => (
              <CategoryTab
                key={cat.id}
                label={cat.name}
                active={activeCategory === cat.id}
                onClick={() => setCategory(prev => prev === cat.id ? null : cat.id)}
              />
            ))}
          </div>
        )}

        {/* Main content area: product grid + held orders below */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <ProductGrid
              products={filtered}
              loading={loading}
              onAdd={(product) => {
                if (product.stocks <= 0) { toast.error(`${product.name} is out of stock`); return }
                addItem(product)
              }}
            />
          </div>

          {/* ── Held orders section ── */}
          {heldOrders.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-ink-faint" />
                <span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                  Held orders ({heldOrders.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {heldOrders.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => setOpenedHeld(inv)}
                    className="bg-surface border border-border rounded-xl p-3 text-left
                      hover:border-primary/40 hover:shadow-sm active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{inv.label}</p>
                      <ChevronRight size={14} className="text-ink-faint group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-ink-faint mb-1.5">
                      {(inv.items_json as any[]).length} items · {formatDate(inv.created_at, true)}
                    </p>
                    <p className="text-sm font-bold tabular text-primary">{formatPeso(inv.total)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: cart ── */}
      <Cart
        onCheckout={() => setModal('checkout')}
        onCredit={() => setModal('credit')}
        onHold={() => setModal('hold')}
      />

      {/* ── Modals ── */}
      {activeModal === 'checkout' && (
        <CheckoutModal onClose={() => setModal(null)} onSuccess={() => setModal(null)} />
      )}
      {activeModal === 'credit' && (
        <CreditModal onClose={() => setModal(null)} onSuccess={() => setModal(null)} />
      )}
      {activeModal === 'hold' && (
        <HoldModal
          onClose={() => setModal(null)}
          onHeld={() => { setModal(null); fetchHeld() }}
        />
      )}
      {activeModal === 'customItem' && (
        <CustomItemModal onClose={() => setModal(null)} />
      )}
      {activeModal === 'closeDay' && (
        <CloseDayModal startingCash={startingCash ?? 0} onClose={() => setModal(null)} />
      )}

      {/* Held order detail modal */}
      {openedHeld && (
        <HeldOrderModal
          invoice={openedHeld}
          onClose={() => setOpenedHeld(null)}
          onSuccess={() => { setOpenedHeld(null); fetchHeld() }}
        />
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
          : 'bg-surface-sunken text-ink-soft hover:text-ink border border-border'
        }`}
    >
      {label}
    </button>
  )
}