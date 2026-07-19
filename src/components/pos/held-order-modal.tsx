'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import { formatPeso } from '@/lib/utils/currency'
import { completeSale } from '@/src/app/(app)/pos/action'
import type { HeldInvoice, Product, CartItem, Customer, PaymentMethod } from '@/types/database'
import { toast } from 'sonner'
import { X, Plus, Minus, Search, CreditCard, UserPlus } from 'lucide-react'
import Receipt from './receipt'

interface Props {
  invoice:   HeldInvoice
  onClose:   () => void
  onSuccess: () => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',  label: 'Cash'  },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya',  label: 'Maya'  },
  { value: 'mixed', label: 'Mixed' },
]

type Flow = 'checkout' | 'credit'

export default function HeldOrderModal({ invoice, onClose, onSuccess }: Props) {
  // Local cart — completely isolated from the global POS cart
  const [items, setItems]   = useState<CartItem[]>(() => invoice.items_json as CartItem[])
  const [products, setProducts]   = useState<Product[]>([])
  const [search, setSearch]       = useState('')
  const [flow, setFlow]           = useState<Flow>('checkout')

  // Checkout state
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>('cash')
  const [amountReceived, setAmountReceived] = useState('')

  // Credit state — all managed locally, no global cart mutation
  const [creditQuery, setCreditQuery]   = useState('')
  const [creditResults, setCreditResults] = useState<Customer[]>([])
  const [creditSearching, setCreditSearching] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [loading, setLoading]   = useState(false)
  const [completedId, setCompletedId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  // Debounced credit customer search
  useEffect(() => {
    if (!creditQuery.trim()) { setCreditResults([]); return }
    const t = setTimeout(async () => {
      setCreditSearching(true)
      const { data } = await supabase
        .from('customers').select('*').ilike('name', `%${creditQuery}%`).order('name').limit(6)
      setCreditResults(data ?? [])
      setCreditSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [creditQuery])

  // Barcode scanner adds to local cart only
  const handleBarcode = useCallback((barcode: string) => {
    const p = products.find(p => p.barcode === barcode)
    if (p) addProduct(p)
    else toast.error(`No product: ${barcode}`)
  }, [products])
  useBarcodeScanner(handleBarcode)

  function addProduct(product: Product) {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        const qty = existing.qty + 1
        return prev.map(i => i.product.id === product.id
          ? { ...i, qty, subtotal: product.price * qty, net_profit: (product.price - (product.cost ?? 0)) * qty }
          : i
        )
      }
      return [...prev, {
        product, qty: 1,
        subtotal: product.price,
        net_profit: product.price - (product.cost ?? 0),
      }]
    })
    setSearch('')
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { setItems(prev => prev.filter(i => i.product.id !== productId)); return }
    setItems(prev => prev.map(i => {
      if (i.product.id !== productId) return i
      const price = i.customPrice ?? i.product.price
      return { ...i, qty, subtotal: price * qty, net_profit: (price - (i.product.cost ?? 0)) * qty }
    }))
  }

  const orderTotal = items.reduce((s, i) => s + i.subtotal, 0)
  const received   = parseFloat(amountReceived) || 0
  const change     = Math.max(0, received - orderTotal)

  async function voidHeld() {
    await supabase.from('held_invoices').update({ status: 'completed' }).eq('id', invoice.id)
  }

  async function handleCheckout() {
    if (received < orderTotal) return
    setLoading(true)
    try {
      const { invoiceId } = await completeSale({
        items, customer: null,
        amountReceived: received,
        paymentMethod,
        isCredit: false,
      })
      await voidHeld()
      setCompletedId(invoiceId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  async function handleCredit() {
    if (!selectedCustomer) { toast.error('Select a customer'); return }
    setLoading(true)
    try {
      const { invoiceId } = await completeSale({
        items,
        customer: selectedCustomer,
        amountReceived: 0,
        paymentMethod: 'credit',
        isCredit: true,
      })
      await voidHeld()
      setCompletedId(invoiceId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record credit')
      setLoading(false)
    }
  }

  if (completedId) {
    return <Receipt invoiceId={completedId} onClose={onSuccess} />
  }

  // Filtered product search
  const filteredProducts = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search)
      ).slice(0, 6)
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-ink">{invoice.label}</h2>
            <p className="text-xs text-ink-faint mt-0.5">Add items or go straight to checkout</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Add more products */}
          <div>
            <p className="text-xs font-semibold text-ink-soft mb-2">Add more items</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Search or scan…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {filteredProducts.length > 0 && (
              <div className="mt-1.5 border border-border rounded-xl overflow-hidden divide-y divide-border">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)} disabled={p.stocks <= 0}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-sunken text-left transition-colors disabled:opacity-40">
                    <span className="text-sm text-ink">{p.name}</span>
                    <span className="text-sm tabular text-primary font-semibold ml-2 shrink-0">{formatPeso(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current items */}
          <div>
            <p className="text-xs font-semibold text-ink-soft mb-2">Items in order</p>
            <div className="space-y-0.5">
              {items.map(item => (
                <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-ink truncate">{item.product.name}</p>
                    <p className="text-xs text-ink-faint tabular">{formatPeso(item.customPrice ?? item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold tabular text-ink mr-2">{formatPeso(item.subtotal)}</span>
                    <button onClick={() => updateQty(item.product.id, item.qty - 1)}
                      className="w-6 h-6 rounded-md bg-surface-sunken hover:bg-border flex items-center justify-center">
                      <Minus size={10} />
                    </button>
                    <span className="w-5 text-center text-sm tabular">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, item.qty + 1)}
                      className="w-6 h-6 rounded-md bg-surface-sunken hover:bg-border flex items-center justify-center">
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-ink mt-3 pt-2 border-t border-border">
              <span>Total</span>
              <span className="tabular">{formatPeso(orderTotal)}</span>
            </div>
          </div>

          {/* Flow toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFlow('checkout')}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors
                ${flow === 'checkout' ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-ink-soft hover:border-primary/40'}`}>
              Cash / GCash
            </button>
            <button onClick={() => setFlow('credit')}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5
                ${flow === 'credit' ? 'bg-gold text-white border-gold' : 'bg-surface border-border text-ink-soft hover:border-gold/40'}`}>
              <CreditCard size={12} />
              Credit (utang)
            </button>
          </div>

          {/* ── Checkout flow ── */}
          {flow === 'checkout' && (
            <>
              <div>
                <p className="text-xs font-semibold text-ink-soft mb-2">Payment method</p>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors
                        ${paymentMethod === m.value ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-soft border-border hover:border-primary/50'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-soft mb-2">Amount received</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">₱</span>
                  <input type="number" min={0} step="0.01" placeholder="0.00"
                    value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCheckout()}
                    className="w-full pl-8 pr-4 py-2.5 border border-border rounded-xl text-sm tabular
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[20, 50, 100, 200, 500, 1000].map(amt => (
                    <button key={amt} onClick={() => setAmountReceived(String(amt))}
                      className="px-2 py-1 text-xs rounded-lg bg-surface-sunken text-ink-soft hover:bg-primary-soft hover:text-primary tabular transition-colors">
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>
              {received > 0 && (
                <div className={`flex justify-between text-sm font-semibold rounded-lg px-3 py-2
                  ${change >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                  <span>{change >= 0 ? 'Change' : 'Short by'}</span>
                  <span className="tabular">{formatPeso(Math.abs(change))}</span>
                </div>
              )}
            </>
          )}

          {/* ── Credit flow — fully self-contained, no global cart ── */}
          {flow === 'credit' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-ink-soft">Who is this credited to?</p>

              {!selectedCustomer ? (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                    <input type="text" placeholder="Search customer…"
                      value={creditQuery} onChange={e => setCreditQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm
                        focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    />
                  </div>
                  {(creditResults.length > 0 || creditSearching) && (
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                      {creditSearching && <p className="px-3 py-2.5 text-xs text-ink-faint">Searching…</p>}
                      {creditResults.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCreditQuery('') }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-sunken text-left transition-colors">
                          <div>
                            <p className="text-sm font-medium text-ink">{c.name}</p>
                            {c.phone && <p className="text-xs text-ink-faint">{c.phone}</p>}
                          </div>
                          {c.credit_balance > 0 && (
                            <span className="text-xs tabular font-semibold text-gold shrink-0 ml-2">
                              {formatPeso(c.credit_balance)} utang
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {creditQuery && !creditSearching && creditResults.length === 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-ink-faint mb-1">No customer found</p>
                      <a href="/customers/new" target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <UserPlus size={11} /> Add new customer
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between bg-gold-soft border border-gold/20 rounded-xl px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{selectedCustomer.name}</p>
                    {selectedCustomer.credit_balance > 0 && (
                      <p className="text-xs text-gold tabular mt-0.5">
                        Current balance: {formatPeso(selectedCustomer.credit_balance)}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-ink-faint hover:text-ink ml-2">
                    <X size={15} />
                  </button>
                </div>
              )}

              {selectedCustomer && (
                <p className="text-xs text-ink-faint bg-surface-sunken rounded-lg px-3 py-2">
                  {formatPeso(orderTotal)} will be added to {selectedCustomer.name}'s balance.
                  New total: <span className="tabular font-semibold text-gold">{formatPeso(selectedCustomer.credit_balance + orderTotal)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
          {flow === 'checkout' ? (
            <button onClick={handleCheckout} disabled={received < orderTotal || loading || items.length === 0}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm
                hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-40">
              {loading ? 'Processing…' : `Confirm — ${formatPeso(orderTotal)}`}
            </button>
          ) : (
            <button onClick={handleCredit} disabled={!selectedCustomer || loading || items.length === 0}
              className="w-full py-3 rounded-xl bg-gold text-white font-bold text-sm
                hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40">
              {loading ? 'Recording…' : `Record credit — ${formatPeso(orderTotal)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}