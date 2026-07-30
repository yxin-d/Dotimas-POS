'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ProductCategory } from '@/types/database';
import { RefreshCw } from 'lucide-react';

// ─── Schema (unchanged) ──────────────────────────────────
const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  volume: z.string().optional(),
  category_id: z.string().nullable().optional(),
  price: z.string().min(1, 'Price is required'),
  srp: z.string().optional(),
  cost: z.string().optional(),
  stocks: z.string().optional(),
  low_stock_threshold: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type ProductFormValues = z.input<typeof productSchema>;

interface ProductFormProps {
  initialValues?: Partial<ProductFormValues>;
  categories: ProductCategory[];
  submitLabel: string;
  onSubmit: (data: ProductFormValues) => Promise<void>;
  existingSkus?: string[]; // optional list to avoid duplicates
}

export default function ProductForm({
  initialValues,
  categories,
  submitLabel,
  onSubmit,
  existingSkus = [],
}: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  // If we're editing an existing product that already has a SKU, treat it as
  // "manually set" so the auto-generator doesn't silently overwrite it on load.
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(Boolean(initialValues?.sku));
  const skuInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialValues?.name || '',
      sku: initialValues?.sku || '',
      barcode: initialValues?.barcode || '',
      volume: initialValues?.volume || '',
      category_id: initialValues?.category_id || null,
      price: initialValues?.price || '',
      srp: initialValues?.srp || '',
      cost: initialValues?.cost || '',
      stocks: initialValues?.stocks || '',
      low_stock_threshold: initialValues?.low_stock_threshold || '5',
      is_active: initialValues?.is_active ?? true,
    },
  });

  const isActive = watch('is_active');
  const name = watch('name');
  const volume = watch('volume');
  const categoryId = watch('category_id');

  // ─── Generate SKU suggestion ──────────────────────────────
  const generateSkuSuggestion = (): string => {
    const cat = categories.find((c) => c.id === categoryId);
    const catCode = cat?.name?.slice(0, 3).toUpperCase() || 'GEN';
    const nameAbbr = name ? name.slice(0, 3).toUpperCase() : 'XXX';
    const volAbbr = volume ? volume.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) : '';
    const base = `${catCode}-${nameAbbr}${volAbbr ? '-' + volAbbr : ''}`;

    // Check if base already exists in existingSkus (if provided)
    if (existingSkus.includes(base)) {
      let suffix = 1;
      let candidate = base;
      while (existingSkus.includes(candidate)) {
        suffix++;
        candidate = `${base}-${String(suffix).padStart(2, '0')}`;
      }
      return candidate;
    }
    return base;
  };

  // ─── Auto‑generate SKU when name/volume/category changes ──
  useEffect(() => {
    // Only generate if the user hasn't manually edited the SKU field
    if (isSkuManuallyEdited) return;

    const currentSku = getValues('sku');
    // If SKU is empty or matches the previously generated pattern, update it
    // We'll generate a new suggestion
    const suggested = generateSkuSuggestion();
    // Only set if different and not empty
    if (suggested && suggested !== currentSku) {
      setValue('sku', suggested, { shouldValidate: true });
    }
  }, [name, volume, categoryId, categories, existingSkus, isSkuManuallyEdited, getValues, setValue]);

  // ─── Mark as manually edited when user changes the SKU ───
  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSkuManuallyEdited(true);
    register('sku').onChange(e); // still call the original onChange
  };

  const handleRegenerateSku = () => {
    setIsSkuManuallyEdited(false);
    const suggested = generateSkuSuggestion();
    setValue('sku', suggested, { shouldValidate: true });
  };

  const handleFormSubmit = async (data: ProductFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-surface rounded-2xl border border-border p-6 space-y-5">
      {/* ─── Product Name ─── */}
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-1">
          Product name <span className="text-danger">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="e.g., Milk 1L"
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* ─── SKU with Auto‑Generate ─── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-ink-soft">SKU (optional)</label>
          <button
            type="button"
            onClick={handleRegenerateSku}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        </div>
        <div className="flex gap-2">
          <input
            {...register('sku')}
            type="text"
            placeholder="Auto‑generated if left blank"
            ref={(e) => {
              register('sku').ref(e);
              skuInputRef.current = e;
            }}
            onChange={handleSkuChange}
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <p className="text-xs text-ink-faint mt-1">
          Pattern: [Category Code]-[Name Abbr]-[Volume]. Editable.
        </p>
      </div>

      {/* ─── Barcode ─── */}
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-1">Barcode (optional)</label>
        <input
          {...register('barcode')}
          type="text"
          placeholder="Scan or enter barcode"
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* ─── Volume ─── */}
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-1">Volume (optional)</label>
        <input
          {...register('volume')}
          type="text"
          placeholder="e.g., 500ml, 1kg, 24oz"
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* ─── Category ─── */}
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-1">Category (optional)</label>
        <select
          {...register('category_id')}
          className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Price, SRP, Cost ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Price <span className="text-danger">*</span>
          </label>
          <input
            {...register('price')}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {errors.price && <p className="text-danger text-xs mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">SRP (optional)</label>
          <input
            {...register('srp')}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Cost (optional)</label>
          <input
            {...register('cost')}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* ─── Stocks, Low stock threshold ─── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Stocks (optional)</label>
          <input
            {...register('stocks')}
            type="number"
            step="1"
            min="0"
            placeholder="0"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Low stock alert at</label>
          <input
            {...register('low_stock_threshold')}
            type="number"
            step="1"
            min="0"
            placeholder="5"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* ─── Active toggle ─── */}
      <label className="flex items-center gap-2.5 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <span className="text-sm font-medium text-ink-soft">Active (visible on POS)</span>
      </label>

      {/* ─── Submit ─── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}