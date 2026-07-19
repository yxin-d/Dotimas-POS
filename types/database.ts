export type PaymentMethod   = 'cash' | 'gcash' | 'maya' | 'mixed' | 'credit'
export type LedgerEntryType = 'credit_given' | 'payment_made'
export type ExpenseCategory = 'supplies' | 'utilities' | 'salary' | 'maintenance' | 'food' | 'other'
export type HoldStatus      = 'held' | 'completed' | 'voided'
export type GcashDirection  = 'received' | 'sent'

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
      product_categories: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string | null
          barcode: string | null
          category_id: string | null
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
      held_invoices: {
        Row: {
          id: string
          label: string
          customer_id: string | null
          items_json: CartItem[]
          total: number
          status: HoldStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['held_invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['held_invoices']['Insert']>
      }
      gcash_log: {
        Row: {
          id: string
          direction: GcashDirection
          amount: number
          sender: string | null
          ref_number: string | null
          notes: string | null
          txn_date: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['gcash_log']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['gcash_log']['Insert']>
      }
      pos_sessions: {
        Row: {
          id: string
          session_date: string
          starting_cash: number
          closing_cash: number | null
          notes: string | null
          closed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pos_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pos_sessions']['Insert']>
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
          gcash_sales: number
          cash_collected: number
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

// ─── App-level row types ────────────────────────────────────

export type Customer        = Database['public']['Tables']['customers']['Row']
export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type Product         = Database['public']['Tables']['products']['Row']
export type SaleInvoice     = Database['public']['Tables']['sale_invoice']['Row']
export type SaleLine        = Database['public']['Tables']['sales']['Row']
export type LedgerEntry     = Database['public']['Tables']['ledger']['Row']
export type Expense         = Database['public']['Tables']['expenses']['Row']
export type HeldInvoice     = Database['public']['Tables']['held_invoices']['Row']
export type GcashEntry      = Database['public']['Tables']['gcash_log']['Row']
export type PosSession      = Database['public']['Tables']['pos_sessions']['Row']

// ─── Cart types ─────────────────────────────────────────────

export interface CartItem {
  product: Product
  qty: number
  subtotal: number
  net_profit: number
  /** If set, overrides product.price for this line (custom/canteen pricing) */
  customPrice?: number
}

export interface CartState {
  items: CartItem[]
  customer: Customer | null
  discount: number
}