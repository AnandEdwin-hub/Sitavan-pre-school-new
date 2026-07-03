import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function CalendarAttendance() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [classFilter, setClassFilter] = useState('all');

  const { data: students = [] } = useQuery({
    queryKey: ['students-cal'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group').order('roll_no');
      return data || [];
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance-cal', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase
        .from('attendance')
        .select('student_id, date, status')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));
      return data || [];
    }
  });

  const filteredStudents = useMemo(() => {
    return students.filter(s => classFilter === 'all' || s.class === classFilter);
  }, [students, classFilter]);

  // Map attendance for quick O(1) lookups
  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {};
    attendance.forEach(record => {
      map[`${record.student_id}_${record.date}`] = record.status;
    });
    return map;
  }, [attendance]);

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Present': return 'bg-green-500 text-transparent'; // solid color box
      case 'Absent': return 'bg-red-500 text-transparent';
      case 'Late': return 'bg-amber-500 text-transparent';
      case 'Half Day': return 'bg-blue-500 text-transparent';
      case 'Holiday': return 'bg-purple-400 text-transparent';
      case 'Weekly Holiday': return 'bg-gray-300 text-transparent';
      default: return 'bg-gray-50 text-transparent border border-gray-100';
    }
  };

  const getStatusLetter = (status?: string) => {
    switch(status) {
      case 'Present': return 'P';
      case 'Absent': return 'A';
      case 'Late': return 'L';
      case 'Half Day': return 'HD';
      case 'Holiday': return 'H';
      case 'Weekly Holiday': return 'W';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Calendar View</h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-border rounded-lg p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-32 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[120px] bg-white">
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

          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading calendar grid...</div>
          ) : (
            <div className="inline-block min-w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-100 text-gray-600 font-semibold px-4 py-3 border-b border-r border-border min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Student Details
                    </th>
                    {daysInMonth.map(day => (
                      <th key={day.toISOString()} className="bg-gray-50 text-gray-500 font-medium px-1 py-3 text-center border-b border-r border-border min-w-[36px]">
                        {format(day, 'd')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 border-b border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                        <div className="font-medium text-foreground whitespace-nowrap">{student.full_name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{student.roll_no} • {student.class}</div>
                      </td>
                      {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const status = attendanceMap[`${student.id}_${dateStr}`];
                        return (
                          <td key={dateStr} className="border-b border-r border-border p-1 text-center">
                            <div 
                              className={`w-full h-8 rounded-sm flex items-center justify-center text-[10px] font-bold shadow-sm transition-all hover:opacity-80 cursor-default ${getStatusColor(status)}`}
                              title={`${student.full_name} - ${format(day, 'dd MMM')}: ${status || 'No Record'}`}
                            >
                              {getStatusLetter(status)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth.length + 1} className="p-8 text-center text-muted-foreground">
                        No students found for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4 items-center text-sm bg-white p-4 rounded-lg border border-border">
        <span className="font-semibold text-gray-700 mr-2">Legend:</span>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-green-500"></div> Present</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-red-500"></div> Absent</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-amber-500"></div> Late</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-blue-500"></div> Half Day</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-purple-400"></div> Holiday</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-gray-300"></div> Weekly Off</div>
      </div>
    </div>
  );
}

const MOCK_STUDENTS = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'ADV' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'BEG' },
];
