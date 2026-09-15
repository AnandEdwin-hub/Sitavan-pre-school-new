import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Staff } from '@/types/database';
import { ArrowLeft, Printer, Phone, Mail, Edit, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { ProfessionalBadge, BadgePerson, BadgeRole } from '@/components/badges/PersonBadge';

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  type StaffWithBadgeFields = Staff & { staff_category?: string | null; photo_position?: number | null };

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STAFF as StaffWithBadgeFields;
      const { data, error } = await supabase.from('staff').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as StaffWithBadgeFields;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  if (!staff) {
    return <div className="p-8 text-center text-red-500">Staff member not found</div>;
  }

  const role: BadgeRole = staff.staff_category === 'Helper' || staff.designation === 'Helper'
    ? 'HELPER'
    : staff.staff_category === 'Director' || staff.designation === 'Director'
    ? 'DIRECTOR'
    : staff.staff_category === 'Adviser' || staff.designation === 'Adviser'
    ? 'ADVISER'
    : 'STAFF';

  const badgePerson: BadgePerson = {
    id: staff.id,
    code: staff.staff_code,
    full_name: staff.full_name,
    photo_url: staff.photo_url,
    photoPosition: staff.photo_position ?? undefined,
    line1: staff.designation ? `Designation: ${staff.designation}` : '',
    detailLabel: 'Mobile No',
    detailValue: staff.mobile || '',
    detailLabel2: 'Qualification',
    detailValue2: staff.qualification || '',
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex-1">Staff Profile</h2>
        <Button variant="outline" className="bg-white">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: ID Card */}
        <div className="md:col-span-1 space-y-4">
          <ProfessionalBadge person={badgePerson} role={role} index={0} />

          <Card className="no-print">
            <CardContent className="p-4">
              <Button variant="outline" size="sm" className="w-full bg-white" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print ID Card
              </Button>
            </CardContent>
          </Card>

          <div className="no-print text-center">
            <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {staff.status}
            </div>
          </div>
        </div>

        {/* Right Column: Details Tabs */}
        <div className="md:col-span-2 space-y-6 no-print">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start bg-white border border-border h-12 p-1">
              <TabsTrigger value="profile" className="px-6">Profile</TabsTrigger>
              <TabsTrigger value="attendance" className="px-6">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 border-b pb-2">Employment Details</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Designation</p>
                      <p className="text-sm font-medium">{staff.designation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Qualification</p>
                      <p className="text-sm font-medium">{staff.qualification || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date of Joining</p>
                      <p className="text-sm font-medium">{staff.doj ? format(parseISO(staff.doj), 'dd MMM yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="text-sm font-medium">{staff.status || '-'}</p>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-8 border-b pb-2">Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Mobile</p>
                      {staff.mobile ? (
                        <a href={`tel:${staff.mobile}`} className="flex items-center text-sm text-blue-600 hover:underline">
                          <Phone className="w-3.5 h-3.5 mr-2" />
                          {staff.mobile}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">-</p>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      {staff.email ? (
                        <a href={`mailto:${staff.email}`} className="flex items-center text-sm text-blue-600 hover:underline">
                          <Mail className="w-3.5 h-3.5 mr-2" />
                          {staff.email}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">-</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Attendance History</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm">Detailed calendar heatmap view goes here. Showing monthly present/absent trends.</p>
                  <Button variant="outline" className="mt-6">View Full Report</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const MOCK_STAFF: Partial<Staff> = {
  id: '1',
  staff_code: 'SITST2601',
  full_name: 'Sonali Alika',
  designation: 'Teacher',
  mobile: '89550 65059',
  email: 'sonali@example.com',
  qualification: 'B.A. + B.Ed',
  doj: '2024-06-01',
  status: 'Active',
};
