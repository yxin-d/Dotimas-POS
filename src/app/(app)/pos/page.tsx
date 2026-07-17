'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import ProductGrid from '@/components/pos/product-grid'
import Cart from '@/components/pos/cart'
import CheckoutModal from '@/components/pos/checkout-modal'
import CustomerPicker from '@/components/pos/customer-picker'
import type { Product, Customer } from '@/types/database'
import { toast } from 'sonner'

export default function POSPage() {
  const [products, setProducts]           = useState<Product[]>([])
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [checkoutOpen, setCheckoutOpen]   = useState(false)
  const [customerOpen, setCustomerOpen]   = useState(false)

  const { addItem, items, customer, setCustomer } = useCart()
  const supabase = createClient()

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
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Left — product area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shrink-0">
          <input
            type="text"
            placeholder="Search products or scan barcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          {/* Customer badge / picker trigger */}
          <button
            onClick={() => setCustomerOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${customer
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
          >
            <span className="w-5 h-5 rounded-full bg-current opacity-20 shrink-0" />
            {customer ? customer.name : 'Guest'}
          </button>
          {customer && (
            <button
              onClick={() => setCustomer(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
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