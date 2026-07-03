import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  QrCode,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [studentsOpen, setStudentsOpen] = React.useState(true);
  const [attendanceOpen, setAttendanceOpen] = React.useState(true);

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (pathPrefix: string) => location.pathname.startsWith(pathPrefix);

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 text-sidebar-foreground">
      <div className="p-6 flex items-center gap-3">
        <span className="text-2xl">📚</span>
        <span className="text-xl font-bold tracking-tight">Sitavan SPS</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/dashboard'))}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>

        {/* Students Group */}
        <div className="pt-2">
          <button
            onClick={() => setStudentsOpen(!studentsOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span>Students</span>
            </div>
            {studentsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {studentsOpen && (
            <div className="mt-1 space-y-1 pl-10">
              <Link to="/students" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/students'))}>
                Overview
              </Link>
              <Link to="/students/new" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/students/new'))}>
                Add New
              </Link>
            </div>
          )}
        </div>

        {/* Attendance Group */}
        <div className="pt-2">
          <button
            onClick={() => setAttendanceOpen(!attendanceOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
          >
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5" />
              <span>Attendance</span>
            </div>
            {attendanceOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {attendanceOpen && (
            <div className="mt-1 space-y-1 pl-10">
              <Link to="/attendance/scan" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/attendance/scan'))}>
                Scan In
              </Link>
              <Link to="/attendance/manual" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/attendance/manual'))}>
                Manual Override
              </Link>
              <Link to="/attendance/calendar" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/attendance/calendar'))}>
                Calendar View
              </Link>
              <Link to="/attendance/reports" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/attendance/reports'))}>
                Reports
              </Link>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Link to="/qr-badges" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/qr-badges'))}>
            <QrCode className="w-5 h-5" />
            QR Badges
          </Link>
        </div>

        <div className="pt-2">
          <Link to="/settings" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/settings'))}>
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-sm flex-1 bg-white">{navContent}</div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 z-10 no-print">
        {navContent}
      </div>
    </>
  );
}
