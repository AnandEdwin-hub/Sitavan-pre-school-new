import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const ANIMAL_EMOJIS = ['🐘', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🦒', '🦋', '🐬'];

const GRADIENTS = [
  'from-pink-400 to-rose-500',
  'from-indigo-400 to-cyan-400',
  'from-emerald-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-fuchsia-500',
  'from-blue-400 to-indigo-500',
  'from-teal-400 to-emerald-500',
  'from-rose-400 to-orange-400',
  'from-fuchsia-400 to-pink-500',
  'from-cyan-400 to-blue-500',
];

export default function QRBadges() {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group').eq('status', 'Active').order('class').order('roll_no');
      return data || [];
    }
  });

  const handlePrintAll = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Generating badges...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">QR Badges</h2>
          <p className="text-muted-foreground">Printable ID cards for scanning attendance</p>
        </div>
        <Button onClick={handlePrintAll}>
          <Printer className="w-4 h-4 mr-2" />
          Print All Badges
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 print:grid-cols-3 print:gap-4 print:p-4">
        {students.map((student, index) => {
          const emoji = ANIMAL_EMOJIS[index % ANIMAL_EMOJIS.length];
          const gradient = GRADIENTS[index % GRADIENTS.length];
          const initials = student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

          return (
            <Card key={student.id} className="overflow-hidden border-2 border-border shadow-sm flex flex-col h-[340px] print:h-[300px] print:shadow-none print:border-gray-300 break-inside-avoid">
              {/* Top Colorful Half */}
              <div className={`h-1/2 bg-gradient-to-br ${gradient} p-4 text-white flex flex-col items-center justify-center relative`}>
                <div className="absolute top-2 left-2 text-2xl opacity-80">{emoji}</div>
                <div className="absolute top-2 right-2 text-xs font-bold bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">SPS</div>
                
                <div className="w-16 h-16 rounded-full bg-white text-gray-800 flex items-center justify-center text-xl font-bold shadow-md z-10 border-2 border-white/50">
                  {initials}
                </div>
              </div>
              
              {/* Bottom White Half */}
              <div className="h-1/2 bg-white p-4 flex flex-col items-center relative -mt-4 rounded-t-xl z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <h3 className="font-bold text-gray-900 text-center leading-tight truncate w-full text-base mb-1 pt-2">{student.full_name}</h3>
                
                <div className="flex gap-2 text-[10px] font-semibold text-gray-500 mb-auto">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">{student.class}</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">{student.group}</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">{student.roll_no}</span>
                </div>

                <div className="mt-2 bg-white p-1 rounded-md border border-gray-100 shadow-sm">
                  <QRCodeSVG value={student.roll_no} size={70} level="H" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:grid-cols-3, .print\\:grid-cols-3 * { visibility: visible; }
          .print\\:grid-cols-3 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page { margin: 1cm; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
}

const MOCK_STUDENTS = [
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'ADV' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'BEG' },
  { id: '4', roll_no: 'SPS004', full_name: 'Ananya Gupta', class: '1', group: 'ADV' },
  { id: '5', roll_no: 'SPS005', full_name: 'Arjun Kumar', class: '2', group: 'ADV' },
  { id: '6', roll_no: 'SPS006', full_name: 'Sneha Reddy', class: 'NUR', group: 'BEG' },
];
