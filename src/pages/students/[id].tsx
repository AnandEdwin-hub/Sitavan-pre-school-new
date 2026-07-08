import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Student } from '@/types/database';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Download, Phone, MapPin, Edit, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_STUDENT as Student;
      const { data, error } = await supabase.from('students').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Student;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  if (!student) {
    return <div className="p-8 text-center text-red-500">Student not found</div>;
  }

  const initials = student.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handlePrintQR = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex-1">Student Profile</h2>
        <Button variant="outline" className="bg-white">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: ID Card */}
        <Card className="md:col-span-1 overflow-hidden relative">
          <div className="h-24 bg-gradient-to-r from-primary/80 to-primary"></div>
          <CardContent className="pt-0 relative px-6 pb-6 text-center">
            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm mx-auto -mt-12 flex items-center justify-center text-3xl font-bold text-primary mb-4 z-10 relative">
              {initials}
            </div>
            
            <h3 className="text-xl font-bold text-foreground">{student.full_name}</h3>
            <p className="text-muted-foreground font-mono mt-1">{student.roll_no}</p>
            
            <div className="flex justify-center gap-2 mt-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                CLASS {student.class}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                {student.group} GROUP
              </span>
            </div>
            
            <div className="mt-4 inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {student.status}
            </div>

            <div className="mt-8 bg-gray-50 rounded-xl p-4 flex flex-col items-center">
              <div className="bg-white p-3 rounded-lg shadow-sm print-only-qr">
                <QRCodeSVG value={student.roll_no} size={140} level="H" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">Scan to mark attendance</p>
              <div className="flex gap-2 mt-4 w-full">
                <Button variant="outline" size="sm" className="w-full bg-white" onClick={handlePrintQR}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Details Tabs */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start bg-white border border-border h-12 p-1">
              <TabsTrigger value="profile" className="px-6">Profile</TabsTrigger>
              <TabsTrigger value="attendance" className="px-6">Attendance</TabsTrigger>
              <TabsTrigger value="documents" className="px-6">Documents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 border-b pb-2">Personal Details</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date of Birth</p>
                      <p className="text-sm font-medium">{student.dob ? format(parseISO(student.dob), 'dd MMM yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Age</p>
                      <p className="text-sm font-medium">{student.age || '-'} years</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Gender</p>
                      <p className="text-sm font-medium">{student.gender || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date of Joining</p>
                      <p className="text-sm font-medium">{student.doj ? format(parseISO(student.doj), 'dd MMM yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Regular School</p>
                      <p className="text-sm font-medium">{student.regular_school || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Annual Fees</p>
                      <p className="text-sm font-medium">{student.annual_fees ? `₹${student.annual_fees}` : '-'}</p>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-8 border-b pb-2">Parent Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Father's Name</p>
                      <p className="text-sm font-medium mb-3">{student.father_name || '-'}</p>
                      {student.father_mobile && (
                        <a href={`tel:${student.father_mobile}`} className="flex items-center text-sm text-blue-600 hover:underline">
                          <Phone className="w-3.5 h-3.5 mr-2" />
                          {student.father_mobile}
                        </a>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Mother's Name</p>
                      <p className="text-sm font-medium mb-3">{student.mother_name || '-'}</p>
                      {student.mother_mobile && (
                        <a href={`tel:${student.mother_mobile}`} className="flex items-center text-sm text-blue-600 hover:underline">
                          <Phone className="w-3.5 h-3.5 mr-2" />
                          {student.mother_mobile}
                        </a>
                      )}
                    </div>
                  </div>

                  {student.remarks && (
                    <>
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 mt-8 border-b pb-2">Remarks</h4>
                      <p className="text-sm text-gray-700 bg-amber-50 p-4 rounded-lg border border-amber-100">{student.remarks}</p>
                    </>
                  )}
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

            <TabsContent value="documents" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-6">
                   <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded shadow-sm">
                          <CheckCircle2 className={`w-5 h-5 ${student.aadhar_number ? 'text-green-500' : 'text-gray-300'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Aadhar Card</p>
                          <p className="text-xs text-muted-foreground">{student.aadhar_number ? 'Recorded' : 'Not recorded'}</p>
                        </div>
                      </div>
                      <div className="font-mono text-sm">{student.aadhar_number || '-'}</div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded shadow-sm">
                          {student.caste_cert ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">Caste Certificate</p>
                          <p className="text-xs text-muted-foreground">{student.caste_cert ? 'Provided' : 'Not provided'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${student.caste_cert ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {student.caste_cert ? 'Yes' : 'No'}
                      </span>
                    </div>
                   </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const MOCK_STUDENT: Partial<Student> = {
  id: '1', 
  roll_no: 'SPS001', 
  full_name: 'Aarav Sharma', 
  class: 'LKG', 
  group: 'BEG', 
  status: 'Active', 
  gender: 'Male', 
  father_name: 'Ramesh Sharma',
  mother_name: 'Pooja Sharma',
  father_mobile: '+91 9876543210',
  dob: '2019-05-14',
  doj: '2023-04-01',
  age: 4,
  regular_school: 'Delhi Public School',
  annual_fees: 15000,
  aadhar_number: '1234 5678 9012',
  caste_cert: false,
  remarks: 'Very active in class. Needs to focus on writing skills.'
};
