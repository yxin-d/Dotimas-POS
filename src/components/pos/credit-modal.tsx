'use client'

import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { completeSale } from '@/src/app/(app)/pos/action'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'
import { toast } from 'sonner'
import { X, Search, CreditCard, UserPlus } from 'lucide-react'
import Receipt from './receipt'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

export default function CreditModal({ onClose, onSuccess }: Props) {
  const { items, total, clearCart } = useCart()

  const [query, setQuery]                           = useState('')
  const [results, setResults]                       = useState<Customer[]>([])
  const [selected, setSelected]                     = useState<Customer | null>(null)
  const [searching, setSearching]                   = useState(false)
  const [loading, setLoading]                       = useState(false)
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { searchRef.current?.focus() }, [])

  // Debounced customer search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(6)
      setResults(data ?? [])
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const orderTotal = total()

  async function handleConfirm() {
    if (!selected) { toast.error('Select a customer first'); return }
    setLoading(true)
    try {
      const { invoiceId } = await completeSale({
        items,
        customer: selected,
        amountReceived: 0,
        paymentMethod: 'credit',
        isCredit: true,
      })
      setCompletedInvoiceId(invoiceId)
      clearCart()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record credit')
      setLoading(false)
    }
  }

  if (completedInvoiceId) {
    return <Receipt invoiceId={completedInvoiceId} onClose={onSuccess} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-gold" />
            <h2 className="font-semibold text-ink">Record as credit (utang)</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Customer search */}
          {!selected ? (
            <div>
              <p className="text-xs font-semibold text-ink-soft mb-2">Who is this for?</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search customer name…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
                />
              </div>

              {/* Results */}
              {(results.length > 0 || searching) && (
                <div className="mt-2 border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {searching && (
                    <p className="px-3 py-2.5 text-xs text-ink-faint">Searching…</p>
                  )}
                  {results.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelected(c); setQuery('') }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-sunken text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        {c.phone && <p className="text-xs text-ink-faint">{c.phone}</p>}
                      </div>
                      {c.credit_balance > 0 && (
                        <span className="text-xs tabular font-semibold text-gold shrink-0 ml-2">
                          {formatPeso(c.credit_balance)} utang
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {query && !searching && results.length === 0 && (
                <div className="mt-2 text-center py-3">
                  <p className="text-xs text-ink-faint mb-2">No customer found for "{query}"</p>
                  <a
                    href="/customers/new"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <UserPlus size={11} /> Add new customer
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Selected customer card */
            <div className="flex items-center justify-between bg-gold-soft border border-gold/20 rounded-xl px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">{selected.name}</p>
                {selected.credit_balance > 0 && (
                  <p className="text-xs text-gold tabular mt-0.5">
                    Current balance: {formatPeso(selected.credit_balance)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-ink-faint hover:text-ink ml-2"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Order summary */}
          <div className="bg-surface-sunken rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-ink-soft truncate pr-2">{item.product.name} × {item.qty}</span>
                <span className="text-ink font-medium tabular shrink-0">{formatPeso(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-bold text-ink">
              <span>Total to credit</span>
              <span className="tabular text-gold">{formatPeso(orderTotal)}</span>
            </div>
          </div>

          {selected && (
            <p className="text-xs text-ink-faint bg-surface-sunken rounded-lg px-3 py-2">
              {formatPeso(orderTotal)} will be added to {selected.name}'s balance.
              New balance: <span className="tabular font-semibold text-gold">{formatPeso(selected.credit_balance + orderTotal)}</span>
            </p>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="w-full py-3 rounded-xl bg-gold text-white font-bold text-sm
              hover:opacity-90 active:scale-[0.98] transition-all
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Recording…' : `Record credit — ${formatPeso(orderTotal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}