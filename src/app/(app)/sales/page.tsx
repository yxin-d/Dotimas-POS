'use client';

import { useEffect, useState } from 'react';
import { createClient }  from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Product, Customer } from '@/types/database';

type CustomerOption = Pick<Customer, 'id' | 'name' | 'loyalty_pts' | 'credit_balance'>;

const supabase = createClient();

type CartItem = {
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
};

export default function SalesPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load products for search
  useEffect(() => {
    const fetchProducts = async () => {
      if (searchTerm.length > 1) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
          .eq('is_active', true)
          .limit(10);
        if (data) setProducts(data);
      } else {
        setProducts([]);
      }
    };
    fetchProducts();
  }, [searchTerm]);

  // Load customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, name, loyalty_pts, credit_balance').order('name');
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.unit_price }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          unit_price: product.price,
          unit_cost: product.cost || 0,
          subtotal: product.price,
        },
      ];
    });
    setSearchTerm('');
    setProducts([]);
  };

  const updateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: newQty, subtotal: newQty * item.unit_price } : item
      )
    );
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');

    // 1. Validate payment if not credit
    if (!isCredit) {
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < totalCartAmount) {
        toast.error('Amount received is less than total bill.');
        return;
      }
    }

    setLoading(true);

    try {
      // 2. Insert Invoice
      const { data: invoice, error: invError } = await supabase
        .from('sale_invoice')
        .insert({
          customer_id: selectedCustomerId || null,
          amount_received: isCredit ? 0 : parseFloat(amountReceived),
          change: isCredit ? 0 : parseFloat(amountReceived) - totalCartAmount,
          payment_method: isCredit ? 'cash' : paymentMethod,
          is_credit: isCredit,
          total_amount: totalCartAmount, // trigger will recalc anyway, but good to seed
        })
        .select('id')
        .single();

      if (invError) throw invError;
      const invoiceId = invoice.id;

      // 3. Insert Sales Line Items
      const lineItems = cart.map((item) => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        product_name: item.product_name,
        qty: item.qty,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
        net_profit: (item.unit_price - item.unit_cost) * item.qty,
      }));

      const { error: salesError } = await supabase.from('sales').insert(lineItems);
      if (salesError) throw salesError;

      // 4. If Credit, Insert Ledger Entry
      if (isCredit && selectedCustomerId) {
        // Get current balance
        const { data: cust } = await supabase
          .from('customers')
          .select('credit_balance')
          .eq('id', selectedCustomerId)
          .single();

        const currentBal = cust?.credit_balance || 0;
        const newBal = currentBal + totalCartAmount;

        const { error: ledgerError } = await supabase.from('ledger').insert({
          customer_id: selectedCustomerId,
          invoice_id: invoiceId,
          entry_type: 'credit_given',
          amount: totalCartAmount,
          running_balance: newBal,
          description: `Invoice ${invoiceId}`,
        });
        if (ledgerError) throw ledgerError;
      }

      // 5. If not Credit and customer selected, add loyalty points (e.g., 1 pt per 100 pesos)
      if (!isCredit && selectedCustomerId) {
        const ptsToAdd = Math.floor(totalCartAmount / 100);
        if (ptsToAdd > 0) {
          const { data: cust } = await supabase
            .from('customers')
            .select('loyalty_pts')
            .eq('id', selectedCustomerId)
            .single();
          if (cust) {
            await supabase
              .from('customers')
              .update({ loyalty_pts: (cust.loyalty_pts || 0) + ptsToAdd })
              .eq('id', selectedCustomerId);
          }
        }
      }

      // Success!
      toast.success(`Sale completed! Invoice #${invoiceId.slice(0, 8).toUpperCase()}`);
      setCart([]);
      setAmountReceived('');
      setSelectedCustomerId('');
      setIsCredit(false);
    } catch (err) {
      toast.error('Checkout failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Product Search & Cart */}
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold text-ink">Point of sale (manual entry)</h1>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search product by name or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            autoFocus
          />
          {products.length > 0 && (
            <div className="absolute z-10 bg-surface border border-border rounded-xl shadow-lg w-full max-h-60 overflow-y-auto">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-3 hover:bg-surface-sunken cursor-pointer border-b border-border flex justify-between transition-colors"
                >
                  <span>{p.name}</span>
                  <span className="font-bold text-primary tabular">₱{p.price} (Stock: {p.stocks})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide text-center">Qty</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide text-right">Price</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide text-right">Subtotal</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="px-4 py-3 text-sm text-ink">{item.product_name}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateQty(idx, parseInt(e.target.value) || 0)}
                      className="w-16 border border-border rounded-lg px-2 py-1 text-center tabular focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular text-ink-soft">₱{item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold tabular text-ink">₱{item.subtotal.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))} className="text-danger text-sm font-medium hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-ink-faint">Cart is empty</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Checkout Panel */}
      <div className="space-y-4">
        <div className="bg-surface p-5 rounded-2xl border border-border">
          <h2 className="text-lg font-bold text-ink">Checkout</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Walk-in (No customer)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Pts: {c.loyalty_pts}) {c.credit_balance > 0 ? `| Utang: ₱${c.credit_balance}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">Payment type</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={isCredit}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-surface-sunken"
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCredit"
                checked={isCredit}
                onChange={(e) => setIsCredit(e.target.checked)}
              />
              <label htmlFor="isCredit" className="text-sm font-medium text-gold">
                This is a Credit Sale (Utang)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">Total</label>
              <p className="text-3xl font-bold text-primary tabular">₱{totalCartAmount.toFixed(2)}</p>
            </div>

            {!isCredit && (
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">Amount received</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter cash received"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {amountReceived && parseFloat(amountReceived) > totalCartAmount && (
                  <p className="text-primary text-sm mt-1 tabular">Change: ₱{(parseFloat(amountReceived) - totalCartAmount).toFixed(2)}</p>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:bg-ink-faint disabled:cursor-not-allowed"
            >
              {loading ? 'Processing…' : isCredit ? 'Create credit invoice' : 'Complete sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}