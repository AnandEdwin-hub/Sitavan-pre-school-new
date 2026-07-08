import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export default function Dashboard() {
  const today = new Date();
  
  // Queries
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data, error } = await supabase.from('students').select('*');
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

  // Derived stats
  const activeStudents = students.filter(s => s.status === 'Active');
  const totalStudentsCount = activeStudents.length;
  
  const presentTodayCount = todayAttendance.filter(a => ['Present', 'Late', 'Half Day'].includes(a.status)).length;
  const absentTodayCount = todayAttendance.filter(a => a.status === 'Absent').length;

  const monthAvg = useMemo(() => {
    if (monthAttendance.length === 0 || totalStudentsCount === 0) return 0;
    const workDays = new Set(monthAttendance.map(a => a.date)).size;
    if (workDays === 0) return 0;
    const presentTotal = monthAttendance.filter(a => ['Present', 'Late', 'Half Day'].includes(a.status)).length;
    return Math.round((presentTotal / (workDays * totalStudentsCount)) * 100);
  }, [monthAttendance, totalStudentsCount]);

  // Chart data
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(today, 14), end: today });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayRecords = monthAttendance.filter(a => a.date === dateStr);
      if (dayRecords.length === 0) return { name: format(day, 'd MMM'), pct: 0, date: dateStr };
      
      const present = dayRecords.filter(a => ['Present', 'Late', 'Half Day'].includes(a.status)).length;
      return {
        name: format(day, 'd MMM'),
        pct: Math.round((present / totalStudentsCount) * 100),
        date: dateStr,
      };
    }).filter(d => d.pct > 0); // exclude non-working days in rough mock
  }, [monthAttendance, totalStudentsCount, today]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="text-muted-foreground">{format(today, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="bg-white">
            <Link to="/students/new">Add Student</Link>
          </Button>
          <Button asChild>
            <Link to="/attendance/scan">Take Attendance</Link>
          </Button>
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
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{monthAvg}%</div>
            <p className="text-xs text-muted-foreground mt-1">Attendance this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Attendance Trend (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    cursor={{fill: '#F1F5F9'}} 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pct < 75 ? '#EF4444' : '#4F46E5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAttendance.slice(0, 5).map((record) => {
                const student = students.find(s => s.id === record.student_id);
                if (!student) return null;
                return (
                  <div key={record.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-foreground">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.class} - {student.group} • {record.scanned_at ? format(new Date(record.scanned_at), 'hh:mm a') : 'Manual'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${record.status === 'Present' ? 'bg-green-100 text-green-700' : ''}
                      ${record.status === 'Late' ? 'bg-amber-100 text-amber-700' : ''}
                      ${record.status === 'Absent' ? 'bg-red-100 text-red-700' : ''}
                      ${record.status === 'Half Day' ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
                      {record.status}
                    </span>
                  </div>
                );
              })}
              {todayAttendance.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No attendance recorded today yet.
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
