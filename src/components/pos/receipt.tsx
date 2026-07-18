'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPeso, formatDate } from '@/lib/utils/currency'
import { Printer, X } from 'lucide-react'
import type { SaleInvoice, SaleLine } from '@/types/database'

interface Props {
  invoiceId: string
  onClose: () => void
}

interface ReceiptData {
  invoice: SaleInvoice & { customers: { name: string } | null }
  lines: SaleLine[]
}

export default function Receipt({ invoiceId, onClose }: Props) {
  const [data, setData]     = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [invoiceRes, linesRes] = await Promise.all([
        supabase
          .from('sale_invoice')
          .select('*, customers(name)')
          .eq('id', invoiceId)
          .single(),
        supabase
          .from('sales')
          .select('*')
          .eq('invoice_id', invoiceId),
      ])

      if (invoiceRes.data && linesRes.data) {
        setData({ invoice: invoiceRes.data as ReceiptData['invoice'], lines: linesRes.data })
      }
      setLoading(false)
    }
    load()
  }, [invoiceId])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
        <div className="bg-surface rounded-2xl p-8 text-sm text-ink-faint">Loading receipt…</div>
      </div>
    )
  }

  if (!data) return null

  const { invoice, lines } = data
  const receiptNo = invoiceId.slice(0, 8).toUpperCase()

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm no-print">
        <div className="bg-surface rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden">

          {/* Actions */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border no-print">
            <span className="text-sm font-semibold text-ink">Sale complete</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-sunken hover:bg-border rounded-lg text-xs font-medium text-ink-soft transition-colors"
              >
                <Printer size={13} />
                Print
              </button>
              <button onClick={onClose} className="text-ink-faint hover:text-ink">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Receipt body */}
          <ReceiptBody invoice={invoice} lines={lines} receiptNo={receiptNo} />
        </div>
      </div>

      {/* Print-only version — full width, no modal chrome */}
      <div className="receipt-only hidden">
        <ReceiptBody invoice={invoice} lines={lines} receiptNo={receiptNo} />
      </div>
    </>
  )
}

function ReceiptBody({ invoice, lines, receiptNo }: {
  invoice: ReceiptData['invoice']; lines: SaleLine[]; receiptNo: string
}) {
  return (
    <div className="px-4 py-4 font-mono text-xs text-gray-800 receipt-content" style={{ fontFamily: 'monospace', fontSize: '12px' }}>

      {/* Store header */}
      <div className="text-center mb-3">
        <p className="font-bold text-sm">STORE NAME</p>
        <p className="text-gray-500">123 Sample St, Brgy. Sample</p>
        <p className="text-gray-500">Tel: 09XX-XXX-XXXX</p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Meta */}
      <div className="flex justify-between mb-1">
        <span className="text-gray-500">No:</span>
        <span className="font-bold">{receiptNo}</span>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-500">Date:</span>
        <span>{formatDate(invoice.created_at, true)}</span>
      </div>
      {invoice.customers?.name && (
        <div className="flex justify-between mb-1">
          <span className="text-gray-500">Customer:</span>
          <span>{invoice.customers.name}</span>
        </div>
      )}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Line items */}
      {lines.map(line => (
        <div key={line.id} className="mb-1">
          <div className="flex justify-between">
            <span className="flex-1 truncate pr-2">{line.product_name}</span>
            <span>{formatPeso(line.subtotal)}</span>
          </div>
          <div className="text-gray-400 pl-1">
            {line.qty} × {formatPeso(line.unit_price)}
          </div>
        </div>
      ))}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Totals */}
      <div className="flex justify-between font-bold mb-1">
        <span>TOTAL</span>
        <span>{formatPeso(invoice.total_amount)}</span>
      </div>

      {invoice.is_credit ? (
        <div className="flex justify-between text-gold">
          <span>CREDIT (utang)</span>
          <span>{formatPeso(invoice.total_amount)}</span>
        </div>
      ) : (
        <>
          <div className="flex justify-between text-gray-600">
            <span>Cash</span>
            <span>{formatPeso(invoice.amount_received)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Change</span>
            <span>{formatPeso(invoice.change)}</span>
          </div>
        </>
      )}

      <div className="border-t border-dashed border-gray-300 my-2" />

      <p className="text-center text-gray-500 text-[10px]">
        {invoice.is_credit ? 'Credited to account. Thank you!' : 'Thank you! Come again!'}
      </p>
      <p className="text-center text-gray-400 text-[10px] mt-1">
        Payment: {invoice.payment_method.toUpperCase()}
      </p>
    </div>
  )
}