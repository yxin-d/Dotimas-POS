'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { importProducts } from '../action' // adjust path
import { toast } from 'sonner'

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return toast.error('Please select a file')

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await importProducts(formData)
      setResult(result.message)
      toast.success('Import successful!')
      // Optionally refresh product list after a delay
      setTimeout(() => router.push('/products'), 2000)
    } catch (error: any) {
      toast.error(error.message || 'Import failed')
      setResult(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Import Products</h1>
      <p className="text-sm text-ink-faint mb-6">
        Upload an Excel (.xlsx, .xls) or CSV file. Supported columns:<br />
        <strong>name</strong> (required), <strong>sku</strong>, <strong>barcode</strong>, <strong>price</strong> (required), <strong>cost</strong>, <strong>stocks</strong>, <strong>low_stock_threshold</strong>, <strong>is_active</strong> (true/false).
        <br /><br />
        <span className="font-semibold">Batch columns (optional):</span><br />
        <strong>batch_quantity</strong>, <strong>batch_expiration_date</strong> (required if batch_quantity provided), <strong>batch_purchase_date</strong>, <strong>batch_cost</strong>
      </p>

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Choose file</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border border-border rounded-lg px-4 py-2 bg-surface-sunken"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-ink-faint disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : 'Import Products'}
        </button>
        {result && (
          <div className="mt-4 p-3 bg-surface-sunken rounded-lg text-sm whitespace-pre-wrap">
            {result}
          </div>
        )}
      </form>
    </div>
  )
}