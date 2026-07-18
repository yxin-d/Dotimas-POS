'use client'

import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { ShoppingCart, Trash2 } from 'lucide-react'
import CartItem from './cart-item'
import Button from '@/src/components/ui/button'

interface Props {
  onCheckout: () => void
}

export default function Cart({ onCheckout }: Props) {
  const { items, clearCart, total, itemCount, customer } = useCart()

  return (
    <div className="w-80 shrink-0 flex flex-col bg-surface border-l border-border h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-ink-faint" />
          <span className="font-semibold text-ink text-sm">Cart</span>
          {itemCount() > 0 && (
            <span className="text-xs bg-primary text-white rounded-full px-1.5 py-0.5 font-medium tabular">
              {itemCount()}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-ink-faint hover:text-danger transition-colors"
            title="Clear cart"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Customer */}
      {customer && (
        <div className="px-4 py-2 bg-primary-soft border-b border-border text-xs text-primary-dark">
          <span className="font-medium">{customer.name}</span>
          {customer.credit_balance > 0 && (
            <span className="ml-2 text-gold tabular">
              Utang: {formatPeso(customer.credit_balance)}
            </span>
          )}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-ink-faint/50 gap-2">
            <ShoppingCart size={32} strokeWidth={1.5} />
            <p className="text-xs">Cart is empty</p>
          </div>
        ) : (
          items.map(item => (
            <CartItem key={item.product.id} item={item} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-faint">Total</span>
          <span className="text-xl font-bold text-ink tabular">{formatPeso(total())}</span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          size="lg"
          className="w-full"
        >
          Checkout
        </Button>
      </div>
    </div>
  )
}
