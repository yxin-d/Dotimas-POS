'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProductForm, { type ProductFormValues } from '@/src/components/products/product-form';
import { toast } from 'sonner';

const supabase = createClient();

export default function NewProductPage() {
  const router = useRouter();

  async function handleSubmit(form: ProductFormValues) {
    const payload = {
      name: form.name,
      barcode: form.barcode || null,
      price: parseFloat(form.price) || 0,
      srp: parseFloat(form.srp) || 0,
      cost: parseFloat(form.cost) || 0,
      stocks: parseInt(form.stocks) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      is_active: form.is_active,
    };

    const { error } = await supabase.from('products').insert([payload]);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.name} added`);
      router.push('/products');
    }
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
      <ProductForm submitLabel="Create product" onSubmit={handleSubmit} />
    </div>
  );
}
