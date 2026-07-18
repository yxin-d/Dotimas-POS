'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient }  from '@/lib/supabase/client';
import type { Customer } from '@/types/database';

const supabase = createClient();

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    let query = supabase.from('customers').select('*').order('name');
    if (search.trim()) {
      query = query.ilike('name', `%${search}%`);
    }
    const { data } = await query;
    if (data) setCustomers(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on search change is intentional
    fetchCustomers();
  }, [search]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <button className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
          + Add customer
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-sunken">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Phone</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Loyalty pts</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Credit bal.</th>
              <th className="px-6 py-3 text-xs font-semibold text-ink-soft uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-surface-sunken/60 transition-colors">
                <td className="px-6 py-3 text-sm font-medium text-ink">{c.name}</td>
                <td className="px-6 py-3 text-sm text-ink-soft">{c.phone || 'N/A'}</td>
                <td className="px-6 py-3 text-sm tabular text-ink">{c.loyalty_pts}</td>
                <td className="px-6 py-3 text-sm tabular text-gold font-semibold">₱{c.credit_balance}</td>
                <td className="px-6 py-3">
                  <Link href={`/customers/${c.id}/credit`} className="text-primary hover:underline text-sm font-medium">
                    View Credit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}