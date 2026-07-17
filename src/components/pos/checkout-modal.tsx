'use client'

import { useState, useRef, useEffect } from 'react'
import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { completeSale } from '@/app/(app)/pos/actions'
import type { PaymentMethod } from '@/types/database'
import { toast } from 'sonner'
import Receipt from './receipt'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',  label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya',  label: 'Maya' },
  { value: 'mixed', label: 'Mixed' },
]

export default function CheckoutModal({ onClose, onSuccess }: Props) {
  const { items, customer, total, clearCart } = useCart()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [isCredit, setIsCredit]             = useState(false)
  const [loading, setLoading]               = useState(false)
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const orderTotal  = total()
  const received    = parseFloat(amountReceived) || 0
  const change      = Math.max(0, received - orderTotal)
  const canCheckout = isCredit
    ? !!customer   // credit requires a customer
    : received >= orderTotal

  async function handleConfirm() {
    if (!canCheckout) return
    setLoading(true)

    try {
      const { invoiceId } = await completeSale({
        items,
        customer,
        amountReceived: received,
        paymentMethod: isCredit ? 'credit' as PaymentMethod : paymentMethod,
        isCredit,
      })
      setCompletedInvoiceId(invoiceId)
      clearCart()
    } catch (err: any) {
      toast.error(err.message ?? 'Checkout failed')
      setLoading(false)
    }
  }

  // After sale is done — show receipt
  if (completedInvoiceId) {
    return (
      <Receipt
        invoiceId={completedInvoiceId}
        onClose={onSuccess}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Checkout</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product.name} × {item.qty}</span>
                <span className="text-gray-800 font-medium">{formatPeso(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatPeso(orderTotal)}</span>
            </div>
          </div>

          {/* Credit toggle — only show if customer is attached */}
          {customer ? (
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-800">Put on credit (utang)</p>
                <p className="text-xs text-gray-400">{customer.name}'s balance: {formatPeso(customer.credit_balance)}</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isCredit}
                  onChange={e => setIsCredit(e.target.checked)}
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${isCredit ? 'bg-orange-500' : 'bg-gray-200'}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isCredit ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Attach a customer to enable credit (utang).
            </p>
          )}

          {/* Payment method — hidden when credit */}
          {!isCredit && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Payment method</p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors
                      ${paymentMethod === m.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount received — hidden when credit */}
          {!isCredit && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Amount received</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                <input
                  ref={inputRef}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  className="w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[20, 50, 100, 200, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmountReceived(String(amt))}
                    className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Change */}
          {!isCredit && received > 0 && (
            <div className={`flex justify-between text-sm font-medium rounded-lg px-3 py-2
              ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
            >
              <span>{change >= 0 ? 'Change' : 'Short by'}</span>
              <span>{formatPeso(Math.abs(change))}</span>
            </div>
          )}

          {isCredit && (
            <div className="bg-orange-50 text-orange-700 text-sm rounded-lg px-3 py-2">
              Full {formatPeso(orderTotal)} will be added to {customer?.name}'s credit.
            </div>
          )}
        </div>

        {/* Confirm button */}
        <div className="px-5 pb-5">
          <button
            onClick={handleConfirm}
            disabled={!canCheckout || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95
              bg-blue-600 text-white hover:bg-blue-700
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Processing…'
              : isCredit
              ? `Record credit — ${formatPeso(orderTotal)}`
              : `Confirm — ${formatPeso(orderTotal)}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}