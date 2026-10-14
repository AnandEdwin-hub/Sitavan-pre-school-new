import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Search,
  Plus,
  Pencil,
  Trash2,
  Target,
  Clock,
  Gift,
  Printer,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
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

interface PledgeRow {
  id: number;
  pledger: string;
  pledged_for: string;
  pledged_amount: number;
  disbursed: number;
  balance_due: number;
}

interface PledgeRecord {
  id: number;
  pledger: string;
  pledged_amount: number;
  email: string | null;
}

interface InKindRow {
  id: number;
  kind: 'material' | 'printing';
  donated_on: string | null;
  donor: string | null;
  item: string;
  uom: string | null;
  quantity: number | null;
  nominal_value: number | null;
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
    queryClient.invalidateQueries({ queryKey: ['fin-pledges'] });
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

function PledgeDialog({
  record,
  onClose,
  onSaved,
}: {
  record: PledgeRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(record.pledger === 'Unassigned' ? '' : record.pledger);
  const [amount, setAmount] = useState(String(record.pledged_amount));
  const [email, setEmail] = useState(record.email ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = Number(amount);
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Check the form', description: 'Please type the donor name.' });
      return;
    }
    if (!(amt >= 0)) {
      toast({ variant: 'destructive', title: 'Check the form', description: 'Please enter a valid pledged amount.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('fin_pledges')
        .update({ pledger: name.trim(), pledged_amount: amt, email: email.trim() || null })
        .eq('id', record.id);
      if (error) throw error;
      // keep the name on the received entries in step with the donor name
      const { error: err2 } = await (supabase as any)
        .from('fin_ledger')
        .update({ party: name.trim() })
        .eq('pledge_id', record.id);
      if (err2) throw err2;
      toast({ title: 'Donor updated' });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: e.message || 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit donor</DialogTitle>
          <DialogDescription>Change the donor name, the amount pledged, or the email.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-name">Donor name</Label>
            <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-amt">Amount pledged (₹)</Label>
            <Input
              id="pl-amt"
              type="number"
              inputMode="decimal"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-email">Email (optional)</Label>
            <Input id="pl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PledgesTab({ rows, isAdmin }: { rows: PledgeRow[]; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PledgeRecord | null>(null);

  const totalPledged = rows.reduce((s, r) => s + num(r.pledged_amount), 0);
  const totalReceived = rows.reduce((s, r) => s + num(r.disbursed), 0);
  const totalDue = totalPledged - totalReceived;

  const openEdit = async (id: number) => {
    const { data, error } = await (supabase as any)
      .from('fin_pledges')
      .select('id,pledger,pledged_amount,email')
      .eq('id', id)
      .single();
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Could not open donor', description: error?.message });
      return;
    }
    setEditing({ ...data, pledged_amount: num(data.pledged_amount) } as PledgeRecord);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['fin-pledges'] });
    queryClient.invalidateQueries({ queryKey: ['fin-pledges-list'] });
    queryClient.invalidateQueries({ queryKey: ['fin-ledger'] });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          title="Total pledged"
          value={totalPledged}
          icon={<Target className="h-5 w-5" />}
          tone="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="Received so far"
          value={totalReceived}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          tone="bg-emerald-100 text-emerald-700"
        />
        <SummaryCard
          title="Still due"
          value={totalDue}
          icon={<Clock className="h-5 w-5" />}
          tone="bg-amber-100 text-amber-700"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead className="whitespace-nowrap">Month covered</TableHead>
                  <TableHead className="text-right">Pledged</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Still due</TableHead>
                  <TableHead className="min-w-[140px]">Progress</TableHead>
                  {isAdmin && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const pledged = num(r.pledged_amount);
                  const received = num(r.disbursed);
                  const pct = pledged > 0 ? Math.min(100, Math.round((received / pledged) * 100)) : 0;
                  const unassigned = r.pledger === 'Unassigned';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {unassigned ? <span className="italic text-muted-foreground">Not assigned yet</span> : r.pledger}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{monthLabel(r.pledged_for)}</TableCell>
                      <TableCell className="text-right">{inr(pledged)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{inr(received)}</TableCell>
                      <TableCell className="text-right">{inr(pledged - received)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-9 text-right text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Edit donor"
                            onClick={() => openEdit(r.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">{inr(totalPledged)}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">{inr(totalReceived)}</TableCell>
                  <TableCell className="text-right font-semibold">{inr(totalDue)}</TableCell>
                  <TableCell />
                  {isAdmin && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <PledgeDialog key={editing.id} record={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function InKindTab({ rows }: { rows: InKindRow[] }) {
  const materials = rows.filter((r) => r.kind === 'material');
  const printing = rows.filter((r) => r.kind === 'printing');

  const groups = useMemo(() => {
    const map = new Map<string, { donor: string; date: string | null; items: InKindRow[] }>();
    for (const r of materials) {
      const key = `${r.donated_on ?? ''}|${r.donor ?? ''}`;
      let g = map.get(key);
      if (!g) {
        g = { donor: r.donor ?? 'Unknown donor', date: r.donated_on, items: [] };
        map.set(key, g);
      }
      g.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }, [materials]);

  const sumValue = (list: InKindRow[]) => list.reduce((s, r) => s + num(r.nominal_value), 0);
  const materialsTotal = sumValue(materials);
  const printingTotal = sumValue(printing);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          title="Materials donated"
          value={materialsTotal}
          icon={<Gift className="h-5 w-5" />}
          tone="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="Printing saved"
          value={printingTotal}
          icon={<Printer className="h-5 w-5" />}
          tone="bg-amber-100 text-amber-700"
        />
        <SummaryCard
          title="Total in-kind value"
          value={materialsTotal + printingTotal}
          icon={<Wallet className="h-5 w-5" />}
          tone="bg-emerald-100 text-emerald-700"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Values are estimates in rupees. Items without a value are shown with a dash.
      </p>

      {groups.map((g) => (
        <Card key={`${g.date}|${g.donor}`}>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="font-semibold">{g.donor}</p>
                <p className="text-xs text-muted-foreground">{g.date ? dateLabel(g.date) : ''}</p>
              </div>
              <p className="text-sm font-semibold">₹ {inr(sumValue(g.items))}</p>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Value (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="min-w-[200px]">{r.item}</TableCell>
                      <TableCell className="text-right">{r.quantity != null ? inr(r.quantity) : '–'}</TableCell>
                      <TableCell>{r.uom ?? ''}</TableCell>
                      <TableCell className="text-right">{r.nominal_value != null ? inr(r.nominal_value) : '–'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {printing.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
              <p className="font-semibold">Printing savings</p>
              <p className="text-sm font-semibold">₹ {inr(printingTotal)}</p>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Pages</TableHead>
                    <TableHead className="text-right">Saved (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printing.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{r.donated_on ? dateLabel(r.donated_on) : ''}</TableCell>
                      <TableCell>{r.donor}</TableCell>
                      <TableCell className="min-w-[200px]">{r.item}</TableCell>
                      <TableCell className="text-right">{r.quantity != null ? inr(r.quantity) : '–'}</TableCell>
                      <TableCell className="text-right">{r.nominal_value != null ? inr(r.nominal_value) : '–'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportsTab({ ledger, inKind }: { ledger: LedgerRow[]; inKind: InKindRow[] }) {
  const periods = useMemo(() => Array.from(new Set(ledger.map((r) => r.period))).sort(), [ledger]);
  const [from, setFrom] = useState(periods[0] ?? '');
  const [to, setTo] = useState(periods[periods.length - 1] ?? '');

  const a = from <= to ? from : to;
  const b = from <= to ? to : from;
  const label = a === b ? monthLabel(a) : `${monthLabel(a)} – ${monthLabel(b)}`;

  const st = useMemo(() => {
    const inRange = ledger.filter((r) => r.period >= a && r.period <= b);
    const opening = ledger
      .filter((r) => r.period < a)
      .reduce((sum, r) => sum + num(r.credit) - num(r.expense), 0);
    const received = inRange
      .filter((r) => r.entry_type === 'credit')
      .sort((x, y) => x.entry_date.localeCompare(y.entry_date) || x.id - y.id);
    const expenses = inRange
      .filter((r) => r.entry_type === 'expense')
      .sort((x, y) => x.entry_date.localeCompare(y.entry_date) || x.id - y.id);
    const totalReceived = received.reduce((sum, r) => sum + num(r.credit), 0);
    const totalSpent = expenses.reduce((sum, r) => sum + num(r.expense), 0);

    const catMap = new Map<string, number>();
    for (const r of expenses) {
      const k = r.category ?? 'Other';
      catMap.set(k, (catMap.get(k) ?? 0) + num(r.expense));
    }
    const byCategory = Array.from(catMap.entries()).sort((x, y) => y[1] - x[1]);

    const endOfRange = a
      ? new Date(new Date(`${b}T00:00:00`).getFullYear(), new Date(`${b}T00:00:00`).getMonth() + 1, 0).toLocaleDateString('en-CA')
      : '';
    const inKindRows = inKind.filter((r) => r.donated_on && r.donated_on >= a && r.donated_on <= endOfRange);
    const kindMap = new Map<string, { date: string; donor: string; count: number; label: string; value: number }>();
    for (const r of inKindRows) {
      const key = r.kind === 'material' ? `m|${r.donated_on}|${r.donor}` : `p|${r.id}`;
      const g = kindMap.get(key);
      if (g) {
        g.value += num(r.nominal_value);
        g.count += 1;
      } else {
        kindMap.set(key, {
          date: r.donated_on ?? '',
          donor: r.donor ?? '',
          count: 1,
          label: r.kind === 'printing' ? `Printing: ${r.item}` : '',
          value: num(r.nominal_value),
        });
      }
    }
    const kindList = Array.from(kindMap.values())
      .map((g) => ({
        date: g.date,
        donor: g.donor,
        text: g.label || `${g.count} ${g.count === 1 ? 'item' : 'items'}`,
        value: g.value,
      }))
      .sort((x, y) => x.date.localeCompare(y.date));
    const kindTotal = kindList.reduce((sum, g) => sum + g.value, 0);

    return {
      opening,
      received,
      expenses,
      totalReceived,
      totalSpent,
      closing: opening + totalReceived - totalSpent,
      byCategory,
      kindList,
      kindTotal,
    };
  }, [ledger, inKind, a, b]);

  const printPdf = () => {
    const prev = document.title;
    document.title = `Sitavan Pre-School Statement ${label}`;
    const restore = () => {
      document.title = prev;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const summary = [
      ['Sitavan Pre-School, Mount Abu'],
      ['Statement of receipts and expenses'],
      [label],
      [],
      ['Opening balance', st.opening],
      ['Money received', st.totalReceived],
      ['Money spent', st.totalSpent],
      ['Closing balance', st.closing],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const recRows = st.received.map((r) => [dateLabel(r.entry_date), r.party ?? '', r.description ?? '', num(r.credit)]);
    const wsRec = XLSX.utils.aoa_to_sheet([
      ['Date', 'Received from', 'Note', 'Amount'],
      ...recRows,
      ['', '', 'Total', st.totalReceived],
    ]);
    wsRec['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsRec, 'Received');

    const expRows = st.expenses.map((r) => [dateLabel(r.entry_date), r.description ?? '', r.category ?? '', num(r.expense)]);
    const wsExp = XLSX.utils.aoa_to_sheet([
      ['Date', 'Description', 'Category', 'Amount'],
      ...expRows,
      ['', '', 'Total', st.totalSpent],
    ]);
    wsExp['!cols'] = [{ wch: 14 }, { wch: 70 }, { wch: 24 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

    const catRows = st.byCategory.map(([name, amt]) => [
      name,
      amt,
      st.totalSpent ? Number(((amt / st.totalSpent) * 100).toFixed(1)) : 0,
    ]);
    const wsCat = XLSX.utils.aoa_to_sheet([['Category', 'Amount', '% of spending'], ...catRows, ['Total', st.totalSpent, 100]]);
    wsCat['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'By category');

    if (st.kindList.length > 0) {
      const wsKind = XLSX.utils.aoa_to_sheet([
        ['Date', 'Donor', 'Details', 'Estimated value'],
        ...st.kindList.map((g) => [dateLabel(g.date), g.donor, g.text, g.value]),
        ['', '', 'Total', st.kindTotal],
      ]);
      wsKind['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 50 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsKind, 'In-kind');
    }

    XLSX.writeFile(wb, `Sitavan_Statement_${a.slice(0, 7)}_to_${b.slice(0, 7)}.xlsx`);
  };

  const rupee = (n: number) => `₹ ${inr(n)}`;
  const th = 'border-b border-gray-400 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide';
  const td = 'border-b border-gray-200 px-2 py-1.5 align-top';

  return (
    <div className="space-y-4">
      <style>{`@media print { .md\\:pl-64 { padding-left: 0 !important; } @page { size: A4; margin: 12mm; } }`}</style>

      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rep-from">From month</Label>
          <select id="rep-from" className={`${selectClass} sm:w-auto`} value={from} onChange={(e) => setFrom(e.target.value)}>
            {periods.map((p) => (
              <option key={p} value={p}>
                {monthLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-to">To month</Label>
          <select id="rep-to" className={`${selectClass} sm:w-auto`} value={to} onChange={(e) => setTo(e.target.value)}>
            {periods.map((p) => (
              <option key={p} value={p}>
                {monthLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={printPdf}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={exportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </div>
      <p className="no-print text-xs text-muted-foreground">
        For the PDF, a print window opens. Choose <strong>Save as PDF</strong> as the printer, then Save.
      </p>

      <div className="rounded-lg border bg-white p-6 text-sm text-black print:rounded-none print:border-0 print:p-0">
        <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-4">
          <img src="/logo.png" alt="Sitavan Pre-School" className="h-16 w-16 object-contain" />
          <div>
            <h2 className="text-xl font-bold">Sitavan Pre-School, Mount Abu</h2>
            <p className="font-medium">Statement of receipts and expenses</p>
            <p className="text-gray-600">{label}</p>
          </div>
        </div>

        <table className="mt-4 w-full max-w-md">
          <tbody>
            <tr>
              <td className={td}>Opening balance</td>
              <td className={`${td} text-right`}>{rupee(st.opening)}</td>
            </tr>
            <tr>
              <td className={td}>Money received</td>
              <td className={`${td} text-right`}>{rupee(st.totalReceived)}</td>
            </tr>
            <tr>
              <td className={td}>Money spent</td>
              <td className={`${td} text-right`}>{rupee(st.totalSpent)}</td>
            </tr>
            <tr className="font-bold">
              <td className="px-2 py-2">Closing balance</td>
              <td className="px-2 py-2 text-right">{rupee(st.closing)}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mb-1 mt-6 font-bold">Money received</h3>
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Received from</th>
              <th className={th}>Note</th>
              <th className={`${th} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {st.received.length === 0 && (
              <tr>
                <td colSpan={4} className={`${td} text-gray-500`}>
                  Nothing received in this period.
                </td>
              </tr>
            )}
            {st.received.map((r) => (
              <tr key={r.id} className="break-inside-avoid">
                <td className={`${td} whitespace-nowrap`}>{dateLabel(r.entry_date)}</td>
                <td className={td}>{r.party}</td>
                <td className={td}>{r.description}</td>
                <td className={`${td} text-right`}>{inr(r.credit)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td colSpan={3} className="px-2 py-1.5">
                Total received
              </td>
              <td className="px-2 py-1.5 text-right">{inr(st.totalReceived)}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mb-1 mt-6 font-bold">Spending by category</h3>
        <table className="w-full max-w-lg">
          <thead>
            <tr>
              <th className={th}>Category</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={`${th} text-right`}>%</th>
            </tr>
          </thead>
          <tbody>
            {st.byCategory.map(([name, amt]) => (
              <tr key={name} className="break-inside-avoid">
                <td className={td}>{name}</td>
                <td className={`${td} text-right`}>{inr(amt)}</td>
                <td className={`${td} text-right`}>
                  {st.totalSpent ? ((amt / st.totalSpent) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="px-2 py-1.5">Total spent</td>
              <td className="px-2 py-1.5 text-right">{inr(st.totalSpent)}</td>
              <td />
            </tr>
          </tbody>
        </table>

        {st.kindList.length > 0 && (
          <>
            <h3 className="mb-1 mt-6 font-bold">Donations in kind (estimated value)</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Donor</th>
                  <th className={th}>Details</th>
                  <th className={`${th} text-right`}>Value</th>
                </tr>
              </thead>
              <tbody>
                {st.kindList.map((g, i) => (
                  <tr key={i} className="break-inside-avoid">
                    <td className={`${td} whitespace-nowrap`}>{dateLabel(g.date)}</td>
                    <td className={td}>{g.donor}</td>
                    <td className={td}>{g.text}</td>
                    <td className={`${td} text-right`}>{g.value ? inr(g.value) : '–'}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={3} className="px-2 py-1.5">
                    Total value
                  </td>
                  <td className="px-2 py-1.5 text-right">{inr(st.kindTotal)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <h3 className="mb-1 mt-6 font-bold">All expenses</h3>
        <table className="w-full">
          <thead className="print:table-header-group">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Description</th>
              <th className={th}>Category</th>
              <th className={`${th} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {st.expenses.map((r) => (
              <tr key={r.id} className="break-inside-avoid">
                <td className={`${td} whitespace-nowrap`}>{dateLabel(r.entry_date)}</td>
                <td className={td}>{r.description}</td>
                <td className={`${td} whitespace-nowrap`}>{r.category}</td>
                <td className={`${td} text-right`}>{inr(r.expense)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td colSpan={3} className="px-2 py-1.5">
                Total spent
              </td>
              <td className="px-2 py-1.5 text-right">{inr(st.totalSpent)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-12 flex justify-between gap-8 break-inside-avoid">
          <div className="w-1/2 border-t border-gray-800 pt-1 text-xs">Prepared by (name and signature)</div>
          <div className="w-1/2 border-t border-gray-800 pt-1 text-xs">Approved by (name and signature)</div>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Generated on {dateLabel(todayStr())}. Amounts are in Indian rupees (₹).
        </p>
      </div>
    </div>
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
  const pledgeRows = useQuery({
    queryKey: ['fin-pledges'],
    queryFn: () => fetchView<PledgeRow>('fin_pledges_v', 'pledged_for'),
  });
  const inKind = useQuery({
    queryKey: ['fin-in-kind'],
    queryFn: () => fetchView<InKindRow>('fin_in_kind_v', 'id'),
  });

  if (ledger.isLoading || overview.isLoading || pledgeRows.isLoading || inKind.isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Loading finance data...</div>;
  }

  if (ledger.error || overview.error || pledgeRows.error || inKind.error) {
    const err = (ledger.error || overview.error || pledgeRows.error || inKind.error) as Error;
    return (
      <div className="py-16 text-center text-destructive">
        Could not load finance data. {err.message}
      </div>
    );
  }

  return (
    <Tabs defaultValue="ledger" className="space-y-4">
      <TabsList className="no-print">
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="pledges">Pledges</TabsTrigger>
        <TabsTrigger value="inkind">In-kind</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
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
      <TabsContent value="pledges">
        <PledgesTab rows={pledgeRows.data ?? []} isAdmin={isAdmin} />
      </TabsContent>
      <TabsContent value="inkind">
        <InKindTab rows={inKind.data ?? []} />
      </TabsContent>
      <TabsContent value="reports">
        <ReportsTab ledger={ledger.data ?? []} inKind={inKind.data ?? []} />
      </TabsContent>
    </Tabs>
  );
}
