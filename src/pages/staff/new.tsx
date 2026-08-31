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
import { useToast } from '@/hooks/use-toast';

const staffSchema = z.object({
  staff_code: z.string().min(1, 'Staff code is required').regex(/^SITST\d+$/i, 'Expected a code like SITST2601'),
  full_name: z.string().min(1, 'Full name is required'),
  designation: z.enum(['Teacher', 'Helper', 'Director', 'Adviser']),
  mobile: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
  qualification: z.string().optional().nullable(),
  doj: z.string().optional().nullable(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

type FormValues = z.infer<typeof staffSchema>;

export default function AddStaff() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      staff_code: '',
      full_name: '',
      designation: 'Teacher',
      status: 'Active',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        setTimeout(() => {
          toast({ title: 'Staff added', description: 'Mock data saved successfully.' });
          navigate('/staff');
        }, 1000);
        return;
      }

      const { error } = await supabase.from('staff').insert({
        ...data,
        center_id: '00000000-0000-0000-0000-000000000001',
      });
      if (error) throw error;

      toast({ title: 'Staff added', description: 'Record created successfully.' });
      navigate('/staff');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to add staff member' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Add New Staff Member</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Staff Details</CardTitle>
            <CardDescription>Basic registration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff_code">Staff Code *</Label>
                <Input id="staff_code" {...form.register('staff_code')} placeholder="e.g. SITST2601" className="uppercase" />
                {form.formState.errors.staff_code && <p className="text-xs text-destructive">{form.formState.errors.staff_code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Select onValueChange={(val) => form.setValue('designation', val as any)} defaultValue={form.getValues('designation')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Helper">Helper</SelectItem>
                    <SelectItem value="Director">Director</SelectItem>
                    <SelectItem value="Adviser">Adviser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" {...form.register('full_name')} placeholder="Staff member's full name" />
              {form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" {...form.register('mobile')} placeholder="e.g. 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} placeholder="name@example.com" />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input id="qualification" {...form.register('qualification')} placeholder="e.g. B.A. + B.Ed" />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Staff Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
