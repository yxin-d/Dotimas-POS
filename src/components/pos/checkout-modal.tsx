'use client'

import { useState, useRef, useEffect } from 'react'
import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { completeSale } from '@/src/app/(app)/pos/action'
import type { PaymentMethod } from '@/types/database'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import Receipt from './receipt'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',  label: 'Cash'  },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya',  label: 'Maya'  },
  { value: 'mixed', label: 'Mixed' },
]

export default function CheckoutModal({ onClose, onSuccess }: Props) {
  const { items, customer, total, clearCart } = useCart()

  const [paymentMethod, setPaymentMethod]           = useState<PaymentMethod>('cash')
  const [amountReceived, setAmountReceived]         = useState('')
  const [loading, setLoading]                       = useState(false)
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const orderTotal  = total()
  const received    = parseFloat(amountReceived) || 0
  const change      = Math.max(0, received - orderTotal)
  const canCheckout = received >= orderTotal

  async function handleConfirm() {
    if (!canCheckout) return
    setLoading(true)
    try {
      const { invoiceId } = await completeSale({
        items,
        customer,
        amountReceived: received,
        paymentMethod,
        isCredit: false,
      })
      setCompletedInvoiceId(invoiceId)
      clearCart()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  if (completedInvoiceId) {
    return <Receipt invoiceId={completedInvoiceId} onClose={onSuccess} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-ink">Checkout</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Order summary */}
          <div className="bg-surface-sunken rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-ink-soft truncate pr-2">{item.product.name} × {item.qty}</span>
                <span className="text-ink font-medium tabular shrink-0">{formatPeso(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-bold text-ink">
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
                ref={inputRef}
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
                <button
                  key={amt}
                  onClick={() => setAmountReceived(String(amt))}
                  className="px-2 py-1 text-xs rounded-lg bg-surface-sunken text-ink-soft
                    hover:bg-primary-soft hover:text-primary tabular transition-colors"
                >
                  ₱{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Change */}
          {received > 0 && (
            <div className={`flex justify-between text-sm font-semibold rounded-lg px-3 py-2
              ${change >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}
            >
              <span>{change >= 0 ? 'Change' : 'Short by'}</span>
              <span className="tabular">{formatPeso(Math.abs(change))}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleConfirm}
            disabled={!canCheckout || loading}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm
              hover:bg-primary-dark active:scale-[0.98] transition-all
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : `Confirm — ${formatPeso(orderTotal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}