'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import { formatPeso } from '@/lib/utils/currency'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, PauseCircle } from 'lucide-react'

interface Props {
  onClose:  () => void
  onHeld:   () => void   // called after successfully holding, so page can refresh held list
}

const LABEL_PRESETS = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Dine-in', 'Take-out']

export default function HoldModal({ onClose, onHeld }: Props) {
  const { items, customer, total, clearCart } = useCart()
  const [label, setLabel]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleHold() {
    if (!label.trim()) { toast.error('Add a label first'); return }
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from('held_invoices').insert({
      label:       label.trim(),
      customer_id: customer?.id ?? null,
      items_json:  items as any,
      total:       total(),
      status:      'held',
    })

    if (error) { toast.error(error.message); setSaving(false); return }

    clearCart()
    toast.success(`Held as "${label}"`)
    onHeld()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden">

        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PauseCircle size={16} className="text-ink-faint" />
            <h2 className="font-semibold text-ink text-sm">Hold transaction</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Summary */}
          <div className="bg-surface-sunken rounded-xl px-3.5 py-3 flex justify-between items-center">
            <span className="text-sm text-ink-soft">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            <span className="tabular font-bold text-ink">{formatPeso(total())}</span>
          </div>

          {/* Quick labels */}
          <div>
            <p className="text-xs text-ink-faint mb-2">Quick label</p>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_PRESETS.map(l => (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors
                    ${label === l
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-sunken text-ink-soft border-border hover:border-primary/40'
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Or type a label</label>
            <input
              type="text"
              placeholder="e.g. Table 5, Window seat…"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleHold()}
              autoFocus
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink
                placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <button
            onClick={handleHold}
            disabled={!label.trim() || saving}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold
              hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {saving ? 'Holding…' : 'Hold order'}
          </button>
        </div>
      </div>
    </div>
  )
}