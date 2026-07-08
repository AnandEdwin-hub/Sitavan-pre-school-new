import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// ---- Original decorative artwork (hand-built SVG, not copied from any existing brand) ----

const SunMascot = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {/* rays */}
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * 360) / 8;
      return (
        <rect
          key={i}
          x="47" y="2" width="6" height="16" rx="3"
          fill="#FDB813"
          transform={`rotate(${angle} 50 50)`}
        />
      );
    })}
    {/* face */}
    <circle cx="50" cy="50" r="26" fill="#FFC93C" stroke="#F5A623" strokeWidth="2" />
    <circle cx="41" cy="46" r="3.2" fill="#5B4636" />
    <circle cx="59" cy="46" r="3.2" fill="#5B4636" />
    <circle cx="36" cy="54" r="3.5" fill="#FF9E9E" opacity="0.7" />
    <circle cx="64" cy="54" r="3.5" fill="#FF9E9E" opacity="0.7" />
    <path d="M40 58 Q50 66 60 58" stroke="#5B4636" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const StarDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 1l2.9 6.9L22 9l-5.5 4.8L18 22l-6-3.9L6 22l1.5-8.2L2 9l7.1-1.1L12 1z" />
  </svg>
);

const FlowerDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="5" r="3.2" opacity="0.85" />
    <circle cx="12" cy="19" r="3.2" opacity="0.85" />
    <circle cx="5" cy="12" r="3.2" opacity="0.85" />
    <circle cx="19" cy="12" r="3.2" opacity="0.85" />
  </svg>
);

const TreeDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="10.5" y="14" width="3" height="8" rx="1" fill="#B08968" />
    <circle cx="12" cy="9" r="7" fill="currentColor" />
  </svg>
);

const PencilDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="3" y="16" width="16" height="4" rx="1" transform="rotate(-45 3 16)" fill="currentColor" />
    <path d="M16.5 2.5l5 5-2.5 2.5-5-5 2.5-2.5z" fill="#F5A623" />
  </svg>
);

const GlobeDoodle = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <path d="M3 12h18" />
  </svg>
);

const RainbowCorner = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 120 70" className={className}>
    <path d="M5 65 A55 55 0 0 1 115 65" fill="none" stroke="#EF4444" strokeWidth="7" strokeLinecap="round" />
    <path d="M14 65 A46 46 0 0 1 106 65" fill="none" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" />
    <path d="M23 65 A37 37 0 0 1 97 65" fill="none" stroke="#FACC15" strokeWidth="7" strokeLinecap="round" />
    <path d="M32 65 A28 28 0 0 1 88 65" fill="none" stroke="#22C55E" strokeWidth="7" strokeLinecap="round" />
    <path d="M41 65 A19 19 0 0 1 79 65" fill="none" stroke="#3B82F6" strokeWidth="7" strokeLinecap="round" />
  </svg>
);

const DOODLE_COLORS = ['text-blue-200', 'text-emerald-200', 'text-amber-200', 'text-pink-200'];

// ---- Badge component ----

interface BadgeStudent {
  id: string;
  roll_no: string;
  full_name: string;
  class: string | null;
  group: string | null;
  mother_name?: string | null;
  mother_mobile?: string | null;
}

const AVATAR_COLORS = [
  'bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-violet-400', 'bg-cyan-400', 'bg-orange-400', 'bg-pink-400',
];

