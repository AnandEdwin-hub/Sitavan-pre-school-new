import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

interface LedgerRecord {
  id: number;
  entry_date: string;
  period: string;
  entry_type: 'credit' | 'expense';
  amount: number;
  description: string | null;
  party: string | null;
  category_id: number | null;
  pledge_id: number | null;
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

interface Pledge {
  id: number;
  pledger: string;
  pledged_for: string;
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

const NEW = '__new__';

const todayStr = () => new Date().toLocaleDateString('en-CA');

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function EntryDialog({
  initial,
  categories,
  pledges,
  onClose,
  onSaved,
}: {
  initial: LedgerRecord | null;
  categories: Category[];
  pledges: Pledge[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [type, setType] = useState<'expense' | 'credit'>(initial?.entry_type ?? 'expense');
  const [date, setDate] = useState(initial?.entry_date ?? todayStr());
  const [month, setMonth] = useState((initial?.period ?? todayStr()).slice(0, 7));
  const [monthTouched, setMonthTouched] = useState(isEdit);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ? String(initial.category_id) : '');
  const [pledgeId, setPledgeId] = useState(initial?.pledge_id ? String(initial.pledge_id) : '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAsset, setNewCategoryAsset] = useState(false);
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorAmount, setNewDonorAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Donor names only; the month is shown only when the same name has more than one pledge.
  const pledgeOptions = useMemo(() => {
    const real = pledges.filter((p) => p.pledger !== 'Unassigned' || String(p.id) === pledgeId);
    const counts: Record<string, number> = {};
    real.forEach((p) => {
      counts[p.pledger] = (counts[p.pledger] ?? 0) + 1;
    });
    return real.map((p) => ({
      id: p.id,
      label: counts[p.pledger] > 1 ? `${p.pledger} (${monthLabel(p.pledged_for)})` : p.pledger,
    }));
  }, [pledges, pledgeId]);

  const fail = (msg: string) => toast({ variant: 'destructive', title: 'Check the form', description: msg });

  const save = async () => {
    const amt = Number(amount);
    if (!date) return fail('Please choose the date.');
    if (!month) return fail('Please choose the month this entry belongs to.');
    if (!(amt > 0)) return fail('Please enter an amount greater than 0.');
    if (type === 'expense') {
      if (!description.trim()) return fail('Please describe what the money was spent on.');
      if (!categoryId) return fail('Please choose a category.');
      if (categoryId === NEW && !newCategoryName.trim()) return fail('Please type the name of the new category.');
    } else {
      if (!pledgeId) return fail('Please choose who the money was received from.');
      if (pledgeId === NEW && !newDonorName.trim()) return fail('Please type the name of the new donor.');
    }

    setSaving(true);
    let createdCategoryId: number | null = null;
    let createdPledgeId: number | null = null;
    try {
      let catId: number | null = null;
      if (type === 'expense') {
        if (categoryId === NEW) {
          const name = newCategoryName.trim();
          const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            catId = existing.id;
          } else {
            const maxSort = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
            const { data, error } = await (supabase as any)
              .from('fin_categories')
              .insert({ name, is_asset: newCategoryAsset, sort_order: maxSort + 10 })
              .select('id')
              .single();
            if (error) throw error;
            catId = data.id as number;
            createdCategoryId = catId;
          }
        } else {
          catId = Number(categoryId);
        }
      }

      let pId: number | null = null;
      let partyName: string | null = null;
      if (type === 'credit') {
        if (pledgeId === NEW) {
          const name = newDonorName.trim();
          const { data, error } = await (supabase as any)
            .from('fin_pledges')
            .insert({
              pledger: name,
              pledged_for: `${month}-01`,
              pledged_amount: Number(newDonorAmount) > 0 ? Number(newDonorAmount) : 0,
              pledged_on: todayStr(),
            })
            .select('id')
            .single();
          if (error) throw error;
          pId = data.id as number;
          createdPledgeId = pId;
          partyName = name;
        } else {
          pId = Number(pledgeId);
          partyName = pledges.find((p) => String(p.id) === pledgeId)?.pledger ?? null;
        }
      }

      const payload = {
        entry_date: date,
        period: `${month}-01`,
        entry_type: type,
        amount: amt,
        description: description.trim() || null,
        party: type === 'credit' ? partyName : null,
        category_id: type === 'expense' ? catId : null,
        pledge_id: type === 'credit' ? pId : null,
      };

      const table = (supabase as any).from('fin_ledger');
      const { error } = isEdit
        ? await table.update(payload).eq('id', initial!.id)
        : await table.insert(payload);
      if (error) throw error;
      toast({ title: isEdit ? 'Entry updated' : 'Entry added' });
      onSaved();
      onClose();
    } catch (e: any) {
      // Undo anything created for this entry so no empty category or donor is left behind.
      if (createdCategoryId != null) await (supabase as any).from('fin_categories').delete().eq('id', createdCategoryId);
      if (createdPledgeId != null) await (supabase as any).from('fin_pledges').delete().eq('id', createdPledgeId);
      toast({ variant: 'destructive', title: 'Could not save', description: e.message || 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit entry' : 'Add entry'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Change the details and save.' : 'Record money spent or money received.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'credit'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? 'default' : 'outline'}
                disabled={isEdit && type !== t}
                onClick={() => setType(t)}
              >
                {t === 'expense' ? 'Money spent' : 'Money received'}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-date">Date</Label>
              <Input
                id="fin-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (!monthTouched && e.target.value) setMonth(e.target.value.slice(0, 7));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-month">Belongs to month</Label>
              <Input
                id="fin-month"
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setMonthTouched(true);
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fin-amount">Amount (₹)</Label>
            <Input
              id="fin-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {type === 'expense' ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fin-desc">What was it for?</Label>
                <Input
                  id="fin-desc"
                  placeholder="e.g. Milk 4 Litres"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fin-cat">Category</Label>
                <select
                  id="fin-cat"
                  className={selectClass}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={NEW}>+ Add new category…</option>
                </select>
              </div>
              {categoryId === NEW && (
                <div className="space-y-3 rounded-md border border-dashed p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fin-newcat">New category name</Label>
                    <Input
                      id="fin-newcat"
                      placeholder="e.g. Medical"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={newCategoryAsset}
                      onChange={(e) => setNewCategoryAsset(e.target.checked)}
                    />
                    This is a long-lasting item (asset), like furniture or equipment
                  </label>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fin-pledger">Received from</Label>
                <select
                  id="fin-pledger"
                  className={selectClass}
                  value={pledgeId}
                  onChange={(e) => setPledgeId(e.target.value)}
                >
                  <option value="">Choose who paid</option>
                  {pledgeOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value={NEW}>+ New donor…</option>
                </select>
              </div>
              {pledgeId === NEW && (
                <div className="space-y-3 rounded-md border border-dashed p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fin-newdonor">Donor name</Label>
                    <Input
                      id="fin-newdonor"
                      placeholder="Full name"
                      value={newDonorName}
                      onChange={(e) => setNewDonorName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fin-newdonor-amt">Amount they have pledged (₹, optional)</Label>
                    <Input
                      id="fin-newdonor-amt"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Leave blank if not known"
                      value={newDonorAmount}
                      onChange={(e) => setNewDonorAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Their pledge will be saved for {month ? monthLabel(`${month}-01`) : 'the month above'}.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="fin-note">Note (optional)</Label>
                <Input
                  id="fin-note"
                  placeholder="e.g. GPAY"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

function LedgerTab({
  rows,
  isAdmin,
  categoryOptions,
  pledges,
}: {
  rows: LedgerRow[];
  isAdmin: boolean;
  categoryOptions: Category[];
  pledges: Pledge[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ record: LedgerRecord | null } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['fin-ledger'] });
    queryClient.invalidateQueries({ queryKey: ['fin-overview'] });
    queryClient.invalidateQueries({ queryKey: ['fin-categories'] });
    queryClient.invalidateQueries({ queryKey: ['fin-pledges-list'] });
  };

  const openEdit = async (id: number) => {
    const { data, error } = await (supabase as any).from('fin_ledger').select('*').eq('id', id).single();
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not open entry', description: error?.message });
      return;
    }
    setDialog({ record: { ...data, amount: num(data.amount) } as LedgerRecord });
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    const { error } = await (supabase as any).from('fin_ledger').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not delete', description: error.message });
      return;
    }
    toast({ title: 'Entry deleted' });
    refresh();
  };

  const colCount = isAdmin ? 7 : 6;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setDialog({ record: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Add entry
          </Button>
        </div>
      )}

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
        <select className={`${selectClass} sm:w-auto`} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <select className={`${selectClass} sm:w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
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
                  {isAdmin && <TableHead className="w-[90px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={colCount} className="py-10 text-center text-muted-foreground">
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
                    {isAdmin && (
                      <TableCell className="whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Edit entry"
                          onClick={() => openEdit(r.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete entry"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
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
                  {isAdmin && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {dialog && (
        <EntryDialog
          key={dialog.record?.id ?? 'new'}
          initial={dialog.record}
          categories={categoryOptions}
          pledges={pledges}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      )}

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry and changes the balance. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const { isAdmin } = useAuth();
  const categoriesQuery = useQuery({
    queryKey: ['fin-categories'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fin_categories')
        .select('id,name,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
  const pledgesQuery = useQuery({
    queryKey: ['fin-pledges-list'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fin_pledges')
        .select('id,pledger,pledged_for')
        .order('pledged_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pledge[];
    },
  });
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
        <LedgerTab
          rows={ledger.data ?? []}
          isAdmin={isAdmin}
          categoryOptions={categoriesQuery.data ?? []}
          pledges={pledgesQuery.data ?? []}
        />
      </TabsContent>
      <TabsContent value="overview">
        <OverviewTab rows={overview.data ?? []} />
      </TabsContent>
    </Tabs>
  );
}
