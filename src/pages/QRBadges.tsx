import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const ASSETS = 'https://thsvlzxckrvpxduhbykk.supabase.co/storage/v1/object/public/card-assets';
const LOGO_URL = 'https://thsvlzxckrvpxduhbykk.supabase.co/storage/v1/object/public/card-assets/logo.png';

// ---- Original decorative artwork (hand-built SVG, not copied from any existing brand) ----

const AVATAR_COLORS = [
  'bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-violet-400', 'bg-cyan-400', 'bg-orange-400', 'bg-pink-400',
];

type BadgeRole = 'STUDENT' | 'STAFF' | 'HELPER' | 'VOLUNTEER' | 'DIRECTOR' | 'ADVISER';

const ROLE_STYLES: Record<string, {
  border: string; bg: string; barColors: string[];
  pillBg: string; pillText: string; nameColor: string; labelColor: string;
}> = {
  STAFF: {
    border: '#DDB89C', bg: '#FDF6F1', barColors: ['#B0532C', '#C99A3A', '#3E6B35'],
    pillBg: '#B0532C', pillText: '#FFF7F0', nameColor: '#7A3418', labelColor: '#A15A36',
  },
  HELPER: {
    border: '#DDB89C', bg: '#FDF6F1', barColors: ['#B0532C', '#C99A3A', '#3E6B35'],
    pillBg: '#B0532C', pillText: '#FFF7F0', nameColor: '#7A3418', labelColor: '#A15A36',
  },
  VOLUNTEER: {
    border: '#E8CE85', bg: '#FEFAEE', barColors: ['#C99A3A', '#B0532C', '#3E6B35'],
    pillBg: '#A6790C', pillText: '#FFFBEA', nameColor: '#6B4E00', labelColor: '#93690D',
  },
  DIRECTOR: {
    border: '#C3C6F2', bg: '#F5F5FE', barColors: ['#4338CA', '#C99A3A', '#3E6B35'],
    pillBg: '#4338CA', pillText: '#EEF0FF', nameColor: '#312E81', labelColor: '#4642A6',
  },
  ADVISER: {
    border: '#C3C6F2', bg: '#F5F5FE', barColors: ['#4338CA', '#C99A3A', '#3E6B35'],
    pillBg: '#4338CA', pillText: '#EEF0FF', nameColor: '#312E81', labelColor: '#4642A6',
  },
};

interface BadgePerson {
  id: string;
  code: string; // QR value: roll_no / staff_code / volunteer_code
  full_name: string;
  photo_url?: string | null;
  line1: string; // e.g. "Class: LKG (BEG)" or "Designation: Teacher" or "School: Kendriya Vidyalaya"
  detailLabel: string; // e.g. "Mother's Name" or "Mobile No" or "Contact"
  detailValue: string;
  detailLabel2?: string;
  detailValue2?: string;
}

