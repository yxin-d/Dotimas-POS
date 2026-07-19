'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import { formatPeso } from '@/lib/utils/currency'
import { completeSale } from '@/src/app/(app)/pos/action'
import type { HeldInvoice, Product, CartItem, PaymentMethod } from '@/types/database'
import { toast } from 'sonner'
import { X, Plus, Minus, Search, CreditCard } from 'lucide-react'
import Receipt from './receipt'
import CreditModal from './credit-modal'

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

export default function HeldOrderModal({ invoice, onClose, onSuccess }: Props) {
  const { loadFromHeld } = useCart()

  // Local cart state (separate from main cart — held orders live in their own state)
  const [items, setItems]   = useState<CartItem[]>(() => invoice.items_json as CartItem[])
  const [products, setProducts]         = useState<Product[]>([])
  const [search, setSearch]             = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [loading, setLoading]           = useState(false)
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null)
  const [showCreditFlow, setShowCreditFlow] = useState(false)

  const supabase = createClient()

  // Load products for add-more search
  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  // Barcode scanner adds to this local cart
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
        return prev.map(i => i.product.id === product.id
          ? { ...i, qty: i.qty + 1, subtotal: product.price * (i.qty + 1), net_profit: (product.price - (product.cost ?? 0)) * (i.qty + 1) }
          : i
        )
      }
      return [...prev, { product, qty: 1, subtotal: product.price, net_profit: product.price - (product.cost ?? 0) }]
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

  const orderTotal  = items.reduce((s, i) => s + i.subtotal, 0)
  const received    = parseFloat(amountReceived) || 0
  const change      = Math.max(0, received - orderTotal)
  const canCheckout = received >= orderTotal

  // Void the held invoice record after completing
  async function voidHeldRecord() {
    await supabase.from('held_invoices').update({ status: 'completed' }).eq('id', invoice.id)
  }

  async function handleConfirm() {
    if (!canCheckout) return
    setLoading(true)
    try {
      const { invoiceId } = await completeSale({
        items,
        customer: null,
        amountReceived: received,
        paymentMethod,
        isCredit: false,
      })
      await voidHeldRecord()
      setCompletedInvoiceId(invoiceId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  // Filtered search results
  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search)
      ).slice(0, 6)
    : []

  if (completedInvoiceId) {
    return <Receipt invoiceId={completedInvoiceId} onClose={onSuccess} />
  }

  if (showCreditFlow) {
    // Temporarily load items into main cart for CreditModal, then restore
    loadFromHeld(items, null)
    return (
      <CreditModal
        onClose={() => setShowCreditFlow(false)}
        onSuccess={async () => { await voidHeldRecord(); onSuccess() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-ink">{invoice.label}</h2>
            <p className="text-xs text-ink-faint mt-0.5">Resume order · add more items or go straight to checkout</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Add more — product search */}
          <div>
            <p className="text-xs font-semibold text-ink-soft mb-2">Add more items</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Search product or scan barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {filtered.length > 0 && (
              <div className="mt-1.5 border border-border rounded-xl overflow-hidden divide-y divide-border">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    disabled={p.stocks <= 0}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-sunken text-left transition-colors disabled:opacity-40"
                  >
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
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
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

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-ink-soft mb-2">Payment method</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors
                    ${paymentMethod === m.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-ink-soft border-border hover:border-primary/50'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount received */}
          <div>
            <p className="text-xs font-semibold text-ink-soft mb-2">Amount received</p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">₱</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={e => setAmountReceived(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
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
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-3 border-t border-border space-y-2 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={!canCheckout || loading || items.length === 0}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm
              hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {loading ? 'Processing…' : `Confirm — ${formatPeso(orderTotal)}`}
          </button>
          <button
            onClick={() => setShowCreditFlow(true)}
            disabled={items.length === 0}
            className="w-full py-2 rounded-xl border border-gold/40 bg-gold-soft text-gold text-xs font-semibold
              flex items-center justify-center gap-1.5
              hover:bg-gold/10 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <CreditCard size={13} />
            Record as credit instead
          </button>
        </div>
      </div>
    </div>
  )
}