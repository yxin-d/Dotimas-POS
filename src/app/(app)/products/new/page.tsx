'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProductForm, { type ProductFormValues } from '@/src/components/products/product-form';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import type { ProductCategory } from '@/types/database';

export default function NewProductPage() {
  const router = useRouter();
  const supabase = useRef<any>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [existingSkus, setExistingSkus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.current = createClient();
    fetchData();
  }, []);

  async function fetchData() {
    const [catRes, skuRes] = await Promise.all([
      supabase.current.from('product_categories').select('*').order('name'),
      supabase.current.from('products').select('sku'),
    ]);
    setCategories(catRes.data || []);
    setExistingSkus((skuRes.data || []).map((p: any) => p.sku).filter(Boolean));
    setLoading(false);
  }

  async function handleSubmit(form: ProductFormValues) {
    // Ensure SKU is unique – if blank, generate one
    let finalSku = form.sku?.trim() || '';
    if (!finalSku) {
      // Fallback: generate a simple one if user didn't provide and auto-gen failed
      const fallback = `PROD-${Date.now().toString(36).toUpperCase()}`;
      finalSku = fallback;
    }
    // Check if SKU already exists (just in case)
    if (existingSkus.includes(finalSku)) {
      toast.error(`SKU "${finalSku}" already exists. Please use a different one.`);
      return;
    }

    const payload = {
      name: form.name,
      sku: finalSku,
      barcode: form.barcode || null,
      volume: form.volume || null,
      category_id: form.category_id || null,
      price: parseFloat(form.price ?? '0') || 0,
      srp: parseFloat(form.srp ?? '0') || 0,
      cost: parseFloat(form.cost ?? '0') || 0,
      stocks: parseInt(form.stocks ?? '0', 10) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold ?? '5', 10) || 5,
      is_active: form.is_active,
    };

    const { error } = await supabase.current.from('products').insert([payload]);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.name} added`);
      router.push('/products');
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-ink-faint">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to products
      </Link>
      <h1 className="text-2xl font-bold text-ink mb-6">Add new product</h1>
      <ProductForm
        submitLabel="Create product"
        onSubmit={handleSubmit}
        categories={categories}
        existingSkus={existingSkus}
      />
    </div>
  );
}