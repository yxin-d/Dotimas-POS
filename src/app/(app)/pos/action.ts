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

// Shape sent to the complete_sale RPC. Only qty and (for genuinely custom
// items) an explicit price are trusted from the client — real product
// price/cost are re-looked-up from the DB inside the function itself.
interface RpcSaleItem {
  product_id:   string | null
  product_name: string
  qty:          number
  custom_price: number | null
}

export async function completeSale(payload: CheckoutPayload) {
  const supabase = await createClient()

  const items: RpcSaleItem[] = payload.items.map(item => {
    const isCustom = item.product.id.startsWith(CUSTOM_ITEM_PREFIX)
    return {
      product_id:   isCustom ? null : item.product.id,
      product_name: item.product.name,
      qty:          item.qty,
      // For custom items this IS the price (required). For real products this
      // is only a canteen-style override when the cashier explicitly set one;
      // otherwise null, and complete_sale uses the product's live DB price.
      custom_price: isCustom ? (item.customPrice ?? 0) : (item.customPrice ?? null),
    }
  })

  const { data, error } = await supabase.rpc('complete_sale', {
    p_customer_id:     payload.customer?.id ?? null,
    p_payment_method:  payload.paymentMethod,
    p_amount_received: payload.isCredit ? 0 : payload.amountReceived,
    p_is_credit:       payload.isCredit,
    p_items:           items,
  })

  if (error) throw new Error(error.message)

  return { invoiceId: data as string }
}

export async function recordCreditPayment(
  customerId: string,
  amount:     number,
  notes?:     string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('record_credit_change', {
    p_customer_id: customerId,
    p_invoice_id:  null,
    p_entry_type:  'payment_made',
    p_amount:      amount,
    p_description: notes ?? 'Payment received',
  })

  if (error) throw new Error(error.message)

  return { newBalance: data as number }
}