function StudentBadge({ person, index }: { person: BadgePerson; index: number }) {
  const initials = person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 w-12 h-5 rounded-full bg-[#FBF3E3] border-[3px] border-[#C99A3A] shadow-sm" />

      <div className="relative bg-[#FBF3E3] rounded-[22px] border-[3px] border-[#C99A3A] shadow-md overflow-hidden pt-3 aspect-[2.125/3.375] flex flex-col">
        <div className="flex justify-center gap-[3px] px-3 pb-2">
          {['#3E6B35', '#C99A3A', '#B0532C', '#3E6B35', '#C99A3A', '#B0532C', '#3E6B35', '#C99A3A'].map((c, i) => (
            <div key={i} className="w-4 h-2.5 rounded-[1px]" style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="relative px-4 pb-2 flex items-center gap-2">
          <img src={LOGO_URL} alt="Sitavan Pre-School" className="w-10 h-10 rounded-full object-cover shrink-0" />
          <div>
            <p className="text-[15px] leading-tight font-bold text-[#2E4A28]">Sitavan Pre-School</p>
            <p className="text-[9px] font-semibold text-[#7A6A45] tracking-wide">MOUNT ABU</p>
          </div>
          <img src={`${ASSETS}/bee.png`} alt="" className="absolute top-1 right-3 w-7 h-7 rotate-6" />
        </div>

        <div className="relative px-4 pt-1 pb-2 flex justify-center">
          <img src={`${ASSETS}/rainbow_sun.png`} alt="" className="absolute -top-2 -right-1 w-16 opacity-90" />
          <img src={`${ASSETS}/apple_tree.png`} alt="" className="absolute top-0 left-1/2 -translate-x-1/2 w-40 opacity-[0.14] pointer-events-none" />

          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="relative w-24 h-24 rounded-full object-cover object-top border-[3px] border-[#C99A3A] shadow-sm bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`relative w-24 h-24 rounded-full ${avatarColor} border-[3px] border-[#C99A3A] shadow-sm flex items-center justify-center text-white text-2xl font-bold`}>
              {initials}
            </div>
          )}

          <img src={`${ASSETS}/deer.png`} alt="" className="absolute bottom-0 left-2 w-12" />
          <img src={`${ASSETS}/bear.png`} alt="" className="absolute bottom-0 right-2 w-12" />
        </div>

        <div className="relative text-center px-4">
          <h3 className="font-bold text-[#2E4A28] text-lg leading-tight truncate">{person.full_name}</h3>
          <span className="inline-block mt-1 text-[10px] font-bold text-[#412402] bg-[#C99A3A] px-3 py-1 rounded-full tracking-wide">
            STUDENT
          </span>
        </div>

        <div className="relative mx-4 mt-2 bg-white rounded-xl border border-[#E4D3A8] grid grid-cols-2 divide-x divide-[#E4D3A8]">
          <div className="p-2 border-b border-[#E4D3A8]">
            <p className="text-[9px] font-semibold text-[#7A6A45]">Roll No</p>
            <p className="text-[13px] font-bold text-[#2E4A28]">{person.code}</p>
          </div>
          <div className="p-2 border-b border-[#E4D3A8]">
            <p className="text-[9px] font-semibold text-[#7A6A45]">Class</p>
            <p className="text-[13px] font-bold text-[#2E4A28]">{person.line1.replace('Class: ', '') || '—'}</p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-semibold text-[#7A6A45]">Mother's Name</p>
            <p className="text-[13px] font-bold text-[#2E4A28] truncate">{person.detailValue || '—'}</p>
          </div>
          <div className="p-2">
            <p className="text-[9px] font-semibold text-[#7A6A45]">Mobile No</p>
            <p className="text-[13px] font-bold text-[#2E4A28]">{person.detailValue2 || '—'}</p>
          </div>
        </div>

        <div className="relative flex justify-center py-2 mt-auto">
          <div className="bg-white p-1 rounded-lg border border-[#E4D3A8] shadow-sm">
            <QRCodeSVG value={person.code} size={60} level="H" />
          </div>
        </div>

        <div className="flex justify-center gap-[3px] px-3 pb-2">
          {['#3E6B35', '#C99A3A', '#B0532C', '#3E6B35', '#C99A3A', '#B0532C', '#3E6B35', '#C99A3A'].map((c, i) => (
            <div key={i} className="w-4 h-2.5 rounded-[1px]" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfessionalBadge({ person, role, index }: { person: BadgePerson; role: BadgeRole; index: number }) {
  const initials = person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const s = ROLE_STYLES[role] || ROLE_STYLES.STAFF;

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 w-12 h-5 rounded-full border-[3px] shadow-sm"
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      />

      <div
        className="relative rounded-[22px] border-[3px] shadow-md overflow-hidden pt-3 aspect-[2.125/3.375] flex flex-col"
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      >
        <div className="flex justify-center gap-[3px] px-3 pb-2">
          {s.barColors.concat(s.barColors).slice(0, 8).map((c, i) => (
            <div key={i} className="w-4 h-2.5 rounded-[1px]" style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="px-4 pb-2 flex items-center gap-2">
          <img src={LOGO_URL} alt="Sitavan Pre-School" className="w-9 h-9 rounded-full object-cover shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] leading-tight font-bold" style={{ color: s.nameColor }}>Sitavan Pre-School</p>
            <p className="text-[8px] font-semibold tracking-wide" style={{ color: s.labelColor }}>MOUNT ABU, RAJASTHAN</p>
          </div>
        </div>

        <div className="px-4 pb-2 flex items-start gap-3">
          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="w-[72px] h-[72px] rounded-xl object-cover shrink-0 border-2 shadow-sm bg-white"
              style={{ borderColor: s.border }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              className={`w-[72px] h-[72px] rounded-xl ${avatarColor} border-2 shadow-sm flex items-center justify-center text-white text-xl font-bold shrink-0`}
              style={{ borderColor: s.border }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 pt-1">
            <h3 className="font-bold text-[15px] leading-tight truncate" style={{ color: s.nameColor }}>{person.full_name}</h3>
            <span
              className="inline-block mt-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-wide"
              style={{ backgroundColor: s.pillBg, color: s.pillText }}
            >
              {role}
            </span>
            {person.line1 && (
              <p className="text-[10px] font-semibold mt-1 truncate" style={{ color: s.labelColor }}>{person.line1}</p>
            )}
          </div>
        </div>

        <div className="relative mx-4 mt-1 bg-white rounded-xl border grid grid-cols-2 divide-x" style={{ borderColor: s.border }}>
          <div className="p-2 border-b" style={{ borderColor: s.border }}>
            <p className="text-[9px] font-semibold" style={{ color: s.labelColor }}>ID No</p>
            <p className="text-[13px] font-bold" style={{ color: s.nameColor }}>{person.code}</p>
          </div>
          <div className="p-2 border-b" style={{ borderColor: s.border }}>
            <p className="text-[9px] font-semibold" style={{ color: s.labelColor }}>{person.detailLabel}</p>
            <p className="text-[13px] font-bold truncate" style={{ color: s.nameColor }}>{person.detailValue || '—'}</p>
          </div>
          <div className="p-2 col-span-2">
            <p className="text-[9px] font-semibold" style={{ color: s.labelColor }}>{person.detailLabel2 || 'Contact'}</p>
            <p className="text-[13px] font-bold" style={{ color: s.nameColor }}>{person.detailValue2 || '—'}</p>
          </div>
        </div>

        <div className="relative flex justify-center py-2 mt-auto">
          <div className="bg-white p-1 rounded-lg border shadow-sm" style={{ borderColor: s.border }}>
            <QRCodeSVG value={person.code} size={60} level="H" />
          </div>
        </div>

        <div className="flex justify-center gap-[3px] px-3 pb-2">
          {s.barColors.concat(s.barColors).slice(0, 8).map((c, i) => (
            <div key={i} className="w-4 h-2.5 rounded-[1px]" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

type Tab = 'students' | 'staff' | 'volunteers' | 'directors';

export default function QRBadges() {
  const [tab, setTab] = useState<Tab>('students');

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group, mother_name, mother_mobile, father_mobile, photo_url').eq('status', 'Active').order('class').order('roll_no');
      return data || [];
    }
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('id, staff_code, full_name, designation, mobile, qualification, photo_url, staff_category').eq('status', 'Active').in('staff_category', ['Staff', 'Helper']).order('staff_code');
      return data || [];
    }
  });

  const { data: directors = [], isLoading: directorsLoading } = useQuery({
    queryKey: ['directors-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('id, staff_code, full_name, designation, mobile, qualification, photo_url, staff_category').eq('status', 'Active').in('staff_category', ['Director', 'Adviser']).order('staff_code');
      return data || [];
    }
  });

  const { data: volunteers = [], isLoading: volunteersLoading } = useQuery({
    queryKey: ['volunteers-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('volunteers').select('id, volunteer_code, full_name, organization, school_class, mobile, photo_url').eq('status', 'Active').order('volunteer_code');
      return data || [];
    }
  });

  const handlePrintAll = () => window.print();

  const isLoading = tab === 'students' ? studentsLoading : tab === 'staff' ? staffLoading : tab === 'volunteers' ? volunteersLoading : directorsLoading;

  const badgeData: { person: BadgePerson; role: BadgeRole }[] =
    tab === 'students'
      ? students.map((s: any) => ({
          role: 'STUDENT' as BadgeRole,
          person: {
            id: s.id,
            code: s.roll_no,
            full_name: s.full_name,
            photo_url: s.photo_url,
            line1: s.class ? `Class: ${s.class}${s.group ? ` (${s.group})` : ''}` : '',
            detailLabel: "Mother's Name",
            detailValue: s.mother_name || '',
            detailLabel2: 'Mobile No',
            detailValue2: s.mother_mobile || s.father_mobile || '',
          },
        }))
      : tab === 'staff'
      ? staff.map((s: any) => ({
          role: (s.staff_category === 'Helper' ? 'HELPER' : 'STAFF') as BadgeRole,
          person: {
            id: s.id,
            code: s.staff_code,
            full_name: s.full_name,
            photo_url: s.photo_url,
            line1: s.designation ? `Designation: ${s.designation}` : '',
            detailLabel: 'Mobile No',
            detailValue: s.mobile || '',
            detailLabel2: 'Qualification',
            detailValue2: s.qualification || '',
          },
        }))
      : tab === 'volunteers'
      ? volunteers.map((v: any) => ({
          role: 'VOLUNTEER' as BadgeRole,
          person: {
            id: v.id,
            code: v.volunteer_code,
            full_name: v.full_name,
            photo_url: v.photo_url,
            line1: v.school_class ? `Class: ${v.school_class}` : '',
            detailLabel: 'School',
            detailValue: v.organization || '',
            detailLabel2: 'Mobile No',
            detailValue2: v.mobile || '',
          },
        }))
      : directors.map((d: any) => ({
          role: (d.staff_category === 'Adviser' ? 'ADVISER' : 'DIRECTOR') as BadgeRole,
          person: {
            id: d.id,
            code: d.staff_code,
            full_name: d.full_name,
            photo_url: d.photo_url,
            line1: d.designation ? `Designation: ${d.designation}` : '',
            detailLabel: 'Mobile No',
            detailValue: d.mobile || '',
            detailLabel2: 'Qualification',
            detailValue2: d.qualification || '',
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
        {(['students', 'staff', 'volunteers', 'directors'] as Tab[]).map((t) => (
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
            role === 'STUDENT'
              ? <StudentBadge key={person.id} person={person} index={index} />
              : <ProfessionalBadge key={person.id} person={person} role={role} index={index} />
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