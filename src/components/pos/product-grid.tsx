'use client'

import type { Product } from '@/types/database'
import { formatPeso } from '@/lib/utils/currency'
import { Package } from 'lucide-react'
import Badge from '@/src/components/ui/badge'

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
          <div key={i} className="h-28 bg-surface-sunken rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-ink-faint gap-3">
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
          ? 'opacity-40 cursor-not-allowed bg-surface-sunken border-border'
          : 'bg-surface border-border hover:border-primary hover:shadow-sm active:scale-95 cursor-pointer'
        }
      `}
    >
      {/* Stock badge */}
      {outOfStock && (
        <Badge tone="danger" className="absolute top-2 right-2">Out</Badge>
      )}
      {lowStock && (
        <Badge tone="warning" className="absolute top-2 right-2">Low</Badge>
      )}

      {/* Product icon placeholder */}
      <div className="w-10 h-10 bg-primary-soft rounded-lg flex items-center justify-center mb-2">
        <Package size={20} className="text-primary" strokeWidth={1.5} />
      </div>

      <span className="text-sm font-medium text-ink leading-tight line-clamp-2 mb-1">
        {product.name}
      </span>
      <span className="text-xs text-ink-faint mb-1 tabular">
        {product.stocks} left
      </span>
      <span className="text-sm font-bold text-primary mt-auto tabular">
        {formatPeso(product.price)}
      </span>
    </button>
  )
}
