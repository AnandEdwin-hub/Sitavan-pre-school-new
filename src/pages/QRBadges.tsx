import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// ---- Original decorative artwork (hand-built SVG, not copied from any existing brand) ----

const SunMascot = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * 360) / 8;
      return (
        <rect key={i} x="47" y="2" width="6" height="16" rx="3" fill="#FDB813" transform={`rotate(${angle} 50 50)`} />
      );
    })}
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

const AVATAR_COLORS = [
  'bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-violet-400', 'bg-cyan-400', 'bg-orange-400', 'bg-pink-400',
];

type BadgeRole = 'STUDENT' | 'STAFF' | 'VOLUNTEER';

interface BadgePerson {
  id: string;
  code: string; // QR value: roll_no / staff_code / volunteer_code
  full_name: string;
  line1: string; // e.g. "Class: LKG (BEG)" or "Designation: Teacher" or "School: Kendriya Vidyalaya"
  detailLabel: string; // e.g. "Mother's Name" or "Mobile No" or "Contact"
  detailValue: string;
  detailLabel2?: string;
  detailValue2?: string;
}

function Badge({ person, role, index }: { person: BadgePerson; role: BadgeRole; index: number }) {
  const initials = person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-7 h-7 rounded-full bg-white border-[3px] border-gray-300 shadow-sm" />

      <div className="relative bg-white rounded-[22px] border-[3px] border-sky-200 shadow-md overflow-hidden pt-4">
        <StarDoodle className={`absolute top-3 right-8 w-4 h-4 ${DOODLE_COLORS[0]} opacity-70`} />
        <StarDoodle className={`absolute top-20 right-4 w-3 h-3 ${DOODLE_COLORS[1]} opacity-70`} />
        <FlowerDoodle className={`absolute top-9 right-16 w-4 h-4 ${DOODLE_COLORS[2]} opacity-70`} />
        <PencilDoodle className={`absolute top-24 right-10 w-5 h-5 ${DOODLE_COLORS[0]} opacity-70`} />
        <TreeDoodle className={`absolute bottom-24 right-3 w-6 h-6 ${DOODLE_COLORS[1]} opacity-60`} />
        <GlobeDoodle className={`absolute bottom-16 right-9 w-5 h-5 ${DOODLE_COLORS[3]} opacity-60`} />
        <StarDoodle className={`absolute top-4 left-24 w-3 h-3 ${DOODLE_COLORS[2]} opacity-60`} />

        <div className="relative px-4 pt-1 pb-3 flex items-start gap-2">
          <SunMascot className="w-14 h-14 shrink-0 drop-shadow-sm" />
          <div className="pt-1">
            <p className="text-[22px] leading-none font-extrabold text-sky-500 tracking-tight">Sitavan</p>
            <p className="text-[22px] leading-tight font-extrabold text-emerald-500 tracking-tight -mt-0.5">Pre-School</p>
            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] mt-1">MOUNT ABU</p>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-300" />

        <div className="relative px-4 py-3 space-y-2.5">
          <div className="flex gap-3 items-start">
            <div className={`w-16 h-16 rounded-xl ${avatarColor} border-2 border-sky-300 shadow-sm flex items-center justify-center text-white text-xl font-bold shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="font-extrabold text-gray-900 text-base leading-tight truncate">{person.full_name}</h3>
              <p className="text-[11px] font-semibold text-gray-400 tracking-wide">{role}</p>
              <p className="text-[13px] font-bold text-gray-700 mt-0.5">Code: <span className="font-mono">{person.code}</span></p>
              {person.line1 && (
                <span className="inline-block mt-1 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">
                  {person.line1}
                </span>
              )}
            </div>
          </div>

          <div className="text-[12px] text-gray-700 space-y-0.5 pt-1 border-t border-dashed border-gray-200">
            <p className="pt-1.5"><span className="font-semibold text-gray-500">{person.detailLabel}:</span> {person.detailValue || '—'}</p>
            {person.detailLabel2 && (
              <p><span className="font-semibold text-gray-500">{person.detailLabel2}:</span> {person.detailValue2 || '—'}</p>
            )}
          </div>

          <div className="flex items-end justify-between pt-1">
            <div className="bg-white p-1 rounded-md border border-gray-100 shadow-sm">
              <QRCodeSVG value={person.code} size={62} level="H" />
            </div>
            <RainbowCorner className="w-20 h-12 -mb-1 -mr-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

type Tab = 'students' | 'staff' | 'volunteers';

export default function QRBadges() {
  const [tab, setTab] = useState<Tab>('students');

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group, mother_name, mother_mobile').eq('status', 'Active').order('class').order('roll_no');
      return data || [];
    }
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('id, staff_code, full_name, designation, mobile, qualification').eq('status', 'Active').order('staff_code');
      return data || [];
    }
  });

  const { data: volunteers = [], isLoading: volunteersLoading } = useQuery({
    queryKey: ['volunteers-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('volunteers').select('id, volunteer_code, full_name, organization, school_class, mobile').eq('status', 'Active').order('volunteer_code');
      return data || [];
    }
  });

  const handlePrintAll = () => window.print();

  const isLoading = tab === 'students' ? studentsLoading : tab === 'staff' ? staffLoading : volunteersLoading;

  const badgeData: { person: BadgePerson; role: BadgeRole }[] =
    tab === 'students'
      ? students.map((s: any) => ({
          role: 'STUDENT' as BadgeRole,
          person: {
            id: s.id,
            code: s.roll_no,
            full_name: s.full_name,
            line1: s.class ? `Class: ${s.class}${s.group ? ` (${s.group})` : ''}` : '',
            detailLabel: "Mother's Name",
            detailValue: s.mother_name || '',
            detailLabel2: 'Mobile No',
            detailValue2: s.mother_mobile || '',
          },
        }))
      : tab === 'staff'
      ? staff.map((s: any) => ({
          role: 'STAFF' as BadgeRole,
          person: {
            id: s.id,
            code: s.staff_code,
            full_name: s.full_name,
            line1: s.designation ? `Designation: ${s.designation}` : '',
            detailLabel: 'Mobile No',
            detailValue: s.mobile || '',
            detailLabel2: 'Qualification',
            detailValue2: s.qualification || '',
          },
        }))
      : volunteers.map((v: any) => ({
          role: 'VOLUNTEER' as BadgeRole,
          person: {
            id: v.id,
            code: v.volunteer_code,
            full_name: v.full_name,
            line1: v.school_class ? `Class: ${v.school_class}` : '',
            detailLabel: 'School',
            detailValue: v.organization || '',
            detailLabel2: 'Mobile No',
            detailValue2: v.mobile || '',
          },
        }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">QR Badges</h2>
          <p className="text-muted-foreground">Printable ID cards for scanning attendance</p>
        </div>
        <Button onClick={handlePrintAll}>
          <Printer className="w-4 h-4 mr-2" />
          Print All Badges
        </Button>
      </div>

      <div className="flex gap-2 no-print border-b border-border">
        {(['students', 'staff', 'volunteers'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground animate-pulse">Generating badges...</div>
      ) : badgeData.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No {tab} found to generate badges for.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:grid-cols-2 print:gap-6 print:p-4">
          {badgeData.map(({ person, role }, index) => (
            <Badge key={person.id} person={person} role={role} index={index} />
          ))}
        </div>
      )}

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
];