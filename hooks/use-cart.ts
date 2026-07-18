'use client'

import { create } from 'zustand'
import type { CartItem, CartState, Customer, Product } from '@/types/database'

interface CartStore extends CartState {
  addItem: (product: Product, customPrice?: number) => void
  addCustomItem: (name: string, price: number) => void   // canteen / ad-hoc
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  updateCustomPrice: (productId: string, price: number) => void
  setCustomer: (customer: Customer | null) => void
  clearCart: () => void
  loadFromHeld: (items: CartItem[], customer: Customer | null) => void

  total: () => number
  totalProfit: () => number
  itemCount: () => number
}

// Sentinel product ID for custom/canteen items (no DB product)
export const CUSTOM_ITEM_PREFIX = '__custom__'

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,

  addItem: (product, customPrice) => {
    const effectivePrice = customPrice ?? product.price
    set((state) => {
      const existing = state.items.find(i => i.product.id === product.id && !i.customPrice)
      if (existing && !customPrice) {
        const newQty = existing.qty + 1
        return {
          items: state.items.map(i =>
            i.product.id === product.id && !i.customPrice
              ? {
                  ...i,
                  qty: newQty,
                  subtotal: effectivePrice * newQty,
                  net_profit: (effectivePrice - (product.cost ?? 0)) * newQty,
                }
              : i
          ),
        }
      }
      return {
        items: [...state.items, {
          product,
          qty: 1,
          customPrice: customPrice,
          subtotal: effectivePrice,
          net_profit: effectivePrice - (product.cost ?? 0),
        }],
      }
    })
  },

  // For canteen meals / ad-hoc items with no product record
  addCustomItem: (name, price) => {
    const fakeProduct: Product = {
      id: `${CUSTOM_ITEM_PREFIX}${Date.now()}`,
      name,
      barcode: null,
      category_id: null,
      price,
      srp: null,
      cost: 0,
      stocks: 999,
      low_stock_threshold: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    set(state => ({
      items: [...state.items, {
        product: fakeProduct,
        qty: 1,
        customPrice: price,
        subtotal: price,
        net_profit: price,
      }],
    }))
  },

  removeItem: (productId) => {
    set(state => ({ items: state.items.filter(i => i.product.id !== productId) }))
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return }
    set(state => ({
      items: state.items.map(i => {
        if (i.product.id !== productId) return i
        const price = i.customPrice ?? i.product.price
        return { ...i, qty, subtotal: price * qty, net_profit: (price - (i.product.cost ?? 0)) * qty }
      }),
    }))
  },

  updateCustomPrice: (productId, price) => {
    set(state => ({
      items: state.items.map(i => {
        if (i.product.id !== productId) return i
        return {
          ...i,
          customPrice: price,
          subtotal: price * i.qty,
          net_profit: (price - (i.product.cost ?? 0)) * i.qty,
        }
      }),
    }))
  },

  setCustomer: (customer) => set({ customer }),
  clearCart: () => set({ items: [], customer: null, discount: 0 }),

  loadFromHeld: (items, customer) => set({ items, customer, discount: 0 }),

  total: () => get().items.reduce((s, i) => s + i.subtotal, 0),
  totalProfit: () => get().items.reduce((s, i) => s + i.net_profit, 0),
  itemCount: () => get().items.reduce((s, i) => s + i.qty, 0),
}))