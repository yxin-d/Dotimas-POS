'use client'

import { create } from 'zustand'
import type { CartItem, CartState, Customer, Product } from '@/types/database'

interface CartStore extends CartState {
  // Actions
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setCustomer: (customer: Customer | null) => void
  clearCart: () => void

  // Computed
  total: () => number
  totalProfit: () => number
  itemCount: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find(i => i.product.id === product.id)

      if (existing) {
        return {
          items: state.items.map(i =>
            i.product.id === product.id
              ? {
                  ...i,
                  qty: i.qty + 1,
                  subtotal: i.product.price * (i.qty + 1),
                  net_profit: (i.product.price - (i.product.cost ?? 0)) * (i.qty + 1),
                }
              : i
          ),
        }
      }

      const newItem: CartItem = {
        product,
        qty: 1,
        subtotal: product.price,
        net_profit: product.price - (product.cost ?? 0),
      }
      return { items: [...state.items, newItem] }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(i => i.product.id !== productId),
    }))
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set((state) => ({
      items: state.items.map(i =>
        i.product.id === productId
          ? {
              ...i,
              qty,
              subtotal: i.product.price * qty,
              net_profit: (i.product.price - (i.product.cost ?? 0)) * qty,
            }
          : i
      ),
    }))
  },

  setCustomer: (customer) => set({ customer }),

  clearCart: () => set({ items: [], customer: null, discount: 0 }),

  total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
  totalProfit: () => get().items.reduce((sum, i) => sum + i.net_profit, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}))