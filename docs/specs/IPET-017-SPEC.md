# IPET-017 SPEC — Pet Shop Financial Dashboard

## Context
- **App:** Web Dashboard (Next.js 14 App Router)
- **Stack:** TypeScript strict, Tailwind CSS, Supabase JS, Lucide icons
- **Depends on:** IPET-011 (Mercado Pago integration — payment_method, paid_at columns exist)
- **Scope:** Frontend only — zero migrations needed
- **Page:** `/dashboard/financeiro` (page already exists as placeholder)

## Database Schema (Already Exists)

```sql
-- bookings table (relevant columns)
-- id UUID PK
-- tutor_id UUID FK profiles
-- petshop_id UUID FK petshops
-- booking_date DATE
-- start_time TIME
-- end_time TIME
-- status TEXT ('pending_payment','confirmed','in_progress','completed','cancelled','no_show')
-- total_amount DECIMAL(10,2)
-- commission_amount DECIMAL(10,2) DEFAULT 0
-- payment_id TEXT
-- payment_status TEXT
-- payment_method TEXT (added by IPET-011)
-- paid_at TIMESTAMPTZ (added by IPET-011)
-- created_at TIMESTAMPTZ

-- booking_items table
-- id UUID PK
-- booking_id UUID FK bookings
-- pet_id UUID FK pets
-- service_id UUID FK services
-- price DECIMAL(10,2)
-- duration_minutes INT
```

**Commission logic:** IPET platform takes 10% of total_amount. The `commission_amount` column stores this. Net = total_amount - commission_amount.

## Files to Create

### 1. `apps/web/src/hooks/useFinanceiro.ts`

```typescript
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// === Types ===

export interface BookingTransaction {
  id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  commission_amount: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  // Joined
  tutor: { display_name: string } | null;
  booking_items: {
    id: string;
    price: number;
    pet: { name: string } | null;
    service: { name: string } | null;
  }[];
}

export interface FinanceiroSummary {
  totalBookings: number;
  grossRevenue: number;
  totalCommission: number;
  netRevenue: number;
  avgTicket: number;
}

export interface RevenueByPeriod {
  today: number;
  week: number;
  month: number;
}

export type DateFilter = '7d' | '30d' | 'custom';

export function useFinanceiro(petshopId: string) {
  const [transactions, setTransactions] = useState<BookingTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate date range from filter
  const getDateRange = (): { start: string; end: string } => {
    const now = new Date();
    const end = now.toISOString().split('T')[0]; // today YYYY-MM-DD

    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }

    const days = dateFilter === '7d' ? 7 : 30;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { start: start.toISOString().split('T')[0], end };
  };

  const fetchTransactions = async () => {
    if (!petshopId) return;
    setLoading(true);
    setError('');

    try {
      const { start, end } = getDateRange();

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          total_amount,
          commission_amount,
          status,
          payment_status,
          payment_method,
          paid_at,
          created_at,
          tutor:profiles!tutor_id(display_name),
          booking_items(
            id,
            price,
            pet:pets(name),
            service:services(name)
          )
        `)
        .eq('petshop_id', petshopId)
        .in('status', ['completed', 'confirmed', 'in_progress'])
        .gte('booking_date', start)
        .lte('booking_date', end)
        .order('booking_date', { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions((data as unknown as BookingTransaction[]) || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [petshopId, dateFilter, customStartDate, customEndDate]);

  // === Calculated Summary ===
  const summary: FinanceiroSummary = useMemo(() => {
    const grossRevenue = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission_amount || t.total_amount * 0.1), 0);
    const netRevenue = grossRevenue - totalCommission;
    const avgTicket = transactions.length > 0 ? grossRevenue / transactions.length : 0;

    return {
      totalBookings: transactions.length,
      grossRevenue,
      totalCommission,
      netRevenue,
      avgTicket,
    };
  }, [transactions]);

  // === Revenue by Period (always calculated from ALL data, not filtered) ===
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod>({ today: 0, week: 0, month: 0 });

  const fetchRevenueByPeriod = async () => {
    if (!petshopId) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    try {
      // Fetch last 30 days of completed bookings for revenue cards
      const { data } = await supabase
        .from('bookings')
        .select('booking_date, total_amount, commission_amount')
        .eq('petshop_id', petshopId)
        .in('status', ['completed', 'confirmed', 'in_progress'])
        .gte('booking_date', monthAgo.toISOString().split('T')[0])
        .lte('booking_date', todayStr);

      if (!data) return;

      let today = 0, week = 0, month = 0;
      for (const b of data) {
        const net = Number(b.total_amount) - Number(b.commission_amount || b.total_amount * 0.1);
        month += net;
        if (b.booking_date >= weekAgo.toISOString().split('T')[0]) week += net;
        if (b.booking_date === todayStr) today += net;
      }

      setRevenueByPeriod({ today, week, month });
    } catch {
      // Silently fail — revenue cards are supplementary
    }
  };

  useEffect(() => {
    fetchRevenueByPeriod();
  }, [petshopId]);

  return {
    transactions,
    loading,
    error,
    summary,
    revenueByPeriod,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    refetch: fetchTransactions,
  };
}
```

### 2. `apps/web/src/app/(dashboard)/financeiro/components/RevenueCards.tsx`

```typescript
'use client';

