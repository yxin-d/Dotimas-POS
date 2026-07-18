'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPeso, todayPH } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { X, TrendingUp, CreditCard, Wallet, Smartphone, ReceiptText } from 'lucide-react'

interface Props {
  startingCash: number
  onClose: () => void
}

interface Summary {
  invoice_count: number
  gross_sales: number
  total_profit: number
  credit_given: number
  gcash_sales: number
  cash_collected: number
}

interface ExpenseTotal {
  total: number
}

interface GcashTotal {
  received: number
  sent: number
}

export default function CloseDayModal({ startingCash, onClose }: Props) {
  const [summary, setSummary]         = useState<Summary | null>(null)
  const [expenses, setExpenses]       = useState<ExpenseTotal>({ total: 0 })
  const [gcash, setGcash]             = useState<GcashTotal>({ received: 0, sent: 0 })
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [loading, setLoading]         = useState(true)
  const [closed, setClosed]           = useState(false)

  const today = todayPH()

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [summaryRes, expensesRes, gcashRes] = await Promise.all([
        supabase.from('daily_summary').select('*').eq('sale_date', today).single(),
        supabase.from('expenses').select('amount').eq('expense_date', today),
        supabase.from('gcash_log').select('direction, amount').eq('txn_date', today),
      ])

      if (summaryRes.data) setSummary(summaryRes.data as Summary)

      const expTotal = (expensesRes.data ?? []).reduce((s, e) => s + e.amount, 0)
      setExpenses({ total: expTotal })

      const gcashTotals = (gcashRes.data ?? []).reduce(
        (acc, g) => {
          if (g.direction === 'received') acc.received += g.amount
          else acc.sent += g.amount
          return acc
        },
        { received: 0, sent: 0 }
      )
      setGcash(gcashTotals)
      setLoading(false)
    }
    load()
  }, [])

  const expectedCash = startingCash + (summary?.cash_collected ?? 0) - expenses.total
  const actualCash   = parseFloat(closingCash) || 0
  const variance     = actualCash - expectedCash

  async function handleClose() {
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('pos_sessions')
      .update({
        closing_cash: actualCash || null,
        notes:        notes || null,
        closed_at:    new Date().toISOString(),
      })
      .eq('session_date', today)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    setClosed(true)
  }

  if (closed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
        <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
          <div className="w-14 h-14 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <ReceiptText size={28} className="text-success" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">Day closed!</h2>
          <p className="text-sm text-ink-soft">
            {formatPeso(summary?.gross_sales ?? 0)} in sales today. Magpahinga na!
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-ink">Close day</h2>
            <p className="text-xs text-ink-faint">{today}</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-ink-faint">Loading summary…</div>
          ) : (
            <>
              {/* Sales summary */}
              <section>
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Sales</p>
                <div className="bg-surface-sunken rounded-xl divide-y divide-border">
                  <Row icon={<ReceiptText size={14} className="text-ink-faint" />}
                    label="Transactions" value={String(summary?.invoice_count ?? 0)} plain />
                  <Row icon={<TrendingUp size={14} className="text-success" />}
                    label="Gross sales" value={formatPeso(summary?.gross_sales)} />
                  <Row icon={<TrendingUp size={14} className="text-success" />}
                    label="Net profit" value={formatPeso(summary?.total_profit)} />
                  <Row icon={<CreditCard size={14} className="text-gold" />}
                    label="Credit given (utang)" value={formatPeso(summary?.credit_given)} accent="gold" />
                </div>
              </section>

              {/* Payments breakdown */}
              <section>
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Payments</p>
                <div className="bg-surface-sunken rounded-xl divide-y divide-border">
                  <Row icon={<Wallet size={14} className="text-ink-faint" />}
                    label="Cash collected" value={formatPeso(summary?.cash_collected)} />
                  <Row icon={<Smartphone size={14} className="text-ink-faint" />}
                    label="GCash (POS sales)" value={formatPeso(summary?.gcash_sales)} />
                  <Row icon={<Smartphone size={14} className="text-ink-faint" />}
                    label="GCash received (log)" value={formatPeso(gcash.received)} />
                  <Row icon={<Smartphone size={14} className="text-ink-faint" />}
                    label="GCash sent (log)" value={formatPeso(gcash.sent)} accent="danger" />
                </div>
              </section>

              {/* Expenses */}
              <section>
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Expenses</p>
                <div className="bg-surface-sunken rounded-xl">
                  <Row icon={<Wallet size={14} className="text-danger" />}
                    label="Total expenses" value={formatPeso(expenses.total)} accent="danger" />
                </div>
              </section>

              {/* Cash count */}
              <section>
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Cash count</p>
                <div className="bg-surface-sunken rounded-xl divide-y divide-border">
                  <Row label="Starting cash" value={formatPeso(startingCash)} plain />
                  <Row label="Expected cash" value={formatPeso(expectedCash)} plain />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Actual cash in drawer (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">₱</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={closingCash}
                      onChange={e => setClosingCash(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-border rounded-xl text-sm tabular
                        focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  {closingCash && (
                    <p className={`text-xs mt-1.5 tabular font-medium ${variance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {variance >= 0 ? 'Over' : 'Short'} by {formatPeso(Math.abs(variance))}
                    </p>
                  )}
                </div>
              </section>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Notes for the day</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything notable today…"
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm resize-none
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-ink-faint"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
          <button
            onClick={handleClose}
            disabled={saving || loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm
              hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Closing…' : 'Close register for today'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, value, accent, plain }: {
  icon?: React.ReactNode; label: string; value: string; accent?: 'gold' | 'danger'; plain?: boolean
}) {
  const valueClass = accent === 'gold'
    ? 'text-gold'
    : accent === 'danger'
    ? 'text-danger'
    : plain
    ? 'text-ink'
    : 'text-ink font-semibold'

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-ink-soft">{label}</span>
      </div>
      <span className={`tabular ${valueClass}`}>{value}</span>
    </div>
  )
}