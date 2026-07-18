'use client'

import { useState, useRef, useEffect } from 'react'
import { useCart } from '@/hooks/use-cart'
import { X, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
}

const MEAL_PRESETS = [
  'Sinangag + Itlog',
  'Silog',
  'Pork Adobo + Rice',
  'Chicken Adobo + Rice',
  'Sinigang (cup)',
  'Lugaw',
  'Mami',
  'Fried Rice',
]

export default function CustomItemModal({ onClose }: Props) {
  const { addCustomItem } = useCart()
  const [name, setName]   = useState('')
  const [price, setPrice] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function handleAdd() {
    if (!name.trim()) { toast.error('Enter a name'); return }
    const p = parseFloat(price)
    if (!p || p <= 0) { toast.error('Enter a valid price'); return }

    addCustomItem(name.trim(), p)
    toast.success(`${name} added to cart`)
    onClose()
  }

  function handlePreset(meal: string) {
    setName(meal)
    // focus price after picking a preset
    setTimeout(() => {
      document.getElementById('custom-price-input')?.focus()
    }, 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={16} className="text-ink-faint" />
            <h2 className="font-semibold text-ink text-sm">Custom item</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Meal presets */}
          <div>
            <p className="text-xs text-ink-faint mb-2">Quick presets</p>
            <div className="flex flex-wrap gap-1.5">
              {MEAL_PRESETS.map(m => (
                <button
                  key={m}
                  onClick={() => handlePreset(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors
                    ${name === m
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-sunken text-ink-soft border-border hover:border-primary/40 hover:text-primary'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Item name</label>
            <input
              ref={nameRef}
              type="text"
              placeholder="e.g. Pork BBQ + Rice"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink
                placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Price (₱)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">₱</span>
              <input
                id="custom-price-input"
                type="number"
                min={0}
                step="0.50"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full pl-8 pr-4 py-2.5 border border-border rounded-xl text-sm tabular
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold
              hover:bg-primary-dark active:scale-[0.98] transition-all"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}