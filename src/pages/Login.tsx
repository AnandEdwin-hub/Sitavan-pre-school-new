import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Hero panel */}
      <div className="relative bg-sidebar pt-14 pb-20 px-4 flex flex-col items-center rounded-b-[2.5rem] shadow-sm">
        <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center shadow-md mb-4">
          <img src="/logo.png" alt="Sitavan Pre-School" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">
          Sitavan Pre-School
        </h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">
          Sign in to manage your school
        </p>
      </div>

      {/* Form card, overlapping the hero panel */}
      <div className="flex-1 flex justify-center px-4 -mt-10">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-6 sm:p-8 h-fit">
          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-xl text-sm">
              <p className="font-semibold mb-1">Setup Required</p>
              <p>Supabase environment variables are missing. You can click Login to view the app UI without backend connectivity.</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@sitavansps.edu"
                className="rounded-full px-4 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                className="rounded-full px-4 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive font-medium">{error}</div>
            )}

            <Button type="submit" className="w-full rounded-full h-11 mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}