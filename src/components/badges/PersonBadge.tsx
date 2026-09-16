import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const ASSETS = 'https://thsvlzxckrvpxduhbykk.supabase.co/storage/v1/object/public/card-assets';
export const LOGO_URL = 'https://thsvlzxckrvpxduhbykk.supabase.co/storage/v1/object/public/card-assets/logo.png';

// ---- Original decorative artwork (hand-built SVG, not copied from any existing brand) ----

const AVATAR_COLORS = [
  'bg-rose-400', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-violet-400', 'bg-cyan-400', 'bg-orange-400', 'bg-pink-400',
];

export type BadgeRole = 'STUDENT' | 'STAFF' | 'HELPER' | 'VOLUNTEER' | 'DIRECTOR' | 'ADVISER';

const ROLE_STYLES: Record<string, {
  border: string; bg: string; barColors: string[];
  pillBg: string; pillText: string; nameColor: string; labelColor: string;
}> = {
  STAFF: {
    border: '#E8CE85', bg: '#FEFAEE', barColors: ['#C99A3A', '#B0532C', '#3E6B35'],
    pillBg: '#A6790C', pillText: '#FFFBEA', nameColor: '#6B4E00', labelColor: '#93690D',
  },
  HELPER: {
    border: '#E8CE85', bg: '#FEFAEE', barColors: ['#C99A3A', '#B0532C', '#3E6B35'],
    pillBg: '#A6790C', pillText: '#FFFBEA', nameColor: '#6B4E00', labelColor: '#93690D',
  },
  STAFF_LEGACY: {
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

const LEGACY_STAFF_CODES = ['SITST2604', 'SITST2605'];

export interface BadgePerson {
  id: string;
  code: string; // QR value: roll_no / staff_code / volunteer_code
  full_name: string;
  photo_url?: string | null;
  photoPosition?: number; // 0 (top) to 100 (bottom), default 50
  photoZoom?: number; // scale factor, e.g. 0.85 = zoomed out 15%, default 0.85
  line1: string; // e.g. "Class: LKG (BEG)" or "Designation: Teacher" or "School: Kendriya Vidyalaya"
  detailLabel: string; // e.g. "Mother's Name" or "Mobile No" or "Contact"
  detailValue: string;
  detailLabel2?: string;
  detailValue2?: string;
}

export function StudentBadge({ person, index }: { person: BadgePerson; index: number }) {
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
              className="relative w-24 h-24 rounded-full object-cover border-[3px] border-[#C99A3A] shadow-sm bg-white"
              style={{ objectPosition: `center ${person.photoPosition ?? 50}%` }}
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

export function ProfessionalBadge({ person, role, index }: { person: BadgePerson; role: BadgeRole; index: number }) {
  const initials = person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const s = LEGACY_STAFF_CODES.includes(person.code) ? ROLE_STYLES.STAFF_LEGACY : (ROLE_STYLES[role] || ROLE_STYLES.STAFF);

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 w-12 h-5 rounded-full bg-white border-[3px] shadow-sm"
        style={{ borderColor: s.pillBg }}
      />

      <div className="relative bg-white rounded-[22px] border-[3px] shadow-md overflow-hidden aspect-[2.125/3.375] flex flex-col" style={{ borderColor: s.border }}>

        <div className="relative w-full shrink-0" style={{ height: '34%', backgroundColor: s.pillBg }}>
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d="M0,70 C60,100 120,45 180,68 C240,90 270,55 300,62 L300,100 L0,100 Z" fill="rgba(255,255,255,0.14)" />
            <path d="M0,85 C80,55 160,100 300,75 L300,100 L0,100 Z" fill="rgba(255,255,255,0.09)" />
          </svg>
          <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-col items-center gap-0.5">
            <img src={LOGO_URL} alt="" className="w-9 h-9 rounded-full bg-white p-0.5 shadow shrink-0" />
            <div className="text-center">
              <p className="text-[11px] font-bold text-white leading-tight">Sitavan Pre-School</p>
              <p className="text-[7px] font-semibold text-white/80 tracking-wide">MOUNT ABU</p>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center" style={{ marginTop: '-68px' }}>
          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="w-[136px] h-[136px] rounded-full object-cover border-4 border-white shadow-md bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`w-[136px] h-[136px] rounded-full ${avatarColor} border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-bold`}>
              {initials}
            </div>
          )}
        </div>

        <div className="text-center px-3 pt-1.5">
          <h3 className="font-bold text-[15px] leading-tight truncate" style={{ color: s.nameColor }}>{person.full_name}</h3>
          <span
            className="inline-block mt-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-wide"
            style={{ backgroundColor: `${s.pillBg}1A`, color: s.pillBg }}
          >
            {role}
          </span>
        </div>

        <div className="px-4 pt-2 text-center space-y-1">
          <p className="text-[10px] font-semibold" style={{ color: s.labelColor }}>
            ID No: <span className="font-bold" style={{ color: s.nameColor }}>{person.code}</span>
          </p>
          {person.line1 && (
            <p className="text-[10px] font-semibold" style={{ color: s.labelColor }}>{person.line1}</p>
          )}
          <p className="text-[10px] font-semibold" style={{ color: s.labelColor }}>
            {person.detailLabel}: <span className="font-bold" style={{ color: s.nameColor }}>{person.detailValue || '—'}</span>
          </p>
          {person.detailLabel2 && (
            <p className="text-[10px] font-semibold" style={{ color: s.labelColor }}>
              {person.detailLabel2}: <span className="font-bold" style={{ color: s.nameColor }}>{person.detailValue2 || '—'}</span>
            </p>
          )}
        </div>

        <div className="relative flex justify-center py-2 mt-auto">
          <div className="bg-white p-1 rounded-lg border shadow-sm" style={{ borderColor: s.border }}>
            <QRCodeSVG value={person.code} size={56} level="H" />
          </div>
        </div>

        <div className="h-2 w-full shrink-0" style={{ backgroundColor: s.pillBg }} />
      </div>
    </div>
  );
}

