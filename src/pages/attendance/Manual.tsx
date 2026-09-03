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
    if (status ===