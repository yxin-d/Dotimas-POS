'use server'

import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// ------------------- IMPORT -------------------
interface ProductImportRow {
  name: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  stocks?: number                      // ✅ Will be used as initial batch quantity
  low_stock_threshold?: number
  is_active?: boolean
  // NEW BATCH FIELDS:
  batch_quantity?: number              // If provided, overrides stocks for batch
  batch_expiration_date?: string       // REQUIRED if batch_quantity provided
  batch_purchase_date?: string
  batch_cost?: number
}

export async function importProducts(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) throw new Error('No file uploaded')

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data: any[] = XLSX.utils.sheet_to_json(sheet)

  // Normalize column names
  const mapKey = (key: string) => {
    const lower = key.toLowerCase().trim()
    if (['name', 'product name'].includes(lower)) return 'name'
    if (['sku', 'product code'].includes(lower)) return 'sku'
    if (['barcode', 'upc'].includes(lower)) return 'barcode'
    if (['price', 'selling price', 'unit price'].includes(lower)) return 'price'
    if (['cost', 'cost price', 'purchase price'].includes(lower)) return 'cost'
    if (['stocks', 'stock', 'quantity', 'qty'].includes(lower)) return 'stocks'
    if (['low_stock_threshold', 'threshold', 'alert level'].includes(lower)) return 'low_stock_threshold'
    if (['is_active', 'active', 'status'].includes(lower)) return 'is_active'
    // BATCH FIELDS
    if (['batch_qty', 'batch quantity', 'batch stocks'].includes(lower)) return 'batch_quantity'
    if (['batch_expiry', 'expiry', 'expiration date', 'best before'].includes(lower)) return 'batch_expiration_date'
    if (['batch_purchase_date', 'purchase date', 'date received'].includes(lower)) return 'batch_purchase_date'
    if (['batch_cost', 'batch unit cost'].includes(lower)) return 'batch_cost'
    return null
  }

  const normalizedData: ProductImportRow[] = data.map(row => {
    const mapped: any = {}
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapKey(key)
      if (mappedKey) {
        const strVal = String(value).trim()
        // Numeric fields
        if (['price', 'cost', 'stocks', 'low_stock_threshold', 'batch_quantity', 'batch_cost'].includes(mappedKey)) {
          mapped[mappedKey] = parseFloat(strVal) || 0
        } else if (mappedKey === 'is_active') {
          mapped[mappedKey] = strVal.toLowerCase() === 'true' || value === 1 || value === '1'
        } else {
          mapped[mappedKey] = strVal || null
        }
      }
    }
    return mapped as ProductImportRow
  })

  // Validate rows
  const errors: string[] = []
  for (const [index, row] of normalizedData.entries()) {
    if (!row.name) errors.push(`Row ${index + 2}: Name is required`)
    if (row.price === undefined || row.price < 0) errors.push(`Row ${index + 2}: Price must be a positive number`)

    // If batch_quantity is provided, expiration date is required
    if (row.batch_quantity && row.batch_quantity > 0 && !row.batch_expiration_date) {
      errors.push(`Row ${index + 2}: Expiration date is required when batch quantity is provided`)
    }
    // Validate date format if provided
    if (row.batch_expiration_date && isNaN(Date.parse(row.batch_expiration_date))) {
      errors.push(`Row ${index + 2}: Invalid expiration date format (use YYYY-MM-DD)`)
    }
    if (row.batch_purchase_date && isNaN(Date.parse(row.batch_purchase_date))) {
      errors.push(`Row ${index + 2}: Invalid purchase date format (use YYYY-MM-DD)`)
    }
  }
  if (errors.length > 0) throw new Error(`Validation errors:\n${errors.join('\n')}`)

  // Upsert products
  const results = { inserted: 0, updated: 0, batches_created: 0, skipped: 0 }

  for (const row of normalizedData) {
    // Prepare product payload
    const productPayload = {
      name: row.name,
      sku: row.sku || null,
      barcode: row.barcode || null,
      price: row.price,
      cost: row.cost || 0,
      stocks: row.batch_quantity || row.stocks || 0, // total stock (will be updated via trigger later)
      low_stock_threshold: row.low_stock_threshold || 5,
      is_active: row.is_active !== undefined ? row.is_active : true,
    }

    let productId: string | null = null

    // Upsert by barcode first, then by SKU
    let existingId: string | null = null
    if (productPayload.barcode) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', productPayload.barcode)
        .maybeSingle()
      if (existing) existingId = existing.id
    }

    if (existingId) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update(productPayload)
        .eq('id', existingId)
      if (!error) {
        results.updated++
        productId = existingId
      } else {
        results.skipped++
        continue
      }
    } else {
      // Insert new product
      const { data: inserted, error } = await supabase
        .from('products')
        .insert(productPayload)
        .select('id')
        .single()
      if (!error && inserted) {
        results.inserted++
        productId = inserted.id
      } else {
        results.skipped++
        continue
      }
    }

    // ─── CREATE BATCH if batch_quantity provided ───
    if (row.batch_quantity && row.batch_quantity > 0 && productId) {
      const batchPayload = {
        product_id: productId,
        batch_code: row.sku || null, // use SKU as batch code if available
        purchase_date: row.batch_purchase_date || new Date().toISOString().slice(0, 10),
        expiration_date: row.batch_expiration_date,
        quantity: row.batch_quantity,
        remaining: row.batch_quantity,
        cost: row.batch_cost || row.cost || 0,
      }

      const { error } = await supabase
        .from('product_batches')
        .insert(batchPayload)

      if (!error) {
        results.batches_created++
      } else {
        console.error('Batch insert error:', error)
        // Don't fail the whole import, just log
      }
    }
  }

  return {
    message: `✅ Import complete: ${results.inserted} products inserted, ${results.updated} updated, ${results.batches_created} batches created, ${results.skipped} skipped`,
    ...results,
  }
}

// ------------------- EXPORT -------------------
export async function exportProducts() {
  const supabase = await createClient()

  // Option 1: Export product-level data only (simple)
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('name, sku, barcode, price, cost, stocks, low_stock_threshold, is_active')
    .order('name')

  if (productError) throw new Error('Failed to fetch products')

  // Option 2: Export with batch details (recommended for full inventory view)
  // We'll export both sheets (or combine into one)
  const { data: batches, error: batchError } = await supabase
    .from('product_batches')
    .select(`
      products(name, sku, barcode),
      batch_code,
      purchase_date,
      expiration_date,
      quantity,
      remaining,
      cost
    `)
    .order('expiration_date', { ascending: true })

  if (batchError) throw new Error('Failed to fetch batches')

  // Create a combined view for CSV (flattened)
  const combinedData = batches?.map(b => {
    const productData = Array.isArray(b.products) ? b.products[0] : b.products
    return {
      product_name: productData?.name || '',
      sku: productData?.sku || '',
      barcode: productData?.barcode || '',
      batch_code: b.batch_code || '',
      purchase_date: b.purchase_date,
      expiration_date: b.expiration_date,
      batch_quantity: b.quantity,
      batch_remaining: b.remaining,
      batch_cost: b.cost,
    }
  }) || []

  // If no batches exist, fallback to product-only export
  if (combinedData.length === 0) {
    const worksheet = XLSX.utils.json_to_sheet(products)
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    return csv
  }

  const worksheet = XLSX.utils.json_to_sheet(combinedData)
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  return csv
}