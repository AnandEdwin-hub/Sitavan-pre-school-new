import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TimeInput from '@/components/TimeInput';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

type Role = 'student' | 'staff' | 'volunteer';
type Timing = { start: string; lateMins: number; veryLateMins: number; close: string };
type Props = { defaults: Record<Role, Timing> };

const LE = '\u2264';
const DASH = '\u2013';
const DOT = '\u00B7';
const ROLE_LABEL: Record<Role, string> = { student: 'Students', staff: 'Staff', volunteer: 'Volunteers' };
const ROLE_TABLE: Record<Role, string> = { student: 'students', staff: 'staff', volunteer: 'volunteers' };

const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const addMins = (t: string, mins: number) => {
  const total = (((toMins(t) + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const diffMins = (from: string, to: string) => toMins(to) - toMins(from);
const fmt12 = (t: string) => {
  const [h, m] = t.split(':');
  return `${Number(h) % 12 || 12}:${m} ${Number(h) >= 12 ? 'PM' : 'AM'}`;
};

export default function IndividualTimings({ defaults }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const todayStr = new Date().toLocaleDateString('en-CA');

  const [role, setRole] = useState<Role>('staff');
  const [search, setSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [start, setStart] = useState(defaults.staff.start);
  const [lateMins, setLateMins] = useState(defaults.staff.lateMins);
  const [veryLateMins, setVeryLateMins] = useState(defaults.staff.veryLateMins);
  const [close, setClose] = useState(defaults.staff.close);
  const [validUntil, setValidUntil] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: allPeople } = useQuery({
    queryKey: ['override-all-people'],
    queryFn: async () => {
      const empty = { student: [], staff: [], volunteer: [] } as Record<Role, { id: string; full_name: string }[]>;
      if (!isSupabaseConfigured) return empty;
      const sb: any = supabase;
      const roles: Role[] = ['student', 'staff', 'volunteer'];
      const results = await Promise.all(
        roles.map((r) => sb.from(ROLE_TABLE[r]).select('id, full_name').eq('status', 'Active').order('full_name'))
      );
      roles.forEach((r, i) => { empty[r] = results[i].data ?? []; });
      return empty;
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['attendance-overrides'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await (supabase as any).from('attendance_overrides').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const people = allPeople?.[role] ?? [];
  const nameOf = (r: Role, id: string) => allPeople?.[r]?.find((p) => p.id === id)?.full_name ?? 'Unknown';
  const filtered = people.filter((p) => p.full_name.toLowerCase().includes(search.trim().toLowerCase()));

  const applyTiming = (t: Timing, vu = '', n = '') => {
    setStart(t.start); setLateMins(t.lateMins); setVeryLateMins(t.veryLateMins); setClose(t.close);
    setValidUntil(vu); setNote(n);
  };

  const changeRole = (r: Role) => {
    setRole(r); setPersonId(''); setSearch('');
    applyTiming(defaults[r]);
  };

  const pickPerson = (id: string, r: Role = role) => {
    setPersonId(id);
    const ex = overrides.find((o: any) => o.person_type === r && o.person_id === id);
    if (ex) {
      applyTiming(
        { start: String(ex.start_time).slice(0, 5), lateMins: ex.late_threshold_minutes, veryLateMins: ex.very_late_threshold_minutes, close: String(ex.attendance_close_time).slice(0, 5) },
        ex.valid_until ?? '', ex.note ?? ''
      );
    } else {
      applyTiming(defaults[r]);
    }
  };

  const editOverride = (o: any) => {
    setRole(o.person_type); setSearch('');
    setPersonId(o.person_id);
    applyTiming(
      { start: String(o.start_time).slice(0, 5), lateMins: o.late_threshold_minutes, veryLateMins: o.very_late_threshold_minutes, close: String(o.attendance_close_time).slice(0, 5) },
      o.valid_until ?? '', o.note ?? ''
    );
  };

  const save = async () => {
    if (!personId) {
      toast({ variant: 'destructive', title: 'Select a person first' });
      return;
    }
    if (lateMins < 0 || veryLateMins <= lateMins) {
      toast({ variant: 'destructive', title: 'Check times', description: '"Present until" cannot be before the start time, and "Late until" must be after "Present until".' });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await (supabase as any).from('attendance_overrides').upsert(
        {
          person_type: role,
          person_id: personId,
          start_time: start,
          late_threshold_minutes: lateMins,
          very_late_threshold_minutes: veryLateMins,
          attendance_close_time: close,
          valid_until: validUntil || null,
          note: note.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'person_type,person_id' }
      );
      if (error) throw error;
      toast({ title: 'Individual timing saved', description: nameOf(role, personId) });
      queryClient.invalidateQueries({ queryKey: ['attendance-overrides'] });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (o: any) => {
    const { error } = await (supabase as any).from('attendance_overrides').delete().eq('id', o.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }
    toast({ title: 'Back to default timing', description: nameOf(o.person_type, o.person_id) });
    if (o.person_id === personId) pickPerson(personId, o.person_type);
    queryClient.invalidateQueries({ queryKey: ['attendance-overrides'] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Individual Timings</CardTitle>
        <CardDescription>Give a specific person their own timing. Everyone else keeps the rules above.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={role} onValueChange={(v) => changeRole(v as Role)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Search name</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Person</Label>
          <Select value={personId} onValueChange={(v) => pickPerson(v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a person" /></SelectTrigger>
            <SelectContent>
              {filtered.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {personId && (
          <>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Label className="font-semibold">Start Time</Label>
              <TimeInput value={start} onChange={setStart} />
            </div>

            <div className="rounded-lg border border-l-4 border-l-green-500 bg-green-50/60 p-3 space-y-2">
              <Label className="font-semibold text-green-800">{`P ${DASH} Present (${LE} ${lateMins} min)`}</Label>
              <TimeInput value={addMins(start, lateMins)} onChange={(t) => setLateMins(diffMins(start, t))} />
            </div>

            <div className="rounded-lg border border-l-4 border-l-amber-500 bg-amber-50/60 p-3 space-y-2">
              <Label className="font-semibold text-amber-800">{`L ${DASH} Late (${LE} ${veryLateMins} min)`}</Label>
              <TimeInput value={addMins(start, veryLateMins)} onChange={(t) => setVeryLateMins(diffMins(start, t))} />
            </div>

            <div className="rounded-lg border border-l-4 border-l-red-500 bg-red-50/60 p-3 space-y-1">
              <Label className="font-semibold text-red-800">{`LL ${DASH} Very Late (more than ${veryLateMins} min)`}</Label>
              <p className="text-xs text-muted-foreground">{`Any scan after ${fmt12(addMins(start, veryLateMins))} until the window closes.`}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Label className="font-semibold">Attendance Window Closes</Label>
              <TimeInput value={close} onChange={setClose} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valid until (optional)</Label>
                <Input type="date" min={todayStr} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Morning shift" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave "Valid until" empty to keep this timing until you remove it.</p>

            <Button onClick={save} disabled={isSaving} className="w-full">
              {isSaving ? 'Saving...' : 'Save Individual Timing'}
            </Button>
          </>
        )}

        <div className="pt-2 space-y-2">
          <Label className="font-semibold">People with custom timing</Label>
          {overrides.length === 0 && <p className="text-xs text-muted-foreground">No one yet. Everyone follows the default rules.</p>}
          {overrides.map((o: any) => {
            const expired = o.valid_until && o.valid_until < todayStr;
            return (
              <div key={o.id} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${expired ? 'opacity-50' : ''}`}>
                <div className="text-sm">
                  <p className="font-semibold">{nameOf(o.person_type, o.person_id)} <span className="text-xs font-normal text-muted-foreground">{`(${ROLE_LABEL[o.person_type as Role]})`}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {`${fmt12(String(o.start_time).slice(0, 5))} ${DOT} P ${LE} ${o.late_threshold_minutes} ${DOT} L ${LE} ${o.very_late_threshold_minutes} ${DOT} closes ${fmt12(String(o.attendance_close_time).slice(0, 5))}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {expired ? `Expired ${o.valid_until}` : o.valid_until ? `Until ${o.valid_until}` : 'No end date'}
                    {o.note ? ` ${DOT} ${o.note}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => editOverride(o)}>Edit</Button>
                  <Button size="sm" variant="secondary" onClick={() => remove(o)}>Remove</Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}