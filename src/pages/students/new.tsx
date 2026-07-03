import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const studentSchema = z.object({
  roll_no: z.string().min(1, 'Roll No is required'),
  full_name: z.string().min(1, 'Full name is required'),
  class: z.enum(['0', 'NUR', 'LKG', 'HKG', '1', '2']),
  group: z.enum(['BEG', 'ADV']),
  gender: z.enum(['Male', 'Female']).optional().nullable(),
  dob: z.string().optional().nullable(),
  doj: z.string().optional().nullable(),
  age: z.coerce.number().optional().nullable(),
  father_name: z.string().optional().nullable(),
  father_mobile: z.string().optional().nullable(),
  mother_name: z.string().optional().nullable(),
  mother_mobile: z.string().optional().nullable(),
  aadhar_number: z.string().optional().nullable(),
  caste_cert: z.boolean().default(false),
  regular_school: z.string().optional().nullable(),
  annual_fees: z.coerce.number().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'On Leave']).default('Active'),
});

type FormValues = z.infer<typeof studentSchema>;

export default function AddStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      roll_no: '',
      full_name: '',
      class: 'NUR',
      group: 'BEG',
      status: 'Active',
      caste_cert: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        // Mock save
        setTimeout(() => {
          toast({ title: "Student added", description: "Mock data saved successfully." });
          navigate('/students');
        }, 1000);
        return;
      }

      const { error } = await supabase.from('students').insert({
        ...data,
        center_id: '00000000-0000-0000-0000-000000000001',
      });
      if (error) throw error;
      
      toast({ title: "Student added", description: "Record created successfully." });
      navigate('/students');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to add student" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Add New Student</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Academic Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Profile</CardTitle>
              <CardDescription>Basic school registration details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roll_no">Roll Number *</Label>
                <Input id="roll_no" {...form.register('roll_no')} placeholder="e.g. SPS001" />
                {form.formState.errors.roll_no && <p className="text-xs text-destructive">{form.formState.errors.roll_no.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" {...form.register('full_name')} placeholder="Student's full name" />
                {form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select onValueChange={(val) => form.setValue('class', val as any)} defaultValue={form.getValues('class')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="NUR">NUR</SelectItem>
                      <SelectItem value="LKG">LKG</SelectItem>
                      <SelectItem value="HKG">HKG</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Group *</Label>
                  <Select onValueChange={(val) => form.setValue('group', val as any)} defaultValue={form.getValues('group')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEG">BEG (Beginner)</SelectItem>
                      <SelectItem value="ADV">ADV (Advanced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doj">Date of Joining</Label>
                <Input id="doj" type="date" {...form.register('doj')} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select onValueChange={(val) => form.setValue('status', val as any)} defaultValue={form.getValues('status')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="regular_school">Regular School (if any)</Label>
                <Input id="regular_school" {...form.register('regular_school')} placeholder="e.g. DPS" />
              </div>
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Demographic and family information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" {...form.register('dob')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" {...form.register('age')} placeholder="Years" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select onValueChange={(val) => form.setValue('gender', val as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="father_name">Father's Name</Label>
                  <Input id="father_name" {...form.register('father_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="father_mobile">Father's Mobile</Label>
                  <Input id="father_mobile" {...form.register('father_mobile')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="mother_name">Mother's Name</Label>
                  <Input id="mother_name" {...form.register('mother_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother_mobile">Mother's Mobile</Label>
                  <Input id="mother_mobile" {...form.register('mother_mobile')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadhar_number">Aadhar Number</Label>
                <Input id="aadhar_number" {...form.register('aadhar_number')} placeholder="XXXX XXXX XXXX" />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                <div className="space-y-0.5">
                  <Label>Caste Certificate</Label>
                  <p className="text-xs text-muted-foreground">Has the certificate been provided?</p>
                </div>
                <Switch 
                  checked={form.watch('caste_cert')}
                  onCheckedChange={(checked) => form.setValue('caste_cert', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Full width section */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks / Notes</Label>
                  <textarea 
                    id="remarks" 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...form.register('remarks')} 
                    placeholder="Any special medical conditions, allergies, or notes for teachers..." 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Student Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
