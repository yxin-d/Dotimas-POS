'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import { Plus, Search, Package, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import Badge from '@/src/components/ui/badge';
import type { Product } from '@/types/database';
import { exportProducts } from './action';
import { toast } from 'sonner';

interface ProductWithCategory extends Product {
  categories?: { name: string } | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const supabase = useRef<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    supabase.current = createClient();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.current
      .from('product_categories')
      .select('id, name')
      .order('name');
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.current
      .from('products')
      .select(`
        *,
        categories ( name )
      `)
      .eq('is_active', true)
      .order('name');

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category_id', categoryFilter);
    }

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  // Trigger fetch when search or category changes
  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeout);
  }, [search, categoryFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const handleExport = async () => {
    try {
      const csvData = await exportProducts();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Export failed: ' + error.message);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-ink">Products</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 bg-gray-200 text-ink px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-300 transition-colors"
          >
            <FileSpreadsheet size={16} />
            Export CSV
          </button>
          <Link
            href="/products/import"
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Package size={16} />
            Import products
          </Link>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            New product
          </Link>
        </div>
      </div>

      {/* Filters: Search + Category */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search by name or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-border rounded-xl px-4 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Barcode</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide text-right">Price</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide text-right">Cost</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide text-right">Stocks</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-surface-sunken rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-faint">
                      <Package size={28} strokeWidth={1.5} />
                      <p className="text-sm">No products found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-3 text-sm tabular text-ink-soft">{p.barcode || '—'}</td>
                    <td className="px-4 py-3 text-sm tabular text-ink-soft">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-ink-soft">
                      {p.categories?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm tabular text-ink text-right">{formatPeso(p.price)}</td>
                    <td className="px-4 py-3 text-sm tabular text-ink-faint text-right">{formatPeso(p.cost)}</td>
                    <td className="px-4 py-3 text-sm tabular text-right">
                      <span className={p.stocks <= p.low_stock_threshold ? 'text-danger font-semibold' : 'text-ink'}>
                        {p.stocks}
                      </span>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-sunken/40">
            <span className="text-sm text-ink-faint">
              Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, products.length)} of {products.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-ink-faint">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}