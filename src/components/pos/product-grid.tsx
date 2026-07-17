'use client'

import type { Product } from '@/types/database'
import { formatPeso } from '@/lib/utils/currency'
import { Package } from 'lucide-react'

interface Props {
  products: Product[]
  loading: boolean
  onAdd: (product: Product) => void
}

export default function ProductGrid({ products, loading, onAdd }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <Package size={40} strokeWidth={1.5} />
        <p className="text-sm">No products found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {products.map(product => (
        <ProductTile key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  )
}

function ProductTile({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const outOfStock = product.stocks <= 0
  const lowStock   = product.stocks > 0 && product.stocks <= product.low_stock_threshold

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={outOfStock}
      className={`
        relative flex flex-col items-start text-left p-3 rounded-xl border transition-all
        ${outOfStock
          ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm active:scale-95 cursor-pointer'
        }
      `}
    >
      {/* Stock badge */}
      {outOfStock && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
          Out
        </span>
      )}
      {lowStock && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
          Low
        </span>
      )}

      {/* Product icon placeholder */}
      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
        <Package size={20} className="text-blue-400" strokeWidth={1.5} />
      </div>

      <span className="text-sm font-medium text-gray-800 leading-tight line-clamp-2 mb-1">
        {product.name}
      </span>
      <span className="text-xs text-gray-400 mb-1">
        {product.stocks} left
      </span>
      <span className="text-sm font-bold text-blue-600 mt-auto">
        {formatPeso(product.price)}
      </span>
    </button>
  )
}