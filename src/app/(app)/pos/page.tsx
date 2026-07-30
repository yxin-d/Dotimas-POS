'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import Cart from '@/src/components/pos/cart'
import CheckoutModal from '@/src/components/pos/checkout-modal'
import CreditModal from '@/src/components/pos/credit-modal'
import HoldModal from '@/src/components/pos/hold-modal'
import HeldOrderModal from '@/src/components/pos/held-order-modal'
import StartingCashModal from '@/src/components/pos/starting-cash-modal'
import CloseDayModal from '@/src/components/pos/close-day-modal'
import CustomItemModal from '@/src/components/pos/custom-item'
import PriceCheckerModal from '@/src/components/pos/price-checker-modal' // ⬅️ NEW
import type { Product, ProductCategory, HeldInvoice } from '@/types/database'
import {
  Search,
  UtensilsCrossed,
  PowerOff,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Scan,
} from 'lucide-react'
import { toast } from 'sonner'
import { todayPH, formatDate } from '@/lib/utils/currency'
import { formatPeso } from '@/lib/utils/currency'
import Badge from '@/src/components/ui/badge'

type ActiveModal =
  | 'checkout'
  | 'credit'
  | 'hold'
  | 'customItem'
  | 'closeDay'
  | 'priceChecker'
  | null

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [activeCategory, setCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeModal, setModal] = useState<ActiveModal>(null)
  const [heldOrders, setHeldOrders] = useState<HeldInvoice[]>([])
  const [openedHeld, setOpenedHeld] = useState<HeldInvoice | null>(null)
  const [startingCash, setStartingCash] = useState<number | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const supabaseRef = useRef<any>(null)

  // ─── Pagination ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 16 // 4x4 grid

  const { addItem, items: cartItems, total: cartTotal, itemCount: cartItemCount } = useCart()

  // ── INIT SUPABASE CLIENT ────────────────────────────────
  useEffect(() => {
    supabaseRef.current = createClient()
    setClientReady(true)
  }, [])

  // ── Load products + categories ────────────────────────────
  useEffect(() => {
    if (!clientReady) return
    async function load() {
      const [prodRes, catRes] = await Promise.all([
        supabaseRef.current.from('products').select('*').eq('is_active', true).order('name'),
        supabaseRef.current.from('product_categories').select('*').order('sort_order'),
      ])
      if (prodRes.error) toast.error('Failed to load products')
      setProducts(prodRes.data ?? [])
      setCategories(catRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [clientReady])

  // ── Load held orders ──────────────────────────────────────
  async function fetchHeld() {
    if (!clientReady) return
    const { data } = await supabaseRef.current
      .from('held_invoices')
      .select('*')
      .eq('status', 'held')
      .order('created_at', { ascending: false })
    setHeldOrders((data as HeldInvoice[]) ?? [])
  }

  useEffect(() => {
    if (clientReady) fetchHeld()
  }, [clientReady])

  // ── Session check ─────────────────────────────────────────
  useEffect(() => {
    if (!clientReady) return

    const fetchSession = async () => {
      try {
        const { data, error } = await supabaseRef.current
          .from('pos_sessions')
          .select('starting_cash')
          .eq('session_date', todayPH())
          .single()

        if (error) {
          console.warn('Session fetch warning:', error.message)
          if (error.code !== 'PGRST116') {
            toast.error('Could not load session data')
          }
        }

        if (data) {
          setStartingCash(data.starting_cash)
        }
      } catch (err) {
        console.error('Session fetch failed:', err)
        toast.error('Network error loading session')
      } finally {
        setSessionLoaded(true)
      }
    }

    fetchSession()
  }, [clientReady])

  // ── Barcode scanner ───────────────────────────────────────
  const handleBarcode = useCallback(
    (barcode: string) => {
      const match = products.find((p) => p.barcode === barcode)
      if (match) {
        if (match.stocks <= 0) {
          toast.error(`${match.name} is out of stock`)
          return
        }
        addItem(match)
        toast.success(`Added ${match.name}`)
      } else {
        toast.error(`No product: ${barcode}`)
      }
    },
    [products, addItem]
  )
  useBarcodeScanner(handleBarcode)

  // ─── Filtered products ─────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
    const matchCat = !activeCategory || p.category_id === activeCategory
    return matchSearch && matchCat
  })

  // ─── Pagination logic ────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage)

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, activeCategory])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

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
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="text"
              placeholder="Search or scan barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-sunken border border-transparent rounded-xl pl-10 pr-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-surface"
            />
          </div>

          {/* ── Price Checker Button ── */}
          <button
            onClick={() => setModal('priceChecker')}
            title="Price Checker"
            className="p-2 rounded-xl border border-border text-ink-faint hover:text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors"
          >
            <Scan size={16} />
          </button>

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
            <CategoryTab
              label="All"
              active={activeCategory === null}
              onClick={() => setCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryTab
                key={cat.id}
                label={cat.name}
                active={activeCategory === cat.id}
                onClick={() => setCategory((prev) => (prev === cat.id ? null : cat.id))}
              />
            ))}
          </div>
        )}

        {/* ─── Product Grid with Pagination ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface rounded-xl border border-border p-3 animate-pulse h-32"
                  />
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                <p className="text-sm text-ink-faint">No products found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {paginatedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        if (p.stocks <= 0) {
                          toast.error(`${p.name} is out of stock`)
                          return
                        }
                        addItem(p)
                        toast.success(`Added ${p.name}`)
                      }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono text-ink-faint truncate">
                            {p.barcode || '—'}
                          </span>
                          <Badge
                            tone={p.is_active ? 'primary' : 'neutral'}
                            className="text-[9px] shrink-0"
                          >
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <h3 className="text-sm font-semibold text-ink line-clamp-2 flex-1">
                          {p.name}
                        </h3>
                        <div className="flex items-end justify-between mt-2 pt-2 border-t border-border">
                          <div>
                            <p className="text-[10px] text-ink-faint">Price</p>
                            <p className="text-base font-bold text-primary tabular">
                              {formatPeso(p.price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-ink-faint">Stock</p>
                            <p
                              className={`text-sm font-semibold tabular ${
                                p.stocks <= p.low_stock_threshold
                                  ? 'text-danger'
                                  : 'text-ink'
                              }`}
                            >
                              {p.stocks}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── Pagination ─── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-border hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-ink-faint">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-border hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
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
                {heldOrders.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => setOpenedHeld(inv)}
                    className="bg-surface border border-border rounded-xl p-3 text-left
                      hover:border-primary/40 hover:shadow-sm active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{inv.label}</p>
                      <ChevronRight
                        size={14}
                        className="text-ink-faint group-hover:text-primary transition-colors shrink-0 mt-0.5"
                      />
                    </div>
                    <p className="text-xs text-ink-faint mb-1.5">
                      {(inv.items_json as any[]).length} items ·{' '}
                      {formatDate(inv.created_at, true)}
                    </p>
                    <p className="text-sm font-bold tabular text-primary">
                      {formatPeso(inv.total)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile-only: floating button to open the cart sheet ── */}
      {cartItems.length > 0 && !mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-4 inset-x-4 z-30 flex items-center justify-between
            bg-primary text-white rounded-xl px-4 py-3 shadow-lg active:scale-[0.98] transition-transform"
        >
          <span className="text-sm font-semibold">
            View cart · {cartItemCount()} item{cartItemCount() === 1 ? '' : 's'}
          </span>
          <span className="text-sm font-bold tabular">{formatPeso(cartTotal())}</span>
        </button>
      )}

      {/* ── Right: cart ── */}
      <Cart
        onCheckout={() => setModal('checkout')}
        onCredit={() => setModal('credit')}
        onHold={() => setModal('hold')}
        isMobileOpen={mobileCartOpen}
        onMobileClose={() => setMobileCartOpen(false)}
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
          onHeld={() => {
            setModal(null)
            fetchHeld()
          }}
        />
      )}
      {activeModal === 'customItem' && (
        <CustomItemModal onClose={() => setModal(null)} />
      )}
      {activeModal === 'closeDay' && (
        <CloseDayModal startingCash={startingCash ?? 0} onClose={() => setModal(null)} />
      )}
      {activeModal === 'priceChecker' && (
        <PriceCheckerModal onClose={() => setModal(null)} />
      )}

      {/* Held order detail modal */}
      {openedHeld && (
        <HeldOrderModal
          invoice={openedHeld}
          onClose={() => setOpenedHeld(null)}
          onSuccess={() => {
            setOpenedHeld(null)
            fetchHeld()
          }}
        />
      )}
    </div>
  )
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
        ${
          active
            ? 'bg-primary text-white'
            : 'bg-surface-sunken text-ink-soft hover:text-ink border border-border'
        }`}
    >
      {label}
    </button>
  )
}