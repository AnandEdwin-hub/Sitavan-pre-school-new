import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarPlus, AlertTriangle, Trash2, CalendarOff } from 'lucide-react';
import type { Holiday } from '@/types/database';

const MOCK_HOLIDAYS: Holiday[] = [];

export default function HolidayManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [newDate, setNewDate] = useState(todayStr);
  const [newReason, setNewReason] = useState('');
  const [fcReason, setFcReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_HOLIDAYS;
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const todaysEntry = holidays.find(h => h.date === todayStr);

  const addHoliday = async (date: string, type: 'Holiday' | 'Forced Closure', reason: string) => {
    setIsSaving(true);
    try {
      if (!isSupabaseConfigured) {
        toast({ title: 'Added (mock mode)', description: 'Supabase not configured — nothing was saved.' });
        return;
      }
      const { error } = await supabase.from('holidays').insert({
        date,
        type,
        reason: reason || null,
        created_by: user?.id ?? null,
      });
      if (error) {
        if (error.code === '23505') {
          toast({ variant: 'destructive', title: 'Already exists', description: `${date} is already marked as a holiday or closure.` });
        } else {
          throw error;
        }
        return;
      }
      toast({ title: type === 'Forced Closure' ? 'Marked as Forced Closure' : 'Holiday added', description: date });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holiday-today'] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const removeHoliday = async (id: string) => {
    try {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Removed' });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holiday-today'] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to remove' });
    }
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    addHoliday(newDate, 'Holiday', newReason.trim());
    setNewReason('');
  };

  const handleConfirmFC = () => {
    addHoliday(todayStr, 'Forced Closure', fcReason.trim());
    setFcReason('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Holiday Manager</h2>
        <p className="text-muted-foreground">Plan holidays ahead, or mark today closed at short notice</p>
      </div>

      {/* Emergency Forced Closure */}
      <Card className="border-2 border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Emergency Closure
          </CardTitle>
          <CardDescription>Use this for same-day closures — heavy rain, fog, landslide, govt instructions, etc.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaysEntry ? (
            <div className="flex items-center justify-between bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <CalendarOff className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-sm">
                    Today ({format(new Date(), 'd MMM yyyy')}) is marked as{' '}
                    <Badge variant={todaysEntry.type === 'Forced Closure' ? 'destructive' : 'secondary'}>
                      {todaysEntry.type}
                    </Badge>
                  </p>
                  {todaysEntry.reason && <p className="text-xs text-muted-foreground mt-1">{todaysEntry.reason}</p>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeHoliday(todaysEntry.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Undo
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Reason (optional but recommended)</Label>
                <Input
                  placeholder="e.g. Heavy rain, road blocked"
                  value={fcReason}
                  onChange={(e) => setFcReason(e.target.value)}
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isSaving} className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Mark Today as Forced Closure
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close school for today?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark {format(new Date(), 'EEEE, d MMMM yyyy')} as a Forced Closure. Attendance
                      scanning will be disabled for the rest of the day and the calendar will show it as FC
                      for every student. You can undo this from this page if it was a mistake.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmFC} className="bg-destructive hover:bg-destructive/90">
                      Yes, close school today
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>

      {/* Planned Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-primary" /> Planned Holidays</CardTitle>
          <CardDescription>Add these at the start of the month — festivals, breaks, etc. Sundays are automatically treated as a weekly holiday and don't need to be added here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="sm:w-44"
              required
            />
            <Input
              placeholder="Reason (e.g. Diwali)"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSaving || !newDate}>
              <CalendarPlus className="w-4 h-4 mr-2" /> Add
            </Button>
          </form>

          <div className="divide-y divide-border border rounded-lg">
            {isLoading && (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
            )}
            {!isLoading && holidays.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No holidays added yet.</div>
            )}
            {holidays.map((h) => (
              <div key={h.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm w-24">{format(new Date(h.date + 'T00:00:00'), 'd MMM yyy')}</span>
                  <Badge variant={h.type === 'Forced Closure' ? 'destructive' : 'secondary'}>{h.type}</Badge>
                  {h.reason && <span className="text-sm text-muted-foreground">{h.reason}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeHoliday(h.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