function Badge({ student, index }: { student: BadgeStudent; index: number }) {
  const initials = student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      {/* Lanyard hole */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-7 h-7 rounded-full bg-white border-[3px] border-gray-300 shadow-sm" />

      <div className="relative bg-white rounded-[22px] border-[3px] border-sky-200 shadow-md overflow-hidden pt-4">
        {/* Background doodles */}
        <StarDoodle className={`absolute top-3 right-8 w-4 h-4 ${DOODLE_COLORS[0]} opacity-70`} />
        <StarDoodle className={`absolute top-20 right-4 w-3 h-3 ${DOODLE_COLORS[1]} opacity-70`} />
        <FlowerDoodle className={`absolute top-9 right-16 w-4 h-4 ${DOODLE_COLORS[2]} opacity-70`} />
        <PencilDoodle className={`absolute top-24 right-10 w-5 h-5 ${DOODLE_COLORS[0]} opacity-70`} />
        <TreeDoodle className={`absolute bottom-24 right-3 w-6 h-6 ${DOODLE_COLORS[1]} opacity-60`} />
        <GlobeDoodle className={`absolute bottom-16 right-9 w-5 h-5 ${DOODLE_COLORS[3]} opacity-60`} />
        <StarDoodle className={`absolute top-4 left-24 w-3 h-3 ${DOODLE_COLORS[2]} opacity-60`} />

        {/* Header: mascot + wordmark */}
        <div className="relative px-4 pt-1 pb-3 flex items-start gap-2">
          <SunMascot className="w-14 h-14 shrink-0 drop-shadow-sm" />
          <div className="pt-1">
            <p className="text-[22px] leading-none font-extrabold text-sky-500 tracking-tight">Sitavan</p>
            <p className="text-[22px] leading-tight font-extrabold text-emerald-500 tracking-tight -mt-0.5">Pre-School</p>
            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] mt-1">MOUNT ABU</p>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-300" />

        {/* Body */}
        <div className="relative px-4 py-3 space-y-2.5">
          <div className="flex gap-3 items-start">
            <div className={`w-16 h-16 rounded-xl ${avatarColor} border-2 border-sky-300 shadow-sm flex items-center justify-center text-white text-xl font-bold shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="font-extrabold text-gray-900 text-base leading-tight truncate">{student.full_name}</h3>
              <p className="text-[11px] font-semibold text-gray-400 tracking-wide">STUDENT</p>
              <p className="text-[13px] font-bold text-gray-700 mt-0.5">Roll No: <span className="font-mono">{student.roll_no}</span></p>
              {student.class && (
                <span className="inline-block mt-1 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">
                  Class: {student.class}{student.group ? ` (${student.group})` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="text-[12px] text-gray-700 space-y-0.5 pt-1 border-t border-dashed border-gray-200">
            <p className="pt-1.5"><span className="font-semibold text-gray-500">Mother's Name:</span> {student.mother_name || '—'}</p>
            <p><span className="font-semibold text-gray-500">Mobile No:</span> {student.mother_mobile || '—'}</p>
          </div>

          <div className="flex items-end justify-between pt-1">
            <div className="bg-white p-1 rounded-md border border-gray-100 shadow-sm">
              <QRCodeSVG value={student.roll_no} size={62} level="H" />
            </div>
            <RainbowCorner className="w-20 h-12 -mb-1 -mr-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRBadges() {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group, mother_name, mother_mobile').eq('status', 'Active').order('class').order('roll_no');
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:grid-cols-2 print:gap-6 print:p-4">
        {students.map((student, index) => (
          <Badge key={student.id} student={student} index={index} />
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:grid-cols-2, .print\\:grid-cols-2 * { visibility: visible; }
          .print\\:grid-cols-2 {
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
  { id: '1', roll_no: 'SPS001', full_name: 'Aarav Sharma', class: 'LKG', group: 'BEG', mother_name: 'Priya Sharma', mother_mobile: '9876543210' },
  { id: '2', roll_no: 'SPS002', full_name: 'Diya Patel', class: 'HKG', group: 'ADV', mother_name: 'Kavita Patel', mother_mobile: '9876543211' },
  { id: '3', roll_no: 'SPS003', full_name: 'Vihaan Singh', class: 'NUR', group: 'BEG', mother_name: 'Riya Singh', mother_mobile: '9876543212' },
  { id: '4', roll_no: 'SPS004', full_name: 'Ananya Gupta', class: '1', group: 'ADV', mother_name: 'Neha Gupta', mother_mobile: '9876543213' },
  { id: '5', roll_no: 'SPS005', full_name: 'Arjun Kumar', class: '2', group: 'ADV', mother_name: 'Suman Kumar', mother_mobile: '9876543214' },
  { id: '6', roll_no: 'SPS006', full_name: 'Sneha Reddy', class: 'NUR', group: 'BEG', mother_name: 'Lakshmi Reddy', mother_mobile: '9876543215' },
];
