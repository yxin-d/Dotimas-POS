'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload } from 'lucide-react';
import { importProducts } from '../action';
import { toast } from 'sonner';

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file');

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await importProducts(formData);
      setResult(result.message);
      toast.success('Import successful!');
      setTimeout(() => router.push('/products'), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back button */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to products
      </Link>

      <h1 className="text-2xl font-bold mb-4">Import Products</h1>

      {/* Help text – updated with new fields */}
      <div className="bg-surface-sunken/60 rounded-xl p-4 mb-6 text-sm text-ink-faint space-y-1">
        <p>Upload an Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) or <strong>CSV</strong> file.</p>
        <p>
          <span className="font-semibold text-ink-soft">Supported columns:</span><br />
          <strong>name</strong> (required), <strong>sku</strong>, <strong>barcode</strong>, <strong>volume</strong>,{' '}
          <strong>category</strong> (must match an existing category name exactly),{' '}
          <strong>price</strong> (required), <strong>cost</strong>, <strong>stocks</strong>,{' '}
          <strong>low_stock_threshold</strong>, <strong>is_active</strong> (true/false).
        </p>
        <p>
          <span className="font-semibold text-ink-soft">Batch columns (optional):</span><br />
          <strong>batch_quantity</strong>,{' '}
          <strong>batch_expiration_date</strong> (required if batch_quantity provided),{' '}
          <strong>batch_purchase_date</strong>, <strong>batch_cost</strong>.
        </p>
        <p className="text-xs text-ink-faint/70 mt-2">
          <span className="font-semibold">Note:</span> If a category name is provided, it will be matched to an existing category ID. If no match is found, the product will be imported without a category.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Choose file</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border border-border rounded-lg px-4 py-2 bg-surface-sunken file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!file || loading}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:bg-ink-faint disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Importing...'
            ) : (
              <>
                <Upload size={16} />
                Import Products
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
            className="px-4 border border-border rounded-lg text-ink-faint hover:bg-surface-sunken transition-colors disabled:opacity-50"
            disabled={!file || loading}
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-surface-sunken rounded-lg text-sm whitespace-pre-wrap border border-border">
            {result}
          </div>
        )}
      </form>

      {/* Download sample template (optional) */}
      <div className="mt-6 text-center">
        <button
          onClick={() => {
            // Create a sample CSV template
            const headers = [
              'name', 'sku', 'barcode', 'volume', 'category',
              'price', 'cost', 'stocks', 'low_stock_threshold', 'is_active',
              'batch_quantity', 'batch_expiration_date', 'batch_purchase_date', 'batch_cost'
            ];
            const sample = headers.join(',') + '\n' +
              '"Milk 1L","MLK001","890123456789","1L","Dairy","85.00","65.00","50","5","true",,,,\n' +
              '"Bread White","BRD002","890123456790","500g","Bakery","45.00","30.00","20","3","true",,,,\n' +
              '"Cola 330ml","COLA03","890123456791","330ml","Beverages","25.00","18.00","100","10","true",,,,';
            const blob = new Blob([sample], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sample_product_import.csv';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Sample CSV downloaded');
          }}
          className="text-sm text-primary hover:underline"
        >
          📥 Download sample CSV template
        </button>
      </div>
    </div>
  );
}