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

const volunteerSchema = z.object({
  volunteer_code: z.string().min(1, 'Volunteer code is required').regex(/^SITVL\d+$/i, 'Expected a code like SITVL2601'),
  full_name: z.string().min(1, 'Full name is required'),
  mobile: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
  organization: z.string().optional().nullable(),
  school_class: z.string().optional().nullable(),
  doj: z.string().optional().nullable(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

type FormValues = z.infer<typeof volunteerSchema>;

export default function AddVolunteer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      volunteer_code: '',
      full_name: '',
      status: 'Active',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        setTimeout(() => {
          toast({ title: 'Volunteer added', description: 'Mock data saved successfully.' });
          navigate('/volunteers');
        }, 1000);
        return;
      }

      const { error } = await supabase.from('volunteers').insert({
        ...data,
        role: 'Volunteer',
        center_id: '00000000-0000-0000-0000-000000000001',
      });
      if (error) throw error;

      toast({ title: 'Volunteer added', description: 'Record created successfully.' });
      navigate('/volunteers');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to add volunteer' });
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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Add New Volunteer</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Volunteer Details</CardTitle>
            <CardDescription>Basic registration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="volunteer_code">Volunteer Code *</Label>
              <Input id="volunteer_code" {...form.register('volunteer_code')} placeholder="e.g. SITVL2601" className="uppercase" />
              {form.formState.errors.volunteer_code && <p className="text-xs text-destructive">{form.formState.errors.volunteer_code.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" {...form.register('full_name')} placeholder="Volunteer's full name" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organization">School Attending</Label>
                <Input id="organization" {...form.register('organization')} placeholder="e.g. Kendriya Vidyalaya School" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_class">Class</Label>
                <Input id="school_class" {...form.register('school_class')} placeholder="e.g. 7th" />
              </div>
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
            {isSubmitting ? 'Saving...' : 'Save Volunteer Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
