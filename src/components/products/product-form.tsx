'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/src/components/ui/input'
import Button from '@/src/components/ui/button'
import type { ProductCategory } from '@/types/database'

export interface ProductFormValues {
  name: string
  barcode: string
  category_id: string
  price: string
  srp: string
  cost: string
  stocks: string
  low_stock_threshold: string
  is_active: boolean
}

interface Props {
  initialValues?: Partial<ProductFormValues>
  submitLabel: string
  onSubmit: (values: ProductFormValues) => Promise<void>
}

const DEFAULTS: ProductFormValues = {
  name: '',
  barcode: '',
  category_id: '',
  price: '',
  srp: '',
  cost: '',
  stocks: '',
  low_stock_threshold: '5',
  is_active: true,
}

export default function ProductForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [form, setForm]           = useState<ProductFormValues>({ ...DEFAULTS, ...initialValues })
  const [saving, setSaving]       = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('product_categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSubmit(form) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-2xl border border-border space-y-5">

      <Input
        label="Product name *"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
        placeholder="e.g. Lucky Me Pancit Canton"
      />

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Category</label>
        <select
          name="category_id"
          value={form.category_id}
          onChange={handleChange}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        >
          <option value="">— No category —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <Input
        label="Barcode"
        name="barcode"
        value={form.barcode}
        onChange={handleChange}
        placeholder="Scan or type barcode"
        className="tabular"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Selling price (₱) *" name="price" type="number" step="0.01"
          value={form.price} onChange={handleChange} required className="tabular" />
        <Input label="Cost (₱)" name="cost" type="number" step="0.01"
          value={form.cost} onChange={handleChange} className="tabular" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="SRP (₱)" name="srp" type="number" step="0.01"
          value={form.srp} onChange={handleChange} className="tabular" />
        <Input label="Stocks" name="stocks" type="number"
          value={form.stocks} onChange={handleChange} className="tabular" />
      </div>

      <Input label="Low stock alert at" name="low_stock_threshold" type="number"
        value={form.low_stock_threshold} onChange={handleChange} className="tabular" />

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input name="is_active" type="checkbox" checked={form.is_active}
          onChange={handleChange}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
        <span className="text-sm font-medium text-ink">Active (visible in POS)</span>
      </label>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}