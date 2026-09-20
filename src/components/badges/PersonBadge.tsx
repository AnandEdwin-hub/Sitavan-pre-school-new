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

export interface CardDecoration {
  id?: string | number;
  image_url: string;
  width_px?: number;
  bottom_px?: number;
  left_px?: number;
  right_px?: number;
}

export function StudentBadge({ person, index, decorations = [] }: { person: BadgePerson; index: number; decorations?: CardDecoration[] }) {
  const initials = person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none">
      <div className="relative bg-[#3E6B35] rounded-[26px] shadow-md overflow-hidden aspect-[2.125/3.375] flex flex-col items-center">

        <svg className="absolute" style={{ top: -14, left: -16 }} width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="45" fill="#4A7A40" /></svg>
        <svg className="absolute" style={{ top: 16, right: -22 }} width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#B0532C" /></svg>
        <svg className="absolute" style={{ top: 44, left: 12 }} width="26" height="26" viewBox="0 0 30 30">
          <circle cx="4" cy="4" r="2" fill="#FBF3E3" /><circle cx="12" cy="4" r="2" fill="#FBF3E3" />
          <circle cx="4" cy="12" r="2" fill="#FBF3E3" /><circle cx="12" cy="12" r="2" fill="#FBF3E3" />
        </svg>
        <svg className="absolute" style={{ top: 128, right: 6 }} width="22" height="22" viewBox="0 0 26 26"><path d="M13 2 L15.5 10 L24 13 L15.5 16 L13 24 L10.5 16 L2 13 L10.5 10 Z" fill="#B0532C" /></svg>

        <div className="relative w-full pt-3 px-4 flex flex-col items-center gap-0.5">
          <img src={LOGO_URL} alt="" className="w-11 h-11 rounded-full bg-white" />
          <div className="text-center">
            <p className="text-[12px] font-bold text-[#FFFDF6] leading-tight">Sitavan Pre-School</p>
            <p className="text-[7px] font-extrabold text-[#C9E0BE] tracking-wide">MOUNT ABU</p>
          </div>
        </div>

        <div className="relative w-full flex justify-center" style={{ margin: '10px 0 8px' }}>
          <div className="absolute rounded-full" style={{ width: 118, height: 118, top: -7, background: '#C99A3A' }} />

          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="relative w-[104px] h-[104px] rounded-full object-cover border-[4px] border-[#FDF9EF] bg-[#B0532C]"
              style={{ objectPosition: `center ${person.photoPosition ?? 50}%` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`relative w-[104px] h-[104px] rounded-full ${avatarColor} border-[4px] border-[#FDF9EF] flex items-center justify-center text-white text-2xl font-bold`}>
              {initials}
            </div>
          )}

          {decorations.map((d, i) => (
            <img
              key={d.id ?? i}
              src={d.image_url}
              alt=""
              className="absolute pointer-events-none"
              style={{ width: d.width_px ?? 70, bottom: d.bottom_px ?? 0, left: d.left_px, right: d.right_px }}
            />
          ))}
        </div>

        <div className="relative text-center">
          <p className="font-bold text-[19px] uppercase text-[#FFFDF6] leading-none">{person.full_name}</p>
          <span className="inline-block mt-1 text-[9px] font-extrabold tracking-wide bg-[#FBF3E3] text-[#6B4E00] px-3 py-0.5 rounded-full">
            STUDENT
          </span>
        </div>

        <div className="relative w-full mt-3 bg-[#FBF3E3] rounded-t-[24px] flex-1 flex flex-col items-center gap-3 pt-3 pb-2">
          <div className="w-[88%] pb-2 border-b-[1.5px] border-dashed border-[#E3D6B6]">
            <div className="grid grid-cols-3 gap-x-1 text-center">
              <p className="text-[8px] font-extrabold text-[#93690D]">CLASS</p>
              <p className="text-[8px] font-extrabold text-[#93690D]">MOTHER'S NAME</p>
              <p className="text-[8px] font-extrabold text-[#93690D]">MOBILE NO</p>
              <p className="text-[11px] font-extrabold text-[#2E4A28] mt-0.5">{person.line1.replace('Class: ', '') || '—'}</p>
              <p className="text-[11px] font-extrabold text-[#2E4A28] mt-0.5 truncate">{person.detailValue || '—'}</p>
              <p className="text-[11px] font-extrabold text-[#2E4A28] mt-0.5">{person.detailValue2 || '—'}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-extrabold text-[#93690D]">ROLL NO <span className="text-[#2E4A28]">{person.code}</span></p>
            <div className="bg-white p-1 rounded-lg border-[2px] border-[#3E6B35]">
              <QRCodeSVG value={person.code} size={56} level="H" fgColor="#3E6B35" />
            </div>
          </div>
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
    <div className="relative w-full max-w-[280px] mx-auto break-inside-avoid print:max-w-none print:w-[48%]">
      <div className="relative bg-white rounded-[22px] border-[3px] shadow-md overflow-hidden aspect-[2.125/3.375] flex flex-col" style={{ borderColor: s.border }}>

        <div className="relative w-full shrink-0" style={{ height: '38%', backgroundColor: s.pillBg }}>
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d="M0,70 C60,100 120,45 180,68 C240,90 270,55 300,62 L300,100 L0,100 Z" fill="rgba(255,255,255,0.14)" />
            <path d="M0,85 C80,55 160,100 300,75 L300,100 L0,100 Z" fill="rgba(255,255,255,0.09)" />
          </svg>
          <div className="absolute top-1.5 left-2.5 right-2.5 flex flex-col items-center gap-1">
            <img src={LOGO_URL} alt="" className="w-11 h-11 rounded-full bg-white p-0.5 shadow shrink-0" />
            <div className="text-center">
              <p className="text-[11px] font-bold text-white leading-tight">Sitavan Pre-School</p>
              <p className="text-[7px] font-semibold text-white/80 tracking-wide">MOUNT ABU</p>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center" style={{ marginTop: '-72px' }}>
          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.full_name}
              className="w-[136px] h-[136px] rounded-full object-cover border-4 border-white shadow-md bg-white"
              style={{ objectPosition: `center ${person.photoPosition ?? 50}%` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={`w-[136px] h-[136px] rounded-full ${avatarColor} border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-bold`}>
              {initials}
            </div>
          )}
        </div>

        <div className="text-center px-3 pt-1">
          <h3 className="font-bold text-[14px] leading-tight truncate" style={{ color: s.nameColor }}>{person.full_name}</h3>
          <span
            className="inline-block mt-0.5 text-[8.5px] font-bold px-2 py-0.5 rounded-full tracking-wide"
            style={{ backgroundColor: `${s.pillBg}1A`, color: s.pillBg }}
          >
            {role}
          </span>
        </div>

        <div className="px-4 pt-1.5 text-center space-y-0.5">
          <p className="text-[9.5px] font-semibold" style={{ color: s.labelColor }}>
            ID No: <span className="font-bold" style={{ color: s.nameColor }}>{person.code}</span>
          </p>
          {person.line1 && (
            <p className="text-[9.5px] font-semibold" style={{ color: s.labelColor }}>{person.line1}</p>
          )}
          <p className="text-[9.5px] font-semibold" style={{ color: s.labelColor }}>
            {person.detailLabel}: <span className="font-bold" style={{ color: s.nameColor }}>{person.detailValue || '—'}</span>
          </p>
          {person.detailLabel2 && (
            <p className="text-[9.5px] font-semibold" style={{ color: s.labelColor }}>
              {person.detailLabel2}: <span className="font-bold" style={{ color: s.nameColor }}>{person.detailValue2 || '—'}</span>
            </p>
          )}
        </div>

        <div className="relative flex justify-center pb-2 mt-auto">
          <div className="bg-white p-1 rounded-lg border shadow-sm" style={{ borderColor: s.border }}>
            <QRCodeSVG value={person.code} size={58} level="H" />
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
          <p className="text-[9px] font-semibold text-[#134E4A]/70">ID No: <span className="font-bold text-[#134E4A]">{person.code}</span></p>

          <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
            <QRCodeSVG value={person.code} size={58} level="H" fgColor="#134E4A" />
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <img src={LOGO_URL} alt="" className="w-10 h-10 rounded-full bg-white shadow-sm shrink-0" />
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-[#134E4A]">Sitavan Pre-School</p>
              <p className="text-[9px] font-semibold text-[#134E4A]/70">MOUNT ABU</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
