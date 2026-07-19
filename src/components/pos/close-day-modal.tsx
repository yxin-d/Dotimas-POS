'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPeso, todayPH } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { X, TrendingUp, CreditCard, Wallet, Smartphone, ReceiptText, CheckCircle } from 'lucide-react'

interface Props {
  startingCash: number
  onClose: () => void
}

interface DaySummary {
  invoice_count: number
  gross_sales: number
  total_profit: number
  credit_given: number
  gcash_sales: number
  cash_collected: number
}

export default function CloseDayModal({ startingCash, onClose }: Props) {
  const [summary, setSummary]         = useState<DaySummary | null>(null)
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [gcashReceived, setGcashReceived] = useState(0)
  const [gcashSent, setGcashSent]     = useState(0)
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [closed, setClosed]           = useState(false)

  const today = todayPH()  // 'YYYY-MM-DD' in Asia/Manila

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Query using date range in Manila time to avoid timezone drift
      const dayStart = `${today}T00:00:00+08:00`
      const dayEnd   = `${today}T23:59:59+08:00`

      const [invoiceRes, salesRes, expenseRes, gcashRes] = await Promise.all([
        // Count and total of invoices for today
        supabase
          .from('sale_invoice')
          .select('id, total_amount, is_credit, payment_method, amount_received, change')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd),

        // Profit from line items for today's invoices
        supabase
          .from('sales')
          .select('net_profit, sale_invoice!inner(created_at)')
          .gte('sale_invoice.created_at', dayStart)
          .lte('sale_invoice.created_at', dayEnd),

        // Expenses logged today
        supabase
          .from('expenses')
          .select('amount')
          .eq('expense_date', today),

        // GCash log entries today
        supabase
          .from('gcash_log')
          .select('direction, amount')
          .eq('txn_date', today),
      ])

      const invoices = invoiceRes.data ?? []
      const salesLines = salesRes.data ?? []
      const expenses = expenseRes.data ?? []
      const gcashEntries = gcashRes.data ?? []

      const grossSales   = invoices.reduce((s, i) => s + i.total_amount, 0)
      const creditGiven  = invoices.filter(i => i.is_credit).reduce((s, i) => s + i.total_amount, 0)
      const gcashSales   = invoices.filter(i => i.payment_method === 'gcash').reduce((s, i) => s + i.total_amount, 0)
      const cashCollected = invoices
        .filter(i => i.payment_method === 'cash' && !i.is_credit)
        .reduce((s, i) => s + (i.amount_received - i.change), 0)
      const totalProfit  = salesLines.reduce((s: number, l: any) => s + (l.net_profit ?? 0), 0)

      setSummary({
        invoice_count:  invoices.length,
        gross_sales:    grossSales,
        total_profit:   totalProfit,
        credit_given:   creditGiven,
        gcash_sales:    gcashSales,
        cash_collected: cashCollected,
      })

      setExpenseTotal(expenses.reduce((s, e) => s + e.amount, 0))

      const { received, sent } = gcashEntries.reduce(
        (acc, g) => {
          if (g.direction === 'received') acc.received += g.amount
          else acc.sent += g.amount
          return acc
        },
        { received: 0, sent: 0 }
      )
      setGcashReceived(received)
      setGcashSent(sent)

      setLoading(false)
    }
    load()
  }, [today])

  const expectedCash = startingCash + (summary?.cash_collected ?? 0) - expenseTotal
  const actualCash   = parseFloat(closingCash) || 0
  const variance     = actualCash - expectedCash

  async function handleClose() {
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('pos_sessions')
      .update({
        closing_cash: actualCash || null,
        notes:        notes.trim() || null,
        closed_at:    new Date().toISOString(),
      })
      .eq('session_date', today)

    if (error) {
      // If session row doesn't exist yet (skip was pressed), upsert it
      await supabase.from('pos_sessions').upsert({
        session_date:  today,
        starting_cash: startingCash,
        closing_cash:  actualCash || null,
        notes:         notes.trim() || null,
        closed_at:     new Date().toISOString(),
      }, { onConflict: 'session_date' })
    }

    setSaving(false)
    setClosed(true)
  }

  if (closed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
        <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
          <div className="w-14 h-14 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-success" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">Day closed!</h2>
          <p className="text-sm text-ink-soft">
            {formatPeso(summary?.gross_sales ?? 0)} in sales today. Magpahinga na!
          </p>
          <button onClick={onClose}
            className="mt-6 w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
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

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-ink-faint">Loading today's data…</div>
          ) : (
            <>
              {/* Sales */}
              <Section title="Sales">
                <Row icon={<ReceiptText size={14} />} label="Transactions" value={String(summary?.invoice_count ?? 0)} mono />
                <Row icon={<TrendingUp size={14} className="text-success" />} label="Gross sales" value={formatPeso(summary?.gross_sales)} />
                <Row icon={<TrendingUp size={14} className="text-success" />} label="Net profit (est.)" value={formatPeso(summary?.total_profit)} />
                <Row icon={<CreditCard size={14} className="text-gold" />} label="On credit (utang)" value={formatPeso(summary?.credit_given)} accent="gold" />
              </Section>

              {/* Payments */}
              <Section title="Payments">
                <Row icon={<Wallet size={14} />} label="Cash collected" value={formatPeso(summary?.cash_collected)} />
                <Row icon={<Smartphone size={14} />} label="GCash (POS sales)" value={formatPeso(summary?.gcash_sales)} />
                {gcashReceived > 0 && (
                  <Row icon={<Smartphone size={14} />} label="GCash received (log)" value={formatPeso(gcashReceived)} />
                )}
                {gcashSent > 0 && (
                  <Row icon={<Smartphone size={14} />} label="GCash sent (log)" value={formatPeso(gcashSent)} accent="danger" />
                )}
              </Section>

              {/* Expenses */}
              <Section title="Expenses">
                {expenseTotal > 0 ? (
                  <Row icon={<Wallet size={14} className="text-danger" />} label="Total expenses" value={formatPeso(expenseTotal)} accent="danger" />
                ) : (
                  <p className="text-xs text-ink-faint px-3.5 py-2">No expenses logged today</p>
                )}
              </Section>

              {/* Cash count */}
              <Section title="Cash count">
                <Row label="Starting cash" value={formatPeso(startingCash)} />
                <Row label="+ Cash collected" value={formatPeso(summary?.cash_collected ?? 0)} />
                <Row label="− Expenses" value={formatPeso(expenseTotal)} accent="danger" />
                <Row label="= Expected in drawer" value={formatPeso(expectedCash)} bold />

                <div className="px-3.5 pt-2 pb-1">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Actual cash in drawer
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
                    <p className={`text-xs mt-1.5 tabular font-semibold ${variance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {variance >= 0 ? '↑ Over' : '↓ Short'} by {formatPeso(Math.abs(variance))}
                    </p>
                  )}
                </div>
              </Section>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Notes</label>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-surface-sunken rounded-xl divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Row({ icon, label, value, accent, bold, mono }: {
  icon?: React.ReactNode; label: string; value: string
  accent?: 'gold' | 'danger'; bold?: boolean; mono?: boolean
}) {
  const valueClass = accent === 'gold' ? 'text-gold' : accent === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-ink-soft">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`tabular ${valueClass} ${bold ? 'font-bold' : ''} ${mono ? '' : ''}`}>
        {value}
      </span>
    </div>
  )
}