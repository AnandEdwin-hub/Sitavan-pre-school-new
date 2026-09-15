import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, AlertCircle } from 'lucide-react';
import { AttendanceStatus, STATUS_CODE, STATUS_COLOR } from '@/types/database';
import * as XLSX from 'xlsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

type ViewType = 'students' | 'staff' | 'volunteers';

// Extra letter/color for Half Day, in case the shared maps don't cover it
const EXTRA_STATUS_CODE: Record<string, string> = { 'Half Day': 'HD' };
const EXTRA_STATUS_COLOR: Record<string, string> = { 'Half Day': 'bg-indigo-400' };

const getLetter = (status?: string) => {
  if (status === 'Weekly Holiday') return 'SUN';
  return status ? (STATUS_CODE as any)[status] || EXTRA_STATUS_CODE[status] || status : '';
};
const getColor = (status?: string) => (status ? (STATUS_COLOR as any)[status] || EXTRA_STATUS_COLOR[status] || 'bg-gray-400' : 'bg-gray-50 text-transparent border border-gray-100');

// Days that count towards a %: actual attendance outcomes, not holidays/no-record
const PRESENT_STATUSES = ['Present', 'Late', 'Very Late', 'Half Day'];
const ABSENT_STATUSES = ['Absent', 'Sick'];
const isCountable = (status?: string) => !!status && (PRESENT_STATUSES.includes(status) || ABSENT_STATUSES.includes(status));
const isPresentish = (status?: string) => !!status && PRESENT_STATUSES.includes(status);

interface PersonRow {
  id: string;
  code: string;
  full_name: string;
  subtitle: string;
}

export default function ReportsAttendance() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [classFilter, setClassFilter] = useState('all');
  const [view, setView] = useState<ViewType>('students');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthKey = format(monthStart, 'yyyy-MM');

  // ---- Students ----
  const { data: students = [] } = useQuery({
    queryKey: ['students-reports'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group').order('roll_no');
      return data || [];
    },
    enabled: view === 'students',
  });

  const { data: studentAttendance = [], isLoading: studentAttLoading } = useQuery({
    queryKey: ['attendance-reports', monthKey],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_ATTENDANCE;
      const { data } = await supabase
        .from('attendance')
        .select('student_id, date, status')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));
      return data || [];
    },
    enabled: view === 'students',
  });

  // ---- Staff ----
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-reports'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('id, staff_code, full_name, designation').order('staff_code');
      return data || [];
    },
    enabled: view === 'staff',
  });

  const { data: staffAttendance = [], isLoading: staffAttLoading } = useQuery({
    queryKey: ['staff-attendance-reports', monthKey],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase
        .from('staff_attendance')
        .select('person_id, date, status')
        .eq('person_type', 'staff')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));
      return data || [];
    },
    enabled: view === 'staff',
  });

  // ---- Volunteers ----
  const { data: volunteers = [] } = useQuery({
    queryKey: ['volunteers-reports'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('volunteers').select('id, volunteer_code, full_name, organization').order('volunteer_code');
      return data || [];
    },
    enabled: view === 'volunteers',
  });

  const { data: volunteerAttendance = [], isLoading: volAttLoading } = useQuery({
    queryKey: ['volunteer-attendance-reports', monthKey],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase
        .from('staff_attendance')
        .select('person_id, date, status')
        .eq('person_type', 'volunteer')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));
      return data || [];
    },
    enabled: view === 'volunteers',
  });

  // ---- Holidays (apply to everyone) ----
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays-reports', monthKey],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase
        .from('holidays')
        .select('date, type')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));
      return data || [];
    }
  });

  const holidayMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    holidays.forEach((h: any) => {
      map[h.date] = h.type === 'Forced Closure' ? 'Forced Closure' : 'Holiday';
    });
    return map;
  }, [holidays]);

  // ---- Normalize whichever dataset is active into a common shape ----
  const people: PersonRow[] = useMemo(() => {
    if (view === 'students') {
      return students
        .filter((s: any) => classFilter === 'all' || s.class === classFilter)
        .map((s: any) => ({ id: s.id, code: s.roll_no, full_name: s.full_name, subtitle: `${s.roll_no} • ${s.class || ''}` }));
    }
    if (view === 'staff') {
      return staff.map((s: any) => ({ id: s.id, code: s.staff_code, full_name: s.full_name, subtitle: `${s.staff_code} • ${s.designation || ''}` }));
    }
    return volunteers.map((v: any) => ({ id: v.id, code: v.volunteer_code, full_name: v.full_name, subtitle: `${v.volunteer_code} • ${v.organization || ''}` }));
  }, [view, students, staff, volunteers, classFilter]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (view === 'students') {
      studentAttendance.forEach((r: any) => { map[`${r.student_id}_${r.date}`] = r.status; });
    } else if (view === 'staff') {
      staffAttendance.forEach((r: any) => { map[`${r.person_id}_${r.date}`] = r.status; });
    } else {
      volunteerAttendance.forEach((r: any) => { map[`${r.person_id}_${r.date}`] = r.status; });
    }
    return map;
  }, [view, studentAttendance, staffAttendance, volunteerAttendance]);

  const isLoading = view === 'students' ? studentAttLoading : view === 'staff' ? staffAttLoading : volAttLoading;

  const getEffectiveStatus = (personId: string, day: Date, dateStr: string): string | undefined => {
    const recorded = attendanceMap[`${personId}_${dateStr}`];
    if (recorded) return recorded;
    if (holidayMap[dateStr]) return holidayMap[dateStr];
    if (day.getDay() === 0) return 'Weekly Holiday';
    return undefined;
  };

  // ---- Row % (per person, right-hand column) and column % (per day, bottom row) ----
  const { rowStats, columnStats } = useMemo(() => {
    const rowStats = people.map(person => {
      let present = 0;
      let counted = 0;
      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const status = getEffectiveStatus(person.id, day, dateStr);
        if (isCountable(status)) {
          counted++;
          if (isPresentish(status)) present++;
        }
      });
      return { id: person.id, present, counted, pct: counted > 0 ? Math.round((present / counted) * 100) : null };
    });

    const columnStats = daysInMonth.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let present = 0;
      let counted = 0;
      people.forEach(person => {
        const status = getEffectiveStatus(person.id, day, dateStr);
        if (isCountable(status)) {
          counted++;
          if (isPresentish(status)) present++;
        }
      });
      return { date: dateStr, pct: counted > 0 ? Math.round((present / counted) * 100) : null };
    });

    return { rowStats, columnStats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, daysInMonth, attendanceMap, holidayMap]);

  const rowStatsById = useMemo(() => new Map(rowStats.map(r => [r.id, r])), [rowStats]);

  const flagged = rowStats
    .map(r => ({ ...r, person: people.find(p => p.id === r.id)! }))
    .filter(r => r.pct !== null && r.pct < 75)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  const trendData = columnStats
    .filter(c => c.pct !== null)
    .map(c => ({ date: format(new Date(c.date), 'dd MMM'), percentage: c.pct as number }));

  const handleExport = () => {
    const header = ['Code', 'Name', 'Detail', ...daysInMonth.map(d => format(d, 'd')), '%'];
    const rows = people.map(person => {
      const row: (string | number)[] = [person.code, person.full_name, person.subtitle];
      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        row.push(getLetter(getEffectiveStatus(person.id, day, dateStr)));
      });
      const stat = rowStatsById.get(person.id);
      row.push(stat?.pct !== null && stat?.pct !== undefined ? `${stat.pct}%` : '');
      return row;
    });
    const footer: (string | number)[] = ['', '', '%', ...columnStats.map(c => c.pct !== null ? `${c.pct}%` : ''), ''];

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows, footer]);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, ...daysInMonth.map(() => ({ wch: 4 })), { wch: 6 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, format(currentMonth, 'MMM yyyy'));

    const fileName = `Attendance_Report_${view}_${format(currentMonth, 'MMM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Attendance Reports</h2>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-border shadow-sm">
          <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="volunteers">Volunteers</SelectItem>
            </SelectContent>
          </Select>

          {view === 'students' && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="NUR">NUR</SelectItem>
                <SelectItem value="LKG">LKG</SelectItem>
                <SelectItem value="HKG">HKG</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center border border-border rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-28 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" className="h-9" onClick={handleExport}>
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
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              Below 75% Alert ({flagged.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[250px] p-0">
            {flagged.length > 0 ? (
              <div className="divide-y divide-border">
                {flagged.map(r => (
                  <div key={r.id} className="p-4 flex justify-between items-center bg-red-50/30">
                    <div>
                      <p className="font-medium text-sm">{r.person.full_name}</p>
                      <p className="text-xs text-muted-foreground">{r.person.subtitle}</p>
                    </div>
                    <div className="text-xl font-bold text-red-600">{r.pct}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-2">
                  <span className="text-green-500 text-xl">✓</span>
                </div>
                Everyone above 75%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading report...</div>
          ) : (
            <div className="inline-block min-w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-100 text-gray-600 font-semibold px-4 py-3 border-b border-r border-border min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      {view === 'students' ? 'Student Details' : view === 'staff' ? 'Staff Details' : 'Volunteer Details'}
                    </th>
                    {daysInMonth.map(day => (
                      <th key={day.toISOString()} className={`text-gray-500 font-medium px-1 py-3 text-center border-b border-r border-border min-w-[36px] ${day.getDay() === 0 ? 'bg-gray-200' : 'bg-gray-50'}`}>
                        {format(day, 'd')}
                      </th>
                    ))}
                    <th className="sticky right-0 z-10 bg-gray-100 text-gray-600 font-semibold px-3 py-3 text-center border-b border-border min-w-[64px] shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => {
                    const stat = rowStatsById.get(person.id);
                    return (
                      <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2 border-b border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                          <div className="font-medium text-foreground whitespace-nowrap">{person.full_name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{person.subtitle}</div>
                        </td>
                        {daysInMonth.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const status = getEffectiveStatus(person.id, day, dateStr);
                          return (
                            <td key={dateStr} className="border-b border-r border-border p-1 text-center">
                              <div
                                className={`w-full h-8 rounded-sm flex items-center justify-center text-[10px] font-bold shadow-sm transition-all hover:opacity-80 cursor-default ${getColor(status)}`}
                                title={`${person.full_name} - ${format(day, 'dd MMM')}: ${status || 'No Record'}`}
                              >
                                {getLetter(status)}
                              </div>
                            </td>
                          );
                        })}
                        <td className="sticky right-0 z-10 bg-white px-3 py-2 text-center border-b border-border font-bold shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                          {stat?.pct !== null && stat?.pct !== undefined ? (
                            <span className={stat.pct < 75 ? 'text-red-600' : 'text-foreground'}>{stat.pct}%</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth.length + 2} className="p-8 text-center text-muted-foreground">
                        No {view} found for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {people.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="sticky left-0 z-10 bg-gray-100 px-4 py-3 border-t border-r border-border text-gray-600 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                        Daily %
                      </td>
                      {columnStats.map(c => (
                        <td key={c.date} className="border-t border-r border-border p-1 text-center text-gray-700">
                          {c.pct !== null ? `${c.pct}%` : ''}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 bg-gray-100 border-t border-border shadow-[-2px_0_4px_rgba(0,0,0,0.05)]" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4 items-center text-sm bg-white p-4 rounded-lg border border-border">
        <span className="font-semibold text-gray-700 mr-2">Legend:</span>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-green-500"></div> P - Present</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-amber-500"></div> L - Late</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-orange-500"></div> LL - Very Late</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-red-500"></div> A - Absent</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-purple-500"></div> S - Sick</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-indigo-400"></div> HD - Half Day</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-gray-400"></div> H - Holiday</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-gray-300"></div> SUN - Sunday</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-gray-800"></div> FC - Forced Closure</div>
      </div>
    </div>
  );
}

const MOCK_STUDENTS = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'BEG' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'ADV' },
];

const MOCK_ATTENDANCE = [
  { student_id: '1', date: format(new Date(), 'yyyy-MM-dd'), status: 'Present' },
  { student_id: '2', date: format(new Date(), 'yyyy-MM-dd'), status: 'Present' },
  { student_id: '3', date: format(new Date(), 'yyyy-MM-dd'), status: 'Absent' },
];
