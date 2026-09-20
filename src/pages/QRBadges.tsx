import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import {
  BadgePerson,
  BadgeRole,
  StudentBadge,
  ProfessionalBadge,
  VolunteerCardV2,
} from '@/components/badges/PersonBadge';

type Tab = 'students' | 'staff' | 'volunteers' | 'directors';

export default function QRBadges() {
  const [tab, setTab] = useState<Tab>('students');

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENTS;
      const { data } = await supabase.from('students').select('id, roll_no, full_name, class, group, mother_name, mother_mobile, father_mobile, photo_url, photo_position').eq('status', 'Active').order('roll_no');
      return data || [];
    }
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('id, staff_code, full_name, designation, mobile, qualification, photo_url, staff_category, photo_position').eq('status', 'Active').in('staff_category', ['Staff', 'Helper']).order('staff_code');
      return data || [];
    }
  });

  const { data: directors = [], isLoading: directorsLoading } = useQuery({
    queryKey: ['directors-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('staff').select('id, staff_code, full_name, designation, mobile, qualification, photo_url, staff_category, photo_position').eq('status', 'Active').in('staff_category', ['Director', 'Adviser']).order('staff_code');
      return data || [];
    }
  });

  const { data: volunteers = [], isLoading: volunteersLoading } = useQuery({
    queryKey: ['volunteers-badges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('volunteers').select('id, volunteer_code, full_name, organization, school_class, mobile, photo_url, photo_position, photo_zoom').eq('status', 'Active').order('volunteer_code');
      return data || [];
    }
  });

  const { data: decorations = [] } = useQuery({
    queryKey: ['card-decorations'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data } = await supabase.from('card_decorations').select('*').eq('active', true);
      return data || [];
    }
  });

  const studentDecorations = decorations.filter((d: any) => d.card_type === 'student');

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
            photoPosition: s.photo_position,
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
            photoPosition: s.photo_position,
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
            photoPosition: v.photo_position,
            photoZoom: v.photo_zoom,
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
            photoPosition: d.photo_position,
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-8 pt-3 print:grid-cols-2 print:gap-6 print:pt-6 print:p-4">
          {badgeData.map(({ person, role }, index) => (
            role === 'STUDENT'
              ? <StudentBadge key={person.id} person={person} index={index} decorations={studentDecorations} />
              : role === 'VOLUNTEER'
              ? <VolunteerCardV2 key={person.id} person={person} index={index} />
              : <ProfessionalBadge key={person.id} person={person} role={role} index={index} />
          ))}
        </div>
      )}

      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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