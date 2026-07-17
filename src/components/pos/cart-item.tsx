'use client'

import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { Minus, Plus, X } from 'lucide-react'
import type { CartItem as CartItemType } from '@/types/database'

interface Props {
  item: CartItemType
}

export default function CartItem({ item }: Props) {
  const { updateQty, removeItem } = useCart()
  const { product, qty, subtotal } = item

  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-gray-400">{formatPeso(product.price)} each</p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-semibold text-gray-800">{formatPeso(subtotal)}</span>

        {/* Qty controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQty(product.id, qty - 1)}
            className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Minus size={10} />
          </button>
          <span className="w-6 text-center text-sm font-medium">{qty}</span>
          <button
            onClick={() => updateQty(product.id, qty + 1)}
            disabled={qty >= product.stocks}
            className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <Plus size={10} />
          </button>
          <button
            onClick={() => removeItem(product.id)}
            className="w-6 h-6 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-colors ml-1"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}