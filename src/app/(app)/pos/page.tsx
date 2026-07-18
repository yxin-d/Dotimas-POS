"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import ProductGrid from '@/src/components/pos/product-grid'
import Cart from '@/src/components/pos/cart'
import CheckoutModal from '@/src/components/pos/checkout-modal'
import CustomerPicker from '@/src/components/pos/customer-picker'
import type { Product, Customer } from '@/types/database'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient()

export default function POSPage() {
  const [products, setProducts]           = useState<Product[]>([])
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [customerOpen, setCustomerOpen]   = useState(false)

  const { addItem, customer, setCustomer } = useCart()

  // Load all active products once
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) toast.error('Failed to load products')
      else setProducts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Barcode scanner: look up by barcode, add to cart
  const handleBarcode = useCallback(async (barcode: string) => {
    const match = products.find(p => p.barcode === barcode)
    if (match) {
      if (match.stocks <= 0) {
        toast.error(`${match.name} is out of stock`)
        return
      }
      addItem(match)
      toast.success(`Added ${match.name}`)
    } else {
      toast.error(`No product found for barcode: ${barcode}`)
    }
  }, [products, addItem])

  useBarcodeScanner(handleBarcode)

  // Filtered products for the grid
  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search)
      )
    : products

  return (
    <div className="flex h-full overflow-hidden bg-canvas">

      {/* Left — product area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shrink-0">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search products or scan barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-sunken border border-transparent rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-surface"
            />
          </div>
          {/* Customer badge / picker trigger */}
          <button
            onClick={() => setCustomerOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap
              ${customer
                ? 'bg-primary-soft border-primary/20 text-primary-dark'
                : 'bg-surface border-border text-ink-faint hover:bg-surface-sunken'
              }`}
          >
            <span className="w-5 h-5 rounded-full bg-current opacity-20 shrink-0" />
            {customer ? customer.name : 'Guest'}
          </button>
          {customer && (
            <button
              onClick={() => setCustomer(null)}
              className="text-ink-faint hover:text-ink text-lg leading-none"
              title="Remove customer"
            >×</button>
          )}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid
            products={filtered}
            loading={loading}
            onAdd={(product) => {
              if (product.stocks <= 0) {
                toast.error(`${product.name} is out of stock`)
                return
              }
              addItem(product)
            }}
          />
        </div>
      </div>

      {/* Right — cart */}
      <Cart onCheckout={() => setCheckoutOpen(true)} />

      {/* Modals */}
      {checkoutOpen && (
        <CheckoutModal
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCheckoutOpen(false)
          }}
        />
      )}

      {customerOpen && (
        <CustomerPicker
          onSelect={(c: Customer) => {
            setCustomer(c)
            setCustomerOpen(false)
          }}
          onClose={() => setCustomerOpen(false)}
        />
      )}
    </div>
  )
}
