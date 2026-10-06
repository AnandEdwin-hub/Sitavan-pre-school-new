import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { peopleTable } from '@/lib/people';
import { useAuth } from '@/hooks/useAuth';
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
  const { isViewer } = useAuth();
  const queryClient = useQueryClient();
  const [editingLeave, setEditingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ status: 'Active', resigned_on: '', leaving_reason: '', archive_notes: '' });
  const [leaveMsg, setLeaveMsg] = useState('');

  type StaffWithBadgeFields = Staff & { staff_category?: string | null; photo_position?: number | null; resigned_on?: string | null; leaving_reason?: string | null; archive_notes?: string | null };

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-member', id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STAFF as StaffWithBadgeFields;
      const { data, error } = await supabase.from(peopleTable('staff')).select('*').eq('id', id as string).single();
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
    detailLabel: isViewer ? '' : 'Mobile No',
    detailValue: staff.mobile || '',
    detailLabel2: 'Qualification',
    detailValue2: staff.qualification || '',
  };

  const handlePrint = () => window.print();

  const startLeaveEdit = () => {
    setLeaveForm({
      status: staff.status || 'Active',
      resigned_on: staff.resigned_on || '',
      leaving_reason: staff.leaving_reason || '',
      archive_notes: staff.archive_notes || '',
    });
    setLeaveMsg('');
    setEditingLeave(true);
  };

  const saveLeave = async () => {
    const { error } = await supabase.from('staff').update({
      status: leaveForm.status,
      resigned_on: leaveForm.resigned_on || null,
      leaving_reason: leaveForm.leaving_reason || null,
      archive_notes: leaveForm.archive_notes || null,
    }).eq('id', staff.id);
    if (error) {
      setLeaveMsg('Could not save: ' + error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['staff-member', id] });
    await queryClient.invalidateQueries({ queryKey: ['staff'] });
    setEditingLeave(false);
    setLeaveMsg('Saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex-1">Staff Profile</h2>
        {!isViewer && (<Button variant="outline" className="bg-white">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: ID Card */}
        <div className="md:col-span-1 space-y-4">
          <ProfessionalBadge person={badgePerson} role={role} index={0} />

          {!isViewer && (<Card className="no-print">
            <CardContent className="p-4">
              <Button variant="outline" size="sm" className="w-full bg-white" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print ID Card
              </Button>
            </CardContent>
          </Card>)}

          <div className="no-print text-center">
            <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${staff.status === 'Resigned' ? 'bg-amber-100 text-amber-800' : staff.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
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

                  {!isViewer && (<>
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-8 border-b pb-2">Leaving Details</h4>
                  {editingLeave ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <select className="w-full border rounded-md h-9 px-2 text-sm bg-white" value={leaveForm.status} onChange={(e) => setLeaveForm({ ...leaveForm, status: e.target.value })}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Resigned">Resigned</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date of leaving</p>
                          <input type="date" className="w-full border rounded-md h-9 px-2 text-sm bg-white" value={leaveForm.resigned_on} onChange={(e) => setLeaveForm({ ...leaveForm, resigned_on: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Reason for leaving</p>
                        <textarea rows={2} className="w-full border rounded-md px-2 py-1 text-sm bg-white" value={leaveForm.leaving_reason} onChange={(e) => setLeaveForm({ ...leaveForm, leaving_reason: e.target.value })} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <textarea rows={2} className="w-full border rounded-md px-2 py-1 text-sm bg-white" value={leaveForm.archive_notes} onChange={(e) => setLeaveForm({ ...leaveForm, archive_notes: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveLeave}>Save</Button>
                        <Button size="sm" variant="outline" className="bg-white" onClick={() => setEditingLeave(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date of leaving</p>
                          <p className="text-sm font-medium">{staff.resigned_on ? format(parseISO(staff.resigned_on), 'dd MMM yyyy') : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Reason for leaving</p>
                          <p className="text-sm font-medium">{staff.leaving_reason || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm font-medium">{staff.archive_notes || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" className="bg-white" onClick={startLeaveEdit}>Edit leaving details</Button>
                        {leaveMsg && <span className="text-xs text-muted-foreground">{leaveMsg}</span>}
                      </div>
                    </div>
                  )}
                  </>)}
                  {!isViewer && (<><h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-8 border-b pb-2">Contact</h4>
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
                  </div></>)}
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
