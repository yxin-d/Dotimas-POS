'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import { Plus, Search, Package } from 'lucide-react';
import Badge from '@/src/components/ui/badge';
import type { Product } from '@/types/database';

const supabase = createClient();

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('*').order('name');
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
    }
    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-ink">Products</h1>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          New product
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          placeholder="Search by name or barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Barcode</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Cost</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Stocks</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-surface-sunken rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-faint">
                      <Package size={28} strokeWidth={1.5} />
                      <p className="text-sm">No products found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-3 text-sm tabular text-ink-soft">{p.barcode || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-3 text-sm tabular text-ink">{formatPeso(p.price)}</td>
                    <td className="px-4 py-3 text-sm tabular text-ink-faint">{formatPeso(p.cost)}</td>
                    <td className="px-4 py-3 text-sm tabular">
                      <span className={p.stocks <= p.low_stock_threshold ? 'text-danger font-semibold' : 'text-ink'}>
                        {p.stocks}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.is_active ? 'primary' : 'neutral'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-primary hover:text-primary-dark text-sm font-medium hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
