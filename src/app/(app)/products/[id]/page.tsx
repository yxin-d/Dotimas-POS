'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProductForm, { type ProductFormValues } from '@/src/components/products/product-form';
import { toast } from 'sonner';

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<Partial<ProductFormValues>>({});
  const supabase = useRef<any>(null);

  useEffect(() => {
    supabase.current = createClient();
  }, []);

  useEffect(() => {
    async function fetchProduct() {
      const { data } = await supabase.current.from('products').select('*').eq('id', id).single();
      if (data) {
        setInitialValues({
          name: data.name || '',
          barcode: data.barcode || '',
          price: data.price?.toString() || '',
          srp: data.srp?.toString() || '',
          cost: data.cost?.toString() || '',
          stocks: data.stocks?.toString() || '',
          low_stock_threshold: data.low_stock_threshold?.toString() || '5',
          is_active: data.is_active ?? true,
        });
      }
      setLoading(false);
    }
    if (id) fetchProduct();
  }, [id]);

  async function handleSubmit(form: ProductFormValues) {
    const payload = {
      name: form.name,
      barcode: form.barcode || null,
      price: parseFloat(form.price ?? '0') || 0,
      srp: parseFloat(form.srp ?? '0') || 0,
      cost: parseFloat(form.cost ?? '0') || 0,
      stocks: parseInt(form.stocks ?? '0') || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold ?? '5') || 5,
      is_active: form.is_active,
    };

    const { error } = await supabase.current.from('products').update(payload).eq('id', id as string);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Product updated');
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
      <h1 className="text-2xl font-bold text-ink mb-6">Edit product</h1>
      {loading ? (
        <div className="bg-surface rounded-2xl border border-border p-6 text-sm text-ink-faint">
          Loading product…
        </div>
      ) : (
        <ProductForm
            initialValues={initialValues}
            submitLabel="Update product"
            onSubmit={handleSubmit} categories={[]}        />
      )}
    </div>
  );
}
