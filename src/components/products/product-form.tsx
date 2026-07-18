'use client'

import { useState, type FormEvent } from 'react'
import Input from '@/src/components/ui/input'
import Button from '@/src/components/ui/button'

export interface ProductFormValues {
  name: string
  barcode: string
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
  price: '',
  srp: '',
  cost: '',
  stocks: '',
  low_stock_threshold: '5',
  is_active: true,
}

export default function ProductForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [form, setForm] = useState<ProductFormValues>({ ...DEFAULTS, ...initialValues })
  const [saving, setSaving] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface p-6 rounded-2xl border border-border space-y-5"
    >
      <Input
        label="Product name *"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
        placeholder="e.g. Lucky Me Pancit Canton"
      />
      <Input
        label="Barcode"
        name="barcode"
        value={form.barcode}
        onChange={handleChange}
        placeholder="Scan or type barcode"
        className="tabular"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Selling price (₱)"
          name="price"
          type="number"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          required
          className="tabular"
        />
        <Input
          label="Cost (₱)"
          name="cost"
          type="number"
          step="0.01"
          value={form.cost}
          onChange={handleChange}
          className="tabular"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Stocks"
          name="stocks"
          type="number"
          value={form.stocks}
          onChange={handleChange}
          className="tabular"
        />
        <Input
          label="Low stock threshold"
          name="low_stock_threshold"
          type="number"
          value={form.low_stock_threshold}
          onChange={handleChange}
          className="tabular"
        />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          name="is_active"
          type="checkbox"
          checked={form.is_active}
          onChange={handleChange}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <span className="text-sm font-medium text-ink">Active (visible in POS)</span>
      </label>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