export function VolunteerCardV2({ person, index }: { person: BadgePerson; index: number }) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      <div className="relative bg-white rounded-[22px] border-[3px] border-[#134E4A] shadow-md overflow-hidden aspect-[2.125/3.375] flex flex-col">

        <div className="relative w-full shrink-0 bg-[#0F172A]" style={{ height: '46%' }}>
          <div className="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-[#F4B400] z-10" />
          <div className="absolute top-1.5 right-2 flex gap-[3px] z-10">
            {[0, 1, 2].map(i => <div key={i} className="w-[2px] h-4 bg-white/70" />)}
          </div>
          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${person.photoPosition ?? 25}%`, transform: `scale(${person.photoZoom ?? 1})` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`w-full h-full ${avatarColor} flex items-center justify-center text-white text-3xl font-bold`}>
              {initials}
            </div>
          )}
        </div>

        <div className="relative h-2 bg-[#134E4A] shrink-0">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-[#C0392B]" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2 min-h-0">
          <h3 className="font-bold text-[14px] text-[#134E4A] leading-tight text-center truncate max-w-full">{person.full_name}</h3>
          <span className="inline-block text-[8px] font-bold text-[#134E4A] bg-[#F4B400]/25 px-2 py-0.5 rounded-full tracking-wide">VOLUNTEER</span>
          {person.line1 && <p className="text-[9.5px] font-semibold text-[#C0392B] tracking-wide">{person.line1}</p>}
          <p className="text-[9px] font-semibold text-[#134E4A]/70">ID No: <span className="font-bold text-[#134E4A]">{person.code}</span></p>

          <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <QRCodeSVG value={person.code} size={48} level="H" fgColor="#134E4A" />
          </div>

          <div className="flex items-center gap-1.5 -mt-0.5">
            <img src={LOGO_URL} alt="" className="w-8 h-8 rounded-full bg-white shadow-sm shrink-0" />
            <div className="leading-tight">
              <p className="text-[9.5px] font-bold text-[#134E4A]">Sitavan Pre-School</p>
              <p className="text-[8px] font-semibold text-[#134E4A]/70">MOUNT ABU</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
