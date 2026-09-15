import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Volunteer } from '@/types/database';
import { ArrowLeft, Printer, Phone, Mail, Edit, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { VolunteerCardV2, BadgePerson } from '@/components/badges/PersonBadge';

export default function VolunteerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  type VolunteerWithBadgeFields = Volunteer & { photo_position?: number | null };

  const { data: volunteer, isLoading } = useQuery({
    queryKey: ['volunteer', id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_VOLUNTEER as VolunteerWithBadgeFields;
      const { data, error } = await supabase.from('volunteers').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as VolunteerWithBadgeFields;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  if (!volunteer) {
    return <div className="p-8 text-center text-red-500">Volunteer not found</div>;
  }

  const badgePerson: BadgePerson = {
    id: volunteer.id,
    code: volunteer.volunteer_code,
    full_name: volunteer.full_name,
    photo_url: volunteer.photo_url,
    photoPosition: volunteer.photo_position ?? undefined,
    line1: volunteer.school_class ? `Class: ${volunteer.school_class}` : '',
    detailLabel: 'School',
    detailValue: volunteer.organization || '',
    detailLabel2: 'Mobile No',
    detailValue2: volunteer.mobile || '',
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex-1">Volunteer Profile</h2>
        <Button variant="outline" className="bg-white">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: ID Card */}
        <div className="md:col-span-1 space-y-4">
          <VolunteerCardV2 person={badgePerson} index={0} />

          <Card className="no-print">
            <CardContent className="p-4">
              <Button variant="outline" size="sm" className="w-full bg-white" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print ID Card
              </Button>
            </CardContent>
          </Card>

          <div className="no-print text-center">
            <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {volunteer.status}
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
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 border-b pb-2">Volunteer Details</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">School / Organization</p>
                      <p className="text-sm font-medium">{volunteer.organization || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Class</p>
                      <p className="text-sm font-medium">{volunteer.school_class || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date of Joining</p>
                      <p className="text-sm font-medium">{volunteer.doj ? format(parseISO(volunteer.doj), 'dd MMM yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="text-sm font-medium">{volunteer.status || '-'}</p>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-8 border-b pb-2">Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Mobile</p>
                      {volunteer.mobile ? (
                        <a href={`tel:${volunteer.mobile}`} className="flex items-center text-sm text-blue-600 hover:underline">
                          <Phone className="w-3.5 h-3.5 mr-2" />
                          {volunteer.mobile}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">-</p>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      {volunteer.email ? (
                        <a href={`mailto:${volunteer.email}`} className="flex items-center text-sm text-blue-600 hover:underline">
                          <Mail className="w-3.5 h-3.5 mr-2" />
                          {volunteer.email}
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

const MOCK_VOLUNTEER: Partial<Volunteer> = {
  id: '1',
  volunteer_code: 'SITVL2601',
  full_name: 'Krishna Rana',
  organization: 'Kendriya Vidyalaya School',
  school_class: '5th',
  mobile: '89496 85726',
  email: 'krishna@example.com',
  doj: '2024-07-01',
  status: 'Active',
};