import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import type { RevenueByPeriod } from '@/hooks/useFinanceiro';

// Format BRL currency
const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  revenue: RevenueByPeriod;
}

// Cards: Ganhos Hoje, Ganhos Semana, Ganhos Mês
// All values are NET (after 10% commission)
export function RevenueCards({ revenue }: Props) {
  const cards = [
    { label: 'Ganhos Hoje', value: revenue.today, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Ganhos Semana', value: revenue.week, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Ganhos Mês', value: revenue.month, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(card.value)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Valor líquido</p>
            </div>
            <div className={`p-3 rounded-full ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3. `apps/web/src/app/(dashboard)/financeiro/components/SummaryCard.tsx`

```typescript
'use client';

import { ShoppingBag, DollarSign, Receipt } from 'lucide-react';
import type { FinanceiroSummary } from '@/hooks/useFinanceiro';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  summary: FinanceiroSummary;
}

// Bottom summary: Total Bookings | Receita Total | Ticket Médio
export function SummaryCard({ summary }: Props) {
  const items = [
    { label: 'Total de Bookings', value: summary.totalBookings.toString(), icon: ShoppingBag },
    { label: 'Receita Líquida', value: formatCurrency(summary.netRevenue), icon: DollarSign },
    { label: 'Ticket Médio', value: formatCurrency(summary.avgTicket), icon: Receipt },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Período</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <item.icon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. `apps/web/src/app/(dashboard)/financeiro/components/DateRangeFilter.tsx`

```typescript
'use client';

import type { DateFilter } from '@/hooks/useFinanceiro';

interface Props {
  dateFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}

export function DateRangeFilter({
  dateFilter,
  onFilterChange,
  customStartDate,
  customEndDate,
  onCustomStartChange,
  onCustomEndChange,
}: Props) {
  const filters: { label: string; value: DateFilter }[] = [
    { label: 'Últimos 7 dias', value: '7d' },
    { label: 'Últimos 30 dias', value: '30d' },
    { label: 'Personalizado', value: 'custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              dateFilter === f.value
                ? 'bg-[#FF6B6B] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs — only visible when 'custom' selected */}
      {dateFilter === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-gray-500">até</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

### 5. `apps/web/src/app/(dashboard)/financeiro/components/TransactionTable.tsx`

```typescript
'use client';

import { ExternalLink } from 'lucide-react';
import type { BookingTransaction } from '@/hooks/useFinanceiro';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Map payment status to badge
const statusBadge = (status: string | null) => {
  const map: Record<string, { label: string; className: string }> = {
    approved: { label: 'Pago', className: 'bg-green-100 text-green-800' },
    pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
    rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' },
    refunded: { label: 'Reembolsado', className: 'bg-gray-100 text-gray-800' },
  };
  const s = map[status || ''] || { label: status || 'N/A', className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
};

interface Props {
  transactions: BookingTransaction[];
  loading: boolean;
}

export function TransactionTable({ transactions, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 text-lg">Nenhuma transação no período selecionado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço(s)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Bruto</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão (10%)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Líquido</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((t) => {
              const gross = Number(t.total_amount);
              const commission = Number(t.commission_amount || gross * 0.1);
              const net = gross - commission;

              // Build services string: "Banho (Rex), Tosa (Luna)"
              const servicesStr = t.booking_items
                .map((item) => {
                  const sName = item.service?.name || 'Serviço';
                  const pName = item.pet?.name || '';
                  return pName ? `${sName} (${pName})` : sName;
                })
                .join(', ');

              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(t.booking_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t.tutor?.display_name || 'Tutor'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {servicesStr}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(gross)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">
                    -{formatCurrency(commission)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 text-right">
                    {formatCurrency(net)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {statusBadge(t.payment_status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Files to Modify

### 1. `apps/web/src/app/(dashboard)/financeiro/page.tsx` — REPLACE entirely

```typescript
'use client';

import { ExternalLink } from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useAuth } from '@/hooks/useAuth';
import { RevenueCards } from './components/RevenueCards';
import { SummaryCard } from './components/SummaryCard';
import { DateRangeFilter } from './components/DateRangeFilter';
import { TransactionTable } from './components/TransactionTable';

export default function FinanceiroPage() {
  // Get current petshop from auth context
  // useAuth should return { petshop } with the petshop.id
  const { petshop } = useAuth();
  const petshopId = petshop?.id || '';

  const {
    transactions,
    loading,
    error,
    summary,
    revenueByPeriod,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useFinanceiro(petshopId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
        <a
          href="https://www.mercadopago.com.br/balance/reports"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[#FF6B6B] hover:text-[#e55a5a] font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Ver no Mercado Pago
        </a>
      </div>

      {/* Revenue Cards — always show (not affected by date filter) */}
      <RevenueCards revenue={revenueByPeriod} />

      {/* Date Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Transações</h2>
        <DateRangeFilter
          dateFilter={dateFilter}
          onFilterChange={setDateFilter}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartChange={setCustomStartDate}
          onCustomEndChange={setCustomEndDate}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Transaction Table */}
      <TransactionTable transactions={transactions} loading={loading} />

      {/* Summary Card */}
      {transactions.length > 0 && <SummaryCard summary={summary} />}
    </div>
  );
}
```

## Implementation Order

1. `apps/web/src/hooks/useFinanceiro.ts` — hook with all data logic
2. `apps/web/src/app/(dashboard)/financeiro/components/RevenueCards.tsx`
3. `apps/web/src/app/(dashboard)/financeiro/components/SummaryCard.tsx`
4. `apps/web/src/app/(dashboard)/financeiro/components/DateRangeFilter.tsx`
5. `apps/web/src/app/(dashboard)/financeiro/components/TransactionTable.tsx`
6. `apps/web/src/app/(dashboard)/financeiro/page.tsx` — replace placeholder

## Validation Rules

| Rule | Details |
|------|---------|
| Commission | Always 10% of total_amount. Use commission_amount column if set, fallback to total_amount * 0.1 |
| Net Revenue | total_amount - commission_amount |
| Avg Ticket | grossRevenue / totalBookings (0 if no bookings) |
| Currency | BRL format `R$ 1.234,56` via `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` |
| Date format | `DD/MM/YYYY` (Brazilian convention) |
| Statuses queried | Only `completed`, `confirmed`, `in_progress` — exclude cancelled/no_show/pending_payment |
| Revenue Cards | Always show last 30 days (independent of table filter) |
| Empty state | "Nenhuma transação no período selecionado" |
| Custom dates | Both start and end required before fetching |
| MP link | `https://www.mercadopago.com.br/balance/reports` — opens new tab |

## Dependencies Check

- `useAuth` hook must expose `petshop.id` — check existing hook pattern in `apps/web/src/hooks/useAuth.ts`
- If `useAuth` doesn't return petshop directly, adapt: may need `usePetShop` or read from context
- `supabase` client from `@/lib/supabase` — already exists
- `lucide-react` — already in web dependencies
- No new packages needed

## Testing Checklist

- [ ] Revenue cards show today/week/month NET values
- [ ] Values update when bookings are added
- [ ] 10% commission calculated correctly for each transaction
- [ ] Date filter: 7 days shows only last 7 days
- [ ] Date filter: 30 days shows only last 30 days
- [ ] Date filter: custom dates work with both inputs
- [ ] Transaction table shows all columns (date, tutor, services, gross, commission, net, status)
- [ ] Services column shows "Banho (Rex), Tosa (Luna)" format
- [ ] Empty state message shown when no transactions
- [ ] Summary card shows correct totals
- [ ] Mercado Pago external link opens in new tab
- [ ] Loading skeleton while fetching
- [ ] Error message displayed on fetch failure
- [ ] Currency formatted as BRL (R$)
- [ ] Dates formatted as DD/MM/YYYY

## Git Commit

```
feat: implement financial dashboard IPET-017

- Revenue cards (today/week/month net earnings)
- Transaction table with commission breakdown
- Date range filter (7d, 30d, custom)
- Summary card (bookings, revenue, avg ticket)
- External link to Mercado Pago dashboard
```

## Important Notes

1. **useAuth pattern:** Check how the existing dashboard pages get `petshopId`. The hook might return `{ user, petshop }` or `{ session, profile }`. Adapt the page.tsx import accordingly.
2. **Commission fallback:** Some old bookings might have `commission_amount = 0` (default). Use `commission_amount || total_amount * 0.1` as fallback.
3. **No pagination needed:** Financial data is already filtered by date range. Even 30 days of bookings is manageable in a single table.
4. **Responsive:** Cards use `grid-cols-1 md:grid-cols-3`. Table uses `overflow-x-auto` for mobile.
5. **Revenue cards are independent of filter:** They always show today/week/month regardless of the table's date filter. This avoids confusion.
6. **Tailwind colors:** Primary accent is `#FF6B6B` (used in filter active state and MP link). Rest follows gray palette.
