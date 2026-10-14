import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LedgerRow {
  id: number;
  entry_date: string;
  period: string;
  entry_type: 'credit' | 'expense';
  credit: number | null;
  expense: number | null;
  description: string | null;
  party: string | null;
  category: string | null;
  balance: number;
}

interface OverviewRow {
  period: string;
  entry_type: 'credit' | 'expense';
  category: string;
  is_asset: boolean;
  sort_order: number;
  total: number;
}

// The finance views are not in the generated types, so they are read through an untyped call.
async function fetchView<T>(view: string, orderBy: string): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await (supabase as any)
    .from(view)
    .select('*')
    .order(orderBy, { ascending: true });
  if (error) throw error;
  return (data ?? []) as T[];
}

const num = (n: number | string | null | undefined) => Number(n ?? 0);

const inr = (n: number | string | null | undefined) =>
  n == null ? '' : num(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const monthLabel = (period: string) =>
  new Date(`${period}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

const dateLabel = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function SummaryCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-full p-2.5 ${tone}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">₹ {inr(value)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerTab({ rows }: { rows: LedgerRow[] }) {
  const [month, setMonth] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.period))).sort(), [rows]);
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category).filter((c): c is string => !!c))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (month !== 'all' && r.period !== month) return false;
      if (category === 'credits') {
        if (r.entry_type !== 'credit') return false;
      } else if (category !== 'all' && r.category !== category) {
        return false;
      }
      if (q) {
        const text = `${r.description ?? ''} ${r.party ?? ''} ${r.category ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [rows, month, category, search]);

  const received = filtered.reduce((s, r) => s + num(r.credit), 0);
  const spent = filtered.reduce((s, r) => s + num(r.expense), 0);
  const isAll = month === 'all' && category === 'all' && !search.trim();

  const selectClass =
    'h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          title="Received"
          value={received}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          tone="bg-emerald-100 text-emerald-700"
        />
        <SummaryCard
          title="Spent"
          value={spent}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          tone="bg-amber-100 text-amber-700"
        />
        <SummaryCard
          title={isAll ? 'Balance' : 'Net (selection)'}
          value={received - spent}
          icon={<Wallet className="h-5 w-5" />}
          tone="bg-primary/10 text-primary"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          <option value="credits">Money received</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search description or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[65vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No entries match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{dateLabel(r.entry_date)}</TableCell>
                    <TableCell className="min-w-[260px]">
                      {r.entry_type === 'credit'
                        ? [r.party, r.description].filter(Boolean).join(' · ')
                        : r.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.category ?? 'Money received'}</TableCell>
                    <TableCell className="text-right text-emerald-700">{inr(r.credit)}</TableCell>
                    <TableCell className="text-right">{inr(r.expense)}</TableCell>
                    <TableCell className="text-right font-medium">{inr(r.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">
                    Total ({filtered.length} entries)
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">{inr(received)}</TableCell>
                  <TableCell className="text-right font-semibold">{inr(spent)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewTab({ rows }: { rows: OverviewRow[] }) {
  const periods = useMemo(() => Array.from(new Set(rows.map((r) => r.period))).sort(), [rows]);

  const { categories, spentByPeriod, receivedByPeriod, grandSpent } = useMemo(() => {
    const map = new Map<string, { name: string; isAsset: boolean; sort: number; byPeriod: Record<string, number>; total: number }>();
    const spentBy: Record<string, number> = {};
    const receivedBy: Record<string, number> = {};
    let grand = 0;
    for (const r of rows) {
      const t = num(r.total);
      if (r.entry_type === 'credit') {
        receivedBy[r.period] = (receivedBy[r.period] ?? 0) + t;
        continue;
      }
      let c = map.get(r.category);
      if (!c) {
        c = { name: r.category, isAsset: r.is_asset, sort: r.sort_order, byPeriod: {}, total: 0 };
        map.set(r.category, c);
      }
      c.byPeriod[r.period] = (c.byPeriod[r.period] ?? 0) + t;
      c.total += t;
      spentBy[r.period] = (spentBy[r.period] ?? 0) + t;
      grand += t;
    }
    return {
      categories: Array.from(map.values()).sort((a, b) => a.sort - b.sort),
      spentByPeriod: spentBy,
      receivedByPeriod: receivedBy,
      grandSpent: grand,
    };
  }, [rows]);

  const grandReceived = Object.values(receivedByPeriod).reduce((s, v) => s + v, 0);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[170px] bg-card">Category</TableHead>
                {periods.map((p) => (
                  <TableHead key={p} className="whitespace-nowrap text-right">
                    {monthLabel(p)}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="sticky left-0 bg-card font-medium">
                    {c.name}
                    {c.isAsset && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        asset
                      </span>
                    )}
                  </TableCell>
                  {periods.map((p) => (
                    <TableCell key={p} className="text-right">
                      {c.byPeriod[p] ? inr(c.byPeriod[p]) : '–'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{inr(c.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {grandSpent ? ((c.total / grandSpent) * 100).toFixed(1) : '0.0'}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="sticky left-0 bg-muted font-semibold">Total spent</TableCell>
                {periods.map((p) => (
                  <TableCell key={p} className="text-right font-semibold">
                    {inr(spentByPeriod[p] ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold">{inr(grandSpent)}</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell className="sticky left-0 bg-muted font-semibold text-emerald-700">Received</TableCell>
                {periods.map((p) => (
                  <TableCell key={p} className="text-right font-semibold text-emerald-700">
                    {inr(receivedByPeriod[p] ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold text-emerald-700">{inr(grandReceived)}</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell className="sticky left-0 bg-muted font-semibold">Net</TableCell>
                {periods.map((p) => (
                  <TableCell key={p} className="text-right font-semibold">
                    {inr((receivedByPeriod[p] ?? 0) - (spentByPeriod[p] ?? 0))}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold">{inr(grandReceived - grandSpent)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Finance() {
  const ledger = useQuery({
    queryKey: ['fin-ledger'],
    queryFn: () => fetchView<LedgerRow>('fin_ledger_v', 'id'),
  });
  const overview = useQuery({
    queryKey: ['fin-overview'],
    queryFn: () => fetchView<OverviewRow>('fin_overview_v', 'period'),
  });

  if (ledger.isLoading || overview.isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Loading finance data...</div>;
  }

  if (ledger.error || overview.error) {
    const err = (ledger.error || overview.error) as Error;
    return (
      <div className="py-16 text-center text-destructive">
        Could not load finance data. {err.message}
      </div>
    );
  }

  return (
    <Tabs defaultValue="ledger" className="space-y-4">
      <TabsList>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>
      <TabsContent value="ledger">
        <LedgerTab rows={ledger.data ?? []} />
      </TabsContent>
      <TabsContent value="overview">
        <OverviewTab rows={overview.data ?? []} />
      </TabsContent>
    </Tabs>
  );
}
