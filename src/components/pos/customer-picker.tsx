'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPeso } from '@/lib/utils/currency'
import type { Customer } from '@/types/database'
import { Search, X, UserPlus } from 'lucide-react'

interface Props {
  onSelect: (customer: Customer) => void
  onClose: () => void
}

export default function CustomerPicker({ onSelect, onClose }: Props) {
  const [query, setQuery]         = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setCustomers([]); return }

    const timeout = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(8)

      setCustomers(data ?? [])
      setLoading(false)
    }, 250)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customer by name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 text-sm focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto divide-y">
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-400">Searching…</div>
          )}

          {!loading && query && customers.length === 0 && (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-gray-500 mb-2">No customer found for "{query}"</p>
              <button className="flex items-center gap-1.5 mx-auto text-xs text-blue-600 hover:underline">
                <UserPlus size={12} />
                Add new customer
              </button>
            </div>
          )}

          {customers.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
              </div>
              <div className="text-right">
                {c.credit_balance > 0 && (
                  <p className="text-xs font-medium text-orange-500">
                    Utang: {formatPeso(c.credit_balance)}
                  </p>
                )}
                {c.loyalty_pts > 0 && (
                  <p className="text-xs text-gray-400">{c.loyalty_pts} pts</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {!query && (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            Start typing to search customers
          </div>
        )}
      </div>
    </div>
  )
}