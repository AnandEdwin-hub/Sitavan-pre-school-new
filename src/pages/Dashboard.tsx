import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { peopleTable } from '@/lib/people';
import { useAuth } from '@/hooks/useAuth';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const PRESENT_STATUSES = ['Present', 'Late', 'Very Late', 'Half Day'];
const NON_WORKING = ['Holiday', 'Weekly Holiday'];
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  'Very Late': { label: 'LL', cls: 'bg-orange-100 text-orange-700' },
  'Late': { label: 'L', cls: 'bg-amber-100 text-amber-700' },
  'Absent': { label: 'A', cls: 'bg-red-100 text-red-700' },
};

export default function Dashboard() {
  const { isViewer } = useAuth();
  const today = new Date();
  
  // Queries
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data, error } = await supabase.from(peopleTable('students')).select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['attendance', format(today, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_ATTENDANCE_TODAY;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', format(today, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
  });

  const todayKey = format(today, 'yyyy-MM-dd');

const { data: staffToday = [] } = useQuery({
  queryKey: ['dash-staff-attendance-today', todayKey],
  queryFn: async () => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('id, person_id, person_type, status, scanned_in_at, notes')
      .eq('date', todayKey);
    if (error) throw error;
    return data || [];
  },
});

const { data: staffList = [] } = useQuery({
  queryKey: ['dash-staff-names'],
  queryFn: async () => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from(peopleTable('staff')).select('id, full_name').eq('status', 'Active');
    if (error) throw error;
    return data || [];
  },
});

const { data: volunteerList = [] } = useQuery({
  queryKey: ['dash-volunteer-names'],
  queryFn: async () => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from(peopleTable('volunteers')).select('id, full_name').eq('status', 'Active');
    if (error) throw error;
    return data || [];
  },
});

const { data: monthAttendance = [] } = useQuery({
    queryKey: ['attendance-month'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_ATTENDANCE_MONTH;
      const start = format(startOfMonth(today), 'yyyy-MM-dd');
      const end = format(endOfMonth(today), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', start)
        .lte('date', end);
      if (error) throw error;
      return data;
    },
  });

  const year = today.getFullYear();
  const { data: yearAttendance = [] } = useQuery({
    queryKey: ['attendance-year', year],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_ATTENDANCE_MONTH;
      // Supabase caps at 1000 rows per request, so page through
      const pageSize = 1000;
      let from = 0;
      let all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from('attendance')
          .select('date,status')
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  // Derived stats
  const activeStudents = students.filter(s => s.status === 'Active');
  const totalStudentsCount = activeStudents.length;
  
  const activeStudentIds = new Set(activeStudents.map((s: any) => s.id));
  const presentTodayCount = todayAttendance.filter(a => activeStudentIds.has(a.student_id) && PRESENT_STATUSES.includes(a.status)).length;
  const absentTodayCount = todayAttendance.filter(a => activeStudentIds.has(a.student_id) && a.status === 'Absent').length;

const lateAbsentToday = useMemo(() => {
  const rank: Record<string, number> = { 'Very Late': 0, 'Late': 1, 'Absent': 2 };
  const timeOf = (ts?: string | null) => (ts ? format(new Date(ts), 'hh:mm a') : null);
  const rows: { id: string; name: string; sub: string; status: string; detail: string }[] = [];

  todayAttendance.forEach((r: any) => {
    if (!(r.status in rank)) return;
    const s: any = students.find((x: any) => x.id === r.student_id);
    if (!s || s.status !== 'Active') return;
    rows.push({
      id: `s-${r.id}`,
      name: s.full_name,
      sub: `Student • ${s.class} - ${s.group}`,
      status: r.status,
      detail: r.status === 'Absent' ? (r.notes || '') : (timeOf(r.scanned_at) || 'Manual'),
    });
  });

  staffToday.forEach((r: any) => {
    if (!(r.status in rank)) return;
    const isVol = r.person_type === 'volunteer';
    const p: any = (isVol ? volunteerList : staffList).find((x: any) => x.id === r.person_id);
    if (!p) return;
    rows.push({
      id: `p-${r.id}`,
      name: p.full_name,
      sub: isVol ? 'Volunteer' : 'Staff',
      status: r.status,
      detail: r.status === 'Absent' ? (r.notes || '') : (timeOf(r.scanned_in_at) || 'Manual'),
    });
  });

  return rows.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}, [todayAttendance, staffToday, students, staffList, volunteerList]);

  const monthAvg = useMemo(() => {
    const recs = monthAttendance.filter(a => !NON_WORKING.includes(a.status));
    if (recs.length === 0) return 0;
    const presentTotal = recs.filter(a => PRESENT_STATUSES.includes(a.status)).length;
    return Math.round((presentTotal / recs.length) * 100);
  }, [monthAttendance]);

  // Monthly attendance % for Jan–Dec of the current year
  const monthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(year, i, 1);
      const key = format(monthDate, 'yyyy-MM');
      const recs = yearAttendance.filter(
        a => String(a.date).startsWith(key) && !NON_WORKING.includes(a.status)
      );
      const present = recs.filter(a => PRESENT_STATUSES.includes(a.status)).length;
      const pct = recs.length > 0 ? Math.round((present / recs.length) * 100) : null;
      return { name: format(monthDate, 'MMM'), pct };
    });
  }, [yearAttendance, totalStudentsCount, year]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="text-muted-foreground">{format(today, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          {!isViewer && (<><Button asChild variant="outline">
            <Link to="/students/new">Add Student</Link>
          </Button>
          <Button asChild>
            <Link to="/attendance/scan">Take Attendance</Link>
          </Button></>)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Active Students</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled across all classes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentTodayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStudentsCount > 0 ? Math.round((presentTodayCount / totalStudentsCount) * 100) : 0}% of active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserX className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentTodayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Require follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Monthly Avg</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{monthAvg}%</div>
            <p className="text-xs text-muted-foreground mt-1">Attendance this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Monthly Attendance Rate · {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {monthlyStats.map((m) => (
                <div key={m.name} className="rounded-lg border border-border/50 p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.name}</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    m.pct === null ? 'text-muted-foreground' : m.pct < 75 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {m.pct === null ? '—' : `${m.pct}%`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-2">
          <CardHeader>
            <CardTitle>Late & Absent Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[420px] overflow-auto">
              {lateAbsentToday.map((row) => (
                <div key={row.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.sub}{row.detail ? ` • ${row.detail}` : ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[row.status].cls}`}>
                    {STATUS_BADGE[row.status].label}
                  </span>
                </div>
              ))}
              {lateAbsentToday.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No late or absent people today.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// MOCK DATA for preview
const MOCK_STUDENTS = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG', status: 'Active' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'UKG', group: 'ADV', status: 'Active' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'BEG', status: 'Active' },
  { id: '4', roll_no: 'SPS004', full_name: 'Ananya Gupta', class: '1', group: 'ADV', status: 'Active' },
  { id: '5', roll_no: 'SPS005', full_name: 'Arjun Kumar', class: '2', group: 'ADV', status: 'Active' },
];

const MOCK_ATTENDANCE_TODAY = [
  { id: 'a1', student_id: '1', date: format(new Date(), 'yyyy-MM-dd'), status: 'Present', scanned_at: new Date().toISOString() },
  { id: 'a2', student_id: '2', date: format(new Date(), 'yyyy-MM-dd'), status: 'Late', scanned_at: new Date().toISOString() },
  { id: 'a3', student_id: '3', date: format(new Date(), 'yyyy-MM-dd'), status: 'Present', scanned_at: new Date().toISOString() },
  { id: 'a4', student_id: '4', date: format(new Date(), 'yyyy-MM-dd'), status: 'Absent', scanned_at: null },
];

const MOCK_ATTENDANCE_MONTH = MOCK_ATTENDANCE_TODAY; // simplified
