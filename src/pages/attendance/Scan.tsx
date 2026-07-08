import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, CheckCircle2, AlertTriangle, Clock, CalendarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AttendanceStatus, STATUS_CODE } from '@/types/database';

const DEFAULT_START_TIME = '09:00';
const DEFAULT_LATE_MINS = 5;
const DEFAULT_VERY_LATE_MINS = 10;

export default function ScanAttendance() {
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const today = new Date();
  const todayDateStr = format(today, 'yyyy-MM-dd');
  const isSunday = today.getDay() === 0; // Sunday auto weekly-holiday; Saturday (6) is a normal school day

  // Fetch shared attendance-rule settings
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Check whether today is a manually-entered Holiday or emergency Forced Closure
  const { data: todayHoliday } = useQuery({
    queryKey: ['holiday-today', todayDateStr],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('date', todayDateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const closureReason: 'Weekly Holiday' | 'Forced Closure' | 'Holiday' | null = todayHoliday
    ? todayHoliday.type === 'Forced Closure' ? 'Forced Closure' : 'Holiday'
    : isSunday ? 'Weekly Holiday'
    : null;

  const startTime = settings?.school_start_time?.slice(0, 5) || DEFAULT_START_TIME;
  const lateMins = settings?.late_threshold_minutes ?? DEFAULT_LATE_MINS;
  const veryLateMins = settings?.very_late_threshold_minutes ?? DEFAULT_VERY_LATE_MINS;

  // Fetch all students for quick lookup
  const { data: students = [] } = useQuery({
    queryKey: ['students-scan'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group');
      return data || [];
    }
  });

  // Fetch today's attendance to show live list
  const { data: todayAttendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_ATTENDANCE;
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', todayDateStr)
        .order('scanned_at', { ascending: false });
      return data || [];
    }
  });

  useEffect(() => {
    // Don't mount the camera scanner at all on a closed day
    if (closureReason) return;

    // Initialize Scanner once on mount — must not re-run on data changes
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(handleScanSuccess, handleScanError);

    return () => {
      scanner.clear().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closureReason]); // re-mount if closure status flips while page is open

  // Determine status based on current time vs configured thresholds
  const getStatusForTime = (): AttendanceStatus => {
    const now = new Date();
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startTotalMins = startHour * 60 + startMin;
    const nowTotalMins = now.getHours() * 60 + now.getMinutes();
    const minsPastStart = nowTotalMins - startTotalMins;

    if (minsPastStart <= lateMins) return 'Present';
    if (minsPastStart <= veryLateMins) return 'Late';
    return 'Very Late';
  };

  const processRollNo = async (rollNo: string) => {
    if (isProcessing || closureReason) return;
    setIsProcessing(true);

    try {
      const student = students.find(s => s.roll_no === rollNo);

      if (!student) {
        toast({ variant: 'destructive', title: 'Unknown QR', description: `No student found with roll number ${rollNo}` });
        return;
      }

      // Check if already scanned today
      const alreadyScanned = todayAttendance.find(a => a.student_id === student.id);
      if (alreadyScanned) {
        setScanResult({
          student,
          status: 'Already Scanned',
          time: new Date().toISOString(),
          type: 'warning'
        });
        clearResultAfterDelay();
        return;
      }

      const status = getStatusForTime();

      if (isSupabaseConfigured) {
        await supabase.from('attendance').upsert({
          student_id: student.id,
          date: todayDateStr,
          status,
          scanned_at: new Date().toISOString(),
        }, { onConflict: 'student_id,date' });
      }

      setScanResult({
        student,
        status,
        time: new Date().toISOString(),
        type: status === 'Present' ? 'success' : status === 'Very Late' ? 'error' : 'warning'
      });

      refetchAttendance();
      clearResultAfterDelay();

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Scan Error', description: 'Failed to record attendance' });
    } finally {
      setIsProcessing(false);
      setManualInput('');
    }
  };

  function handleScanSuccess(decodedText: string) {
    if (!isProcessing) {
      processRollNo(decodedText);
    }
  }

  function handleScanError() {
    // Ignore normal scan errors (empty frames)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      processRollNo(manualInput.trim());
    }
  };

  const clearResultAfterDelay = () => {
    setTimeout(() => {
      setScanResult(null);
    }, 4000);
  };

  const statusColorClasses = (status: string) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Late': return 'text-amber-600 bg-amber-50';
      case 'Very Late': return 'text-orange-600 bg-orange-50';
      case 'Sick': return 'text-purple-600 bg-purple-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Scan Attendance</h2>
        <p className="text-muted-foreground">{format(today, 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Closed-day banner — scanning disabled entirely */}
      {closureReason && (
        <Card className="border-2 border-gray-300 bg-gray-50">
          <CardContent className="p-8 text-center space-y-3">
            <CalendarOff className="w-14 h-14 mx-auto text-gray-500" />
            <h3 className="text-lg font-bold text-gray-700">
              {closureReason === 'Forced Closure' ? 'School Closed Today (Forced Closure)' :
               closureReason === 'Weekly Holiday' ? 'Weekly Holiday (Sunday)' : 'Holiday Today'}
            </h3>
            {todayHoliday?.reason && (
              <p className="text-sm text-gray-500">{todayHoliday.reason}</p>
            )}
            <p className="text-sm text-gray-500">Attendance scanning is disabled for the day. Use Manual Entry to record any exceptions if needed.</p>
          </CardContent>
        </Card>
      )}

      {/* Result Card Overlay */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <Card className="w-full max-w-sm overflow-hidden shadow-2xl">
            <div className={`h-3 ${
              scanResult.type === 'success' ? 'bg-green-500' :
              scanResult.type === 'warning' ? 'bg-amber-500' :
              scanResult.type === 'error' ? 'bg-orange-500' : 'bg-red-500'
            }`} />
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                {scanResult.type === 'success' ? (
                  <CheckCircle2 className="w-20 h-20 text-green-500" />
                ) : scanResult.type === 'warning' ? (
                  <Clock className="w-20 h-20 text-amber-500" />
                ) : scanResult.type === 'error' ? (
                  <Clock className="w-20 h-20 text-orange-500" />
                ) : (
                  <AlertTriangle className="w-20 h-20 text-red-500" />
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold">{scanResult.student.full_name}</h3>
                <p className="text-muted-foreground">{scanResult.student.roll_no} • {scanResult.student.class} {scanResult.student.group}</p>
              </div>

              <div className="inline-block px-4 py-2 rounded-full text-lg font-bold tracking-wide bg-gray-100">
                {STATUS_CODE[scanResult.status as AttendanceStatus] || scanResult.status.toUpperCase()} — {scanResult.status.toUpperCase()}
              </div>

              <p className="text-sm text-muted-foreground">
                Recorded at {format(new Date(scanResult.time), 'hh:mm:ss a')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner Section — hidden entirely on closed days */}
      {!closureReason && (
        <Card className="overflow-hidden border-2 border-primary/20 shadow-md">
          <div className="bg-primary/5 p-3 text-center border-b border-primary/10">
            <p className="text-sm font-medium text-primary">Position QR code in frame</p>
          </div>
          <div id="qr-reader" className="w-full" />
        </Card>
      )}

      {/* Manual Entry */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Or type Roll Number..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 font-mono uppercase"
              disabled={!!closureReason}
            />
            <Button type="submit" disabled={isProcessing || !manualInput.trim() || !!closureReason}>
              <Search className="w-4 h-4 mr-2" /> Find
            </Button>
          </form>
          {closureReason && (
            <p className="text-xs text-muted-foreground mt-2">Manual entry is disabled on a closed day. Go to the Manual Attendance page to record exceptions.</p>
          )}
        </CardContent>
      </Card>

      {/* Live Feed */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Today's Scans ({todayAttendance.length})</h3>
        <Card>
          <div className="divide-y divide-border">
            {todayAttendance.slice(0, 10).map((record) => {
              const student = students.find(s => s.id === record.student_id);
              if (!student) return null;

              return (
                <div key={record.id} className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{student.full_name}</p>
                    <div className="flex items-center text-xs text-muted-foreground gap-2 mt-0.5">
                      <span className="font-mono">{student.roll_no}</span>
                      <span>•</span>
                      <span>{student.class}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColorClasses(record.status)}`}>
                      {STATUS_CODE[record.status as AttendanceStatus] || record.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {record.scanned_at ? format(new Date(record.scanned_at), 'hh:mm a') : 'Manual'}
                    </p>
                  </div>
                </div>
              );
            })}
            {todayAttendance.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No scans recorded today.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const MOCK_STUDENTS = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'ADV' },
];

const MOCK_ATTENDANCE: any[] = [];
