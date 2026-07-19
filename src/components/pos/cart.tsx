'use client'

import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { ShoppingCart, Trash2, CreditCard, PauseCircle } from 'lucide-react'
import CartItem from './cart-item'

interface Props {
  onCheckout: () => void
  onCredit:   () => void
  onHold:     () => void
}

export default function Cart({ onCheckout, onCredit, onHold }: Props) {
  const { items, clearCart, total, itemCount } = useCart()
  const hasItems = items.length > 0

  return (
    <div className="w-80 shrink-0 flex flex-col bg-surface border-l border-border h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-ink-faint" />
          <span className="font-semibold text-ink text-sm">Cart</span>
          {hasItems && (
            <span className="text-xs bg-primary text-white rounded-full px-1.5 py-0.5 font-medium tabular">
              {itemCount()}
            </span>
          )}
        </div>
        {hasItems && (
          <button
            onClick={clearCart}
            className="text-ink-faint hover:text-danger transition-colors"
            title="Clear cart"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center h-48 text-ink-faint/40 gap-2">
            <ShoppingCart size={36} strokeWidth={1.2} />
            <p className="text-xs">Cart is empty</p>
          </div>
        ) : (
          items.map(item => <CartItem key={item.product.id} item={item} />)
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-faint">Total</span>
          <span className="text-2xl font-bold text-ink tabular">{formatPeso(total())}</span>
        </div>

        {/* Primary — Checkout */}
        <button
          onClick={onCheckout}
          disabled={!hasItems}
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold
            hover:bg-primary-dark active:scale-[0.98] transition-all
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Checkout
        </button>

        {/* Secondary row — Credit + Hold */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCredit}
            disabled={!hasItems}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gold/40
              bg-gold-soft text-gold text-xs font-semibold
              hover:bg-gold/10 active:scale-[0.98] transition-all
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <CreditCard size={13} />
            Credit
          </button>
          <button
            onClick={onHold}
            disabled={!hasItems}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border
              bg-surface-sunken text-ink-soft text-xs font-semibold
              hover:bg-border hover:text-ink active:scale-[0.98] transition-all
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <PauseCircle size={13} />
            Hold
          </button>
        </div>
      </div>
    </div>
  )
}