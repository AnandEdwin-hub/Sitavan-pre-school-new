import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center w-28 h-28 mb-4">
            <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-card shadow-md flex items-center justify-center">
              <img src="/logo.png" alt="Sitavan Pre-School" className="w-14 h-14 object-contain" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading Sitavan Pre-School...</p>
        </div>
      </div>
    );
  }

  // If Supabase isn't configured, we let them through with mock UI, but show a banner
  if (!user && isSupabaseConfigured) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {!isSupabaseConfigured && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm font-medium text-center no-print">
          Supabase is not configured. The app is running in preview mode with local/mock data.
        </div>
      )}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Header setMobileOpen={setMobileOpen} />
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
