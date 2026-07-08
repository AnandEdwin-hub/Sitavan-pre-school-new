import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, UserPlus, School } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_SETTINGS = {
  id: '',
  school_start_time: '09:00',
  late_threshold_minutes: 5,
  very_late_threshold_minutes: 10,
  location: 'Mt Abu, Rajasthan',
};

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [centerName, setCenterName] = useState('Sitavan Pre-School');
  const [location, setLocation] = useState(DEFAULT_SETTINGS.location);
  const [startTime, setStartTime] = useState(DEFAULT_SETTINGS.school_start_time);
  const [lateMins, setLateMins] = useState(DEFAULT_SETTINGS.late_threshold_minutes);
  const [veryLateMins, setVeryLateMins] = useState(DEFAULT_SETTINGS.very_late_threshold_minutes);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Fetch the single settings row (there's one per center; for now we just take the first row)
  const { data: settingsRow, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Populate local form state once the row loads
  useEffect(() => {
    if (settingsRow) {
      setLocation(settingsRow.location);
      setStartTime(settingsRow.school_start_time.slice(0, 5)); // 'HH:MM:SS' -> 'HH:MM'
      setLateMins(settingsRow.late_threshold_minutes);
      setVeryLateMins(settingsRow.very_late_threshold_minutes);
    }
  }, [settingsRow]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      if (!isSupabaseConfigured) {
        toast({ title: 'Settings saved', description: '(Mock mode — Supabase not configured)' });
        return;
      }

      const payload = {
        school_start_time: startTime,
        late_threshold_minutes: lateMins,
        very_late_threshold_minutes: veryLateMins,
        location,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = settingsRow
        ? await supabase.from('settings').update(payload).eq('id', settingsRow.id)
        : await supabase.from('settings').insert(payload);

      if (error) throw error;

      toast({ title: 'Settings saved', description: 'Changes are now shared across all staff devices.' });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    toast({ 
      title: 'Invite Sent', 
      description: `An invitation has been sent to ${inviteEmail}. (Mock action)`,
    });
    setInviteEmail('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h2>
        <p className="text-muted-foreground">Configure app behavior and staff access</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="w-5 h-5 text-primary" /> School Info</CardTitle>
            <CardDescription>Basic center details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Center Name</Label>
              <Input value={centerName} onChange={(e) => setCenterName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input defaultValue="2026-2027" disabled className="bg-gray-50" />
            </div>
            <Button onClick={saveSettings} disabled={isSaving} className="w-full mt-2"><Save className="w-4 h-4 mr-2" /> Save Details</Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Rules</CardTitle>
              <CardDescription>Shared across all staff devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isLoading} />
                <p className="text-xs text-muted-foreground">Scans within the "Present" window below count as on time.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Late (L) after (mins)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={lateMins}
                    onChange={(e) => setLateMins(Number(e.target.value))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Very Late (LL) after (mins)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={veryLateMins}
                    onChange={(e) => setVeryLateMins(Number(e.target.value))}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                e.g. start {startTime}, Late {lateMins} min → P until {lateMins} min past start, L until {veryLateMins} min past start, LL after that.
              </p>
              <Button onClick={saveSettings} disabled={isSaving} variant="secondary" className="w-full">
                {isSaving ? 'Saving...' : 'Save Attendance Rules'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Staff Management</CardTitle>
              <CardDescription>Invite new teachers/admins</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="email" 
                      placeholder="teacher@sitavansps.edu" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Button type="submit">Invite</Button>
                  </div>
                </div>
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-xs border border-amber-200">
                  <strong>Note:</strong> Sending real invites requires Supabase Service Role Key configuration on the backend. This is currently running in mock mode.
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
