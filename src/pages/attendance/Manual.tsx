import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Calendar as CalendarIcon } from 'lucide-react';
import { AttendanceStatus } from '@/types/database';

type ViewType = 'students' | 'staff' | 'volunteers';

interface PersonRow {
  id: string;
  code: string;
  full_name: string;
  subtitle: string;
}

interface LocalEntry {
  status: string;
  notes: string;
}

const STUDENT_STATUSES = ['Present', 'Late', 'Very Late', 'Absent', 'Sick', 'Half Day', 'Holiday', 'Weekly Holiday', 'Forced Closure'];
const STAFF_VOLUNTEER_STATUSES = ['Present', 'Late', 'Very Late', 'Absent', 'Half Day'];

export default function ManualAttendance() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [view, setView] = useState<ViewType>('students');
  const [localAttendance, setLocalAttendance] = useState<Record<string, LocalEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const statusOptions = view === 'students' ? STUDENT_STATUSES : STAFF_VOLUNTEER_STATUSES;

  // ---- People lists ----
  const { data: students = [] } = useQuery({
    queryKey: ['students-active'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('*').eq('status', 'Active').order('roll_no');
      return data || [];
    },
    enabled: view === 'students',
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-active-manual'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('*').eq('status', 'Active').order('staff_code');
      return data || [];
    },
    enabled: view === 'staff',
  });

  const { data: volunteers = [] } = useQuery({
    queryKey: ['volunteers-active-manual'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('volunteers').select('*').eq('status', 'Active').order('volunteer_code');
      return data || [];
    },
    enabled: view === 'volunteers',
  });

  const people: PersonRow[] = useMemo(() => {
    if (view === 'students') {
      return students.map((s: any) => ({ id: s.id, code: s.roll_no, full_name: s.full_name, subtitle: `${s.class || ''} ${s.group || ''}`.trim() }));
    }
    if (view === 'staff') {
      return staff.map((s: any) => ({ id: s.id, code: s.staff_code, full_name: s.full_name, subtitle: s.designation || '' }));
    }
    return volunteers.map((v: any) => ({ id: v.id, code: v.volunteer_code, full_name: v.full_name, subtitle: v.organization || '' }));
  }, [view, students, staff, volunteers]);

  // ---- Existing records for the selected date ----
  const { refetch } = useQuery({
    queryKey: ['attendance-date-manual', view, date],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const map: Record<string, LocalEntry> = {};

      if (view === 'students') {
        const { data } = await supabase.from('attendance').select('*').eq('date', date);
        (data || []).forEach((r: any) => { map[r.student_id] = { status: r.status, notes: r.notes || '' }; });
      } else {
        const personType = view === 'staff' ? 'staff' : 'volunteer';
        const { data } = await supabase.from('staff_attendance').select('*').eq('date', date).eq('person_type', personType);
        (data || []).forEach((r: any) => { map[r.person_id] = { status: r.status, notes: r.notes || '' }; });
      }

      setLocalAttendance(map);
      return map;
    }
  });

  const handleStatusChange = (personId: string, status: string) => {
    setLocalAttendance(prev => ({ ...prev, [personId]: { status, notes: prev[personId]?.notes || '' } }));
  };

  const handleNotesChange = (personId: string, notes: string) => {
    setLocalAttendance(prev => ({ ...prev, [personId]: { status: prev[personId]?.status || '', notes } }));
  };

  const markAll = (status: string) => {
    const newMap = { ...localAttendance };
    people.forEach(p => {
      newMap[p.id] = { status, notes: newMap[p.id]?.notes || '' };
    });
    setLocalAttendance(newMap);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!isSupabaseConfigured) {
        setTimeout(() => {
          toast({ title: 'Saved', description: 'Mock attendance saved successfully' });
          setIsSaving(false);
        }, 800);
        return;
      }

      const entries = Object.entries(localAttendance).filter(([, v]) => v.status);

      if (view === 'students') {
        const updates = entries.map(([student_id, v]) => ({
          student_id,
          date,
          status: v.status as AttendanceStatus,
          notes: v.notes || null,
        }));
        if (updates.length > 0) {
          const { error } = await supabase.from('attendance').upsert(updates, { onConflict: 'student_id,date' });
          if (error) throw error;
        }
      } else {
        const personType = view === 'staff' ? 'staff' : 'volunteer';
        const updates = entries.map(([person_id, v]) => ({
          person_id,
          person_type: personType,
          date,
          status: v.status,
          notes: v.notes || null,
        }));
        if (updates.length > 0) {
          const { error } = await supabase.from('staff_attendance').upsert(updates, { onConflict: 'person_id,person_type,date' });
          if (error) throw error;
        }
      }

      toast({ title: 'Success', description: `Attendance saved for ${date}` });
      refetch();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const StatusBadge = ({ status }: { status?: string }) => {
    if (status === 'Present') return <span className="text-green-600 font-medium">Present</span>;
    if (status === 'Absent') return <span className="text-red-600 font-medium">Absent</span>;
    if (status === 'Late') return <span className="text-amber-600 font-medium">Late</span>;
    if (status === 'Very Late') return <span className="text-orange-600 font-medium">Very Late</span>;
    if (status === 'Sick') return <span className="text-purple-600 font-medium">Sick</span>;
    if (status === 'Half Day') return <span className="text-blue-600 font-medium">Half Day</span>;
    if (status === 'Forced Closure') return <span className="text-gray-800 font-medium">Forced Closure</span>;
    if (status === 'Holiday' || status === 'Weekly Holiday') return <span className="text-gray-500 font-medium">{status}</span>;
    return <span className="text-gray-400">-</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Manual Override</h2>
          <p className="text-muted-foreground text-sm">Bulk update attendance records for a specific day</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
            <SelectTrigger className="w-[130px] bg-white">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="volunteers">Volunteers</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-border bg-gray-50 flex gap-2 overflow-x-auto whitespace-nowrap">
          <Button variant="outline" size="sm" onClick={() => markAll('Present')} className="bg-white border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
            Mark All Present
          </Button>
          {view === 'students' && (
            <>
              <Button variant="outline" size="sm" onClick={() => markAll('Holiday')} className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800">
                Mark All Holiday
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll('Weekly Holiday')} className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100">
                Mark Weekly Holiday
              </Button>
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 border-b border-border shadow-sm">
              <tr>
                <th className="px-6 py-3 font-medium w-28">Code</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium w-32">{view === 'students' ? 'Class' : view === 'staff' ? 'Designation' : 'School'}</th>
                <th className="px-6 py-3 font-medium">Current Status</th>
                <th className="px-6 py-3 font-medium w-48">Update To</th>
                <th className="px-6 py-3 font-medium w-56">Reason (if Absent)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {people.map((person) => {
                const entry = localAttendance[person.id];
                return (
                  <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{person.code}</td>
                    <td className="px-6 py-3 font-medium text-foreground">{person.full_name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{person.subtitle}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={entry?.status} />
                    </td>
                    <td className="px-6 py-3">
                      <Select
                        value={entry?.status || ''}
                        onValueChange={(val) => handleStatusChange(person.id, val)}
                      >
                        <SelectTrigger className={`w-full bg-white h-8 text-xs ${!entry?.status ? 'text-gray-400 border-dashed' : ''}`}>
                          <SelectValue placeholder="Set status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-3">
                      <Input
                        placeholder={entry?.status === 'Absent' ? 'e.g. Fever, family event...' : 'Optional note'}
                        value={entry?.notes || ''}
                        onChange={(e) => handleNotesChange(person.id, e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </td>
                  </tr>
                );
              })}
              {people.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No {view} found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const MOCK_STUDENTS = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'ADV' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'BEG' },
];