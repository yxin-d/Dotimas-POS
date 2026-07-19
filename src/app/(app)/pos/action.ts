'use server'

import { createClient } from '@/lib/supabase/server'
import type { CartItem, Customer, PaymentMethod } from '@/types/database'

// Prefix used by use-cart for ad-hoc/canteen items
const CUSTOM_ITEM_PREFIX = '__custom__'

interface CheckoutPayload {
  items:           CartItem[]
  customer:        Customer | null
  amountReceived:  number
  paymentMethod:   PaymentMethod
  isCredit:        boolean
}

export async function completeSale(payload: CheckoutPayload) {
  const supabase = await createClient()  // ✅ No refs, just create the client

  const total  = payload.items.reduce((s, i) => s + i.subtotal, 0)
  const change = payload.isCredit ? 0 : Math.max(0, payload.amountReceived - total)

  // 1. Create invoice header
  const { data: invoice, error: invoiceError } = await supabase
    .from('sale_invoice')
    .insert({
      customer_id:     payload.customer?.id ?? null,
      amount_received: payload.isCredit ? 0 : payload.amountReceived,
      change,
      payment_method:  payload.paymentMethod,
      is_credit:       payload.isCredit,
    })
    .select()
    .single()

  if (invoiceError) throw new Error(`Invoice error: ${invoiceError.message}`)

  // 2. Insert line items
  const lineItems = payload.items.map(item => {
    const isCustom = item.product.id.startsWith(CUSTOM_ITEM_PREFIX)
    return {
      invoice_id:   invoice.id,
      product_id:   isCustom ? null : item.product.id,
      product_name: item.product.name,
      qty:          item.qty,
      unit_price:   item.customPrice ?? item.product.price,
      unit_cost:    item.product.cost ?? 0,
      subtotal:     item.subtotal,
      net_profit:   item.net_profit,
    }
  })

  const { error: linesError } = await supabase.from('sales').insert(lineItems)
  if (linesError) throw new Error(`Line items error: ${linesError.message}`)

  // 3. If credit sale, create ledger entry (with proper balance fetch)
  if (payload.isCredit && payload.customer) {
    const { data: cust, error: custError } = await supabase
      .from('customers')
      .select('credit_balance')
      .eq('id', payload.customer.id)
      .single()

    if (custError) throw new Error(`Customer fetch error: ${custError.message}`)

    const currentBalance = cust?.credit_balance ?? 0
    const newBalance     = currentBalance + total

    const { error: ledgerError } = await supabase.from('ledger').insert({
      customer_id:     payload.customer.id,
      invoice_id:      invoice.id,
      entry_type:      'credit_given',
      amount:          total,
      running_balance: newBalance,
      description:     `Credit from invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
    })

    if (ledgerError) throw new Error(`Ledger error: ${ledgerError.message}`)
  }

  return { invoiceId: invoice.id }
}

export async function recordCreditPayment(
  customerId: string,
  amount:     number,
  notes?:     string
) {
  const supabase = await createClient()

  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('credit_balance, name')
    .eq('id', customerId)
    .single()

  if (fetchError || !customer) throw new Error('Customer not found')
  if (amount > customer.credit_balance)
    throw new Error(`Payment ₱${amount} exceeds balance ₱${customer.credit_balance}`)

  const { error } = await supabase.from('ledger').insert({
    customer_id:     customerId,
    entry_type:      'payment_made',
    amount,
    running_balance: customer.credit_balance - amount,
    description:     notes ?? 'Payment received',
  })

  if (error) throw new Error(error.message)

  return { newBalance: customer.credit_balance - amount }
}