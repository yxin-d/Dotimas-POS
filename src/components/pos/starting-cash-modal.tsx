'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPeso, todayPH } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { Banknote } from 'lucide-react'

interface Props {
  onConfirm: (startingCash: number) => void
}

const QUICK_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000]

export default function StartingCashModal({ onConfirm }: Props) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const value = parseFloat(amount) || 0

  async function handleConfirm() {
    if (value < 0) { toast.error('Amount must be positive'); return }
    setSaving(true)

    const supabase = createClient()
    const today    = todayPH()

    // Upsert — safe to call multiple times
    const { error } = await supabase.from('pos_sessions').upsert({
      session_date:  today,
      starting_cash: value,
    }, { onConflict: 'session_date' })

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    onConfirm(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-primary px-5 py-5 text-white">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3">
            <Banknote size={22} />
          </div>
          <h2 className="text-lg font-bold">Good morning!</h2>
          <p className="text-sm text-white/70 mt-0.5">How much cash is in the drawer?</p>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">Starting cash</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint font-medium">₱</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                autoFocus
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl text-lg tabular font-semibold
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-xs text-ink-faint mb-2">Quick fill</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setAmount(String(amt))}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors tabular
                    ${value === amt
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-sunken text-ink-soft border-border hover:border-primary/40 hover:text-primary'
                    }`}
                >
                  {formatPeso(amt)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm
              hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Open register'}
          </button>

          <button
            onClick={() => onConfirm(0)}
            className="w-full text-xs text-ink-faint hover:text-ink-soft py-1 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}