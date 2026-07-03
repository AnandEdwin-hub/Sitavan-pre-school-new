import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, UserPlus, School } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [lateTime, setLateTime] = useState(localStorage.getItem('setting_lateTime') || '09:30');
  const [inviteEmail, setInviteEmail] = useState('');

  const saveSettings = () => {
    localStorage.setItem('setting_lateTime', lateTime);
    toast({ title: 'Settings saved', description: 'Local settings updated successfully.' });
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
              <Input defaultValue="Sitavan Pre-School" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input defaultValue="Aburoad, Rajasthan" />
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input defaultValue="2023-2024" disabled className="bg-gray-50" />
            </div>
            <Button onClick={saveSettings} className="w-full mt-2"><Save className="w-4 h-4 mr-2" /> Save Details</Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Rules</CardTitle>
              <CardDescription>Configure late marking thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Late Mark Threshold (Time)</Label>
                <div className="flex gap-2">
                  <Input type="time" value={lateTime} onChange={(e) => setLateTime(e.target.value)} />
                  <Button onClick={saveSettings} variant="secondary">Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Scans after this time will be marked as Late instead of Present.</p>
              </div>
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
