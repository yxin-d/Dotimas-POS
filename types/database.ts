// Auto-generate this file by running:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
//
// The types below are hand-written to match your schema.
// Replace with the generated version once your Supabase project is set up.

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'mixed'
export type LedgerEntryType = 'credit_given' | 'payment_made'
export type ExpenseCategory = 'supplies' | 'utilities' | 'salary' | 'maintenance' | 'food' | 'other'

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          loyalty_pts: number
          credit_balance: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'loyalty_pts' | 'credit_balance'> & { id?: string }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      products: {
        Row: {
          id: string
          name: string
          barcode: string | null
          price: number
          srp: number | null
          cost: number | null
          stocks: number
          low_stock_threshold: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      sale_invoice: {
        Row: {
          id: string
          customer_id: string | null
          amount_received: number
          change: number
          payment_method: PaymentMethod
          is_credit: boolean
          total_amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sale_invoice']['Row'], 'id' | 'created_at' | 'total_amount'> & { total_amount?: number }
        Update: Partial<Database['public']['Tables']['sale_invoice']['Insert']>
      }
      sales: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          qty: number
          unit_price: number
          unit_cost: number
          subtotal: number
          net_profit: number
        }
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['sales']['Insert']>
      }
      ledger: {
        Row: {
          id: string
          customer_id: string
          invoice_id: string | null
          entry_type: LedgerEntryType
          amount: number
          running_balance: number
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ledger']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ledger']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          description: string
          category: ExpenseCategory
          amount: number
          expense_date: string
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
    }
    Views: {
      daily_summary: {
        Row: {
          sale_date: string
          invoice_count: number
          gross_sales: number
          total_profit: number
          credit_given: number
        }
      }
      credit_summary: {
        Row: {
          id: string
          name: string
          phone: string | null
          credit_balance: number
          loyalty_pts: number
          total_entries: number
          last_activity: string
        }
      }
      low_stock: {
        Row: {
          id: string
          name: string
          barcode: string | null
          stocks: number
          low_stock_threshold: number
          price: number
        }
      }
    }
  }
}

// ─── App-level types ────────────────────────────────────────

export type Customer    = Database['public']['Tables']['customers']['Row']
export type Product     = Database['public']['Tables']['products']['Row']
export type SaleInvoice = Database['public']['Tables']['sale_invoice']['Row']
export type SaleLine    = Database['public']['Tables']['sales']['Row']
export type LedgerEntry = Database['public']['Tables']['ledger']['Row']
export type Expense     = Database['public']['Tables']['expenses']['Row']

// Cart types (client-side only)
export interface CartItem {
  product: Product
  qty: number
  subtotal: number
  net_profit: number
}

export interface CartState {
  items: CartItem[]
  customer: Customer | null
  discount: number
}