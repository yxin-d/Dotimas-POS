'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import { AlertTriangle, Wallet, TrendingUp, Receipt } from 'lucide-react';

interface DailyStats {
  gross_sales?: number;
  total_profit?: number;
  invoice_count?: number;
  credit_given?: number;
}

interface LowStockItem {
  id: string;
  name: string;
  stocks: number;
}

interface CreditItem {
  id: string;
  name: string;
  credit_balance: number;
}

export default function DashboardPage() {
  const [dailyStats, setDailyStats] = useState<DailyStats>({});
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<any>(null);

  useEffect(() => {
    supabaseRef.current = createClient();

    const fetchData = async () => {
      setLoading(true);

      const { data: daily } = await supabaseRef.current
        .from('daily_summary')
        .select('*')
        .order('sale_date', { ascending: false })
        .limit(1);

      const { data: lowStock } = await supabaseRef.current
        .from('low_stock')
        .select('*');

      const { data: credit } = await supabaseRef.current
        .from('credit_summary')
        .select('*')
        .limit(5);

      if (daily && daily.length > 0) setDailyStats(daily[0]);
      if (lowStock) setLowStockItems(lowStock);
      if (credit) setCreditSummary(credit);
      setLoading(false);
    };

    fetchData();
  }, []);

  const stats = [
    {
      label: 'Gross sales (today)',
      value: formatPeso(dailyStats.gross_sales),
      icon: Receipt,
      tone: 'text-ink',
    },
    {
      label: 'Total profit (today)',
      value: formatPeso(dailyStats.total_profit),
      icon: TrendingUp,
      tone: 'text-primary',
    },
    {
      label: 'Invoices (today)',
      value: (dailyStats.invoice_count ?? 0).toString(),
      icon: Receipt,
      tone: 'text-ink',
    },
    {
      label: 'Credit given (today)',
      value: formatPeso(dailyStats.credit_given),
      icon: Wallet,
      tone: 'text-gold',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="bg-surface p-4 rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-ink-faint">{label}</p>
              <Icon size={14} className="text-ink-faint" strokeWidth={1.75} />
            </div>
            <p className={`text-2xl font-bold tabular ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-surface p-5 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-warning" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-ink">Low stock alerts</h2>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-ink-faint">All stocks are healthy.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lowStockItems.map((item) => (
                <li key={item.id} className="py-2.5 flex justify-between items-center text-sm">
                  <span className="text-ink">{item.name}</span>
                  <span className="text-danger font-semibold tabular">{item.stocks} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Outstanding Credit */}
        <div className="bg-surface p-5 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-gold" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-ink">Top outstanding credit</h2>
          </div>
          {creditSummary.length === 0 ? (
            <p className="text-sm text-ink-faint">No outstanding balances.</p>
          ) : (
            <ul className="divide-y divide-border">
              {creditSummary.map((c) => (
                <li key={c.id} className="py-2.5 flex justify-between items-center text-sm">
                  <span className="text-ink">{c.name}</span>
                  <span className="text-gold font-semibold tabular">{formatPeso(c.credit_balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
