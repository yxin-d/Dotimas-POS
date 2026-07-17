'use client'

import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { ShoppingCart, Trash2 } from 'lucide-react'
import CartItem from './cart-item'

interface Props {
  onCheckout: () => void
}

export default function Cart({ onCheckout }: Props) {
  const { items, clearCart, total, itemCount, customer } = useCart()

  return (
    <div className="w-80 shrink-0 flex flex-col bg-white border-l h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">Cart</span>
          {itemCount() > 0 && (
            <span className="text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-medium">
              {itemCount()}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Clear cart"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Customer */}
      {customer && (
        <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-700">
          <span className="font-medium">{customer.name}</span>
          {customer.credit_balance > 0 && (
            <span className="ml-2 text-orange-600">
              Utang: {formatPeso(customer.credit_balance)}
            </span>
          )}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
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
      <div className="border-t px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-xl font-bold text-gray-900">{formatPeso(total())}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold
            hover:bg-blue-700 active:scale-95 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Checkout
        </button>
      </div>
    </div>
  )
}