import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { format, subDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function ReportsAttendance() {
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: students = [] } = useQuery({
    queryKey: ['students-reports'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class').eq('status', 'Active');
      return data || [];
    }
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-reports', fromDate, toDate],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_ATTENDANCE;
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate);
      return data || [];
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!students.length || !attendance.length) return { studentStats: [], trendData: [], classData: [] };

    // Unique working days in range
    const workingDays = Array.from(new Set(attendance.map(a => a.date)));
    const totalDays = workingDays.length;

    // Student-wise stats
    const studentStatsMap = new Map();
    students.forEach(s => {
      studentStatsMap.set(s.id, { ...s, present: 0, absent: 0, late: 0, total: 0 });
    });

    attendance.forEach(a => {
      const s = studentStatsMap.get(a.student_id);
      if (s) {
        if (['Present', 'Half Day'].includes(a.status)) s.present++;
        if (a.status === 'Absent') s.absent++;
        if (a.status === 'Late') { s.late++; s.present++; } // Late counts as present for total %
        s.total++;
      }
    });

    const studentStatsList = Array.from(studentStatsMap.values()).map(s => {
      const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
      return { ...s, percentage: pct };
    }).sort((a, b) => a.percentage - b.percentage); // Sort ascending (worst first)

    // Trend line data
    const trendData = workingDays.sort().map(date => {
      const dayRecords = attendance.filter(a => a.date === date);
      const presentCount = dayRecords.filter(a => ['Present', 'Late', 'Half Day'].includes(a.status)).length;
      return {
        date: format(parseISO(date), 'dd MMM'),
        percentage: Math.round((presentCount / students.length) * 100)
      };
    });

    // Class comparison data
    const classDataMap = new Map();
    studentStatsList.forEach(s => {
      if (!classDataMap.has(s.class)) classDataMap.set(s.class, { class: s.class, totalPct: 0, count: 0 });
      const c = classDataMap.get(s.class);
      c.totalPct += s.percentage;
      c.count++;
    });
    
    const classData = Array.from(classDataMap.values()).map(c => ({
      class: c.class,
      avgPct: Math.round(c.totalPct / c.count)
    }));

    return { studentStats: studentStatsList, trendData, classData, totalDays };
  }, [students, attendance]);

  const flaggedStudents = stats.studentStats.filter(s => s.percentage < 75);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Attendance Reports</h2>
        
        <div className="flex flex-wrap items-end gap-3 bg-white p-2 rounded-lg border border-border shadow-sm">
          <div className="space-y-1">
            <Label className="text-xs ml-1 text-muted-foreground">From</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 w-[140px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs ml-1 text-muted-foreground">To</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 w-[140px]" />
          </div>
          <Button variant="default" className="h-9">Generate</Button>
          <Button variant="outline" className="h-9" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Attendance Trend (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="percentage" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Below 75% Alert ({flaggedStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[250px] p-0">
            {flaggedStudents.length > 0 ? (
              <div className="divide-y divide-border">
                {flaggedStudents.map(s => (
                  <div key={s.id} className="p-4 flex justify-between items-center bg-red-50/30">
                    <div>
                      <p className="font-medium text-sm">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.roll_no} • {s.class}</p>
                    </div>
                    <div className="text-xl font-bold text-red-600">{s.percentage}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-2">
                  <span className="text-green-500 text-xl">✓</span>
                </div>
                All students above 75%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Roll No</th>
                <th className="px-6 py-3 font-medium">Student Name</th>
                <th className="px-6 py-3 font-medium">Class</th>
                <th className="px-6 py-3 font-medium text-center">Present</th>
                <th className="px-6 py-3 font-medium text-center">Absent</th>
                <th className="px-6 py-3 font-medium text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.studentStats.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs">{student.roll_no}</td>
                  <td className="px-6 py-3 font-medium text-foreground">{student.full_name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{student.class}</td>
                  <td className="px-6 py-3 text-center text-green-600 font-medium">{student.present}</td>
                  <td className="px-6 py-3 text-center text-red-600 font-medium">{student.absent}</td>
                  <td className="px-6 py-3 text-right font-bold">
                    <span className={student.percentage < 75 ? 'text-red-600' : 'text-foreground'}>
                      {student.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {stats.studentStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No data available for the selected range.
                  </td>
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
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR' },
];

const MOCK_ATTENDANCE = [
  { id: '1', student_id: '1', date: '2023-10-01', status: 'Present' },
  { id: '2', student_id: '2', date: '2023-10-01', status: 'Present' },
  { id: '3', student_id: '3', date: '2023-10-01', status: 'Absent' },
  { id: '4', student_id: '1', date: '2023-10-02', status: 'Present' },
  { id: '5', student_id: '2', date: '2023-10-02', status: 'Late' },
  { id: '6', student_id: '3', date: '2023-10-02', status: 'Absent' },
];
