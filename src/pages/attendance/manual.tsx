import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

export default function ManualAttendance() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [localAttendance, setLocalAttendance] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const { data: students = [] } = useQuery({
    queryKey: ['students-active'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('*').eq('status', 'Active').order('roll_no');
      return data || [];
    }
  });

  const { data: existingAttendance = [], refetch } = useQuery({
    queryKey: ['attendance-date', date],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('attendance').select('*').eq('date', date);
      
      // Initialize local state with fetched data
      const attendanceMap: Record<string, string> = {};
      if (data) {
        data.forEach(record => {
          attendanceMap[record.student_id] = record.status;
        });
      }
      setLocalAttendance(attendanceMap);
      
      return data || [];
    }
  });

  const handleStatusChange = (studentId: string, status: string) => {
    setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: string) => {
    const newMap = { ...localAttendance };
    students.forEach(s => {
      if (!newMap[s.id]) { // only overwrite empty ones, or force all if you prefer
        newMap[s.id] = status;
      }
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

      const updates = Object.entries(localAttendance).map(([student_id, status]) => ({
        student_id,
        date,
        status: status as 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekly Holiday',
        marked_by: null, // populated by Supabase auth.uid() via RLS if configured
      }));

      if (updates.length > 0) {
        const { error } = await supabase.from('attendance').upsert(updates, { onConflict: 'student_id, date' });
        if (error) throw error;
      }

      toast({ title: 'Success', description: `Attendance saved for ${date}` });
      refetch();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'Present') return <span className="text-green-600 font-medium">Present</span>;
    if (status === 'Absent') return <span className="text-red-600 font-medium">Absent</span>;
    if (status === 'Late') return <span className="text-amber-600 font-medium">Late</span>;
    if (status === 'Half Day') return <span className="text-blue-600 font-medium">Half Day</span>;
    if (status === 'Holiday' || status === 'Weekly Holiday') return <span className="text-purple-600 font-medium">{status}</span>;
    return <span className="text-gray-400">-</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Manual Override</h2>
          <p className="text-muted-foreground text-sm">Bulk update attendance records for a specific day</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="outline" size="sm" onClick={() => markAll('Holiday')} className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800">
            Mark All Holiday
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAll('Weekly Holiday')} className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100">
            Mark Weekly Holiday
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 border-b border-border shadow-sm">
              <tr>
                <th className="px-6 py-3 font-medium w-24">Roll No</th>
                <th className="px-6 py-3 font-medium">Student Name</th>
                <th className="px-6 py-3 font-medium w-24">Class</th>
                <th className="px-6 py-3 font-medium">Current Status</th>
                <th className="px-6 py-3 font-medium w-48 text-right">Update To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => {
                const currentStatus = localAttendance[student.id];
                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{student.roll_no}</td>
                    <td className="px-6 py-3 font-medium text-foreground">{student.full_name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{student.class} {student.group}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={currentStatus} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Select 
                        value={currentStatus || ''} 
                        onValueChange={(val) => handleStatusChange(student.id, val)}
                      >
                        <SelectTrigger className={`w-full bg-white h-8 text-xs ${!currentStatus ? 'text-gray-400 border-dashed' : ''}`}>
                          <SelectValue placeholder="Set status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Present">Present</SelectItem>
                          <SelectItem value="Absent">Absent</SelectItem>
                          <SelectItem value="Late">Late</SelectItem>
                          <SelectItem value="Half Day">Half Day</SelectItem>
                          <SelectItem value="Holiday">Holiday</SelectItem>
                          <SelectItem value="Weekly Holiday">Weekly Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
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
