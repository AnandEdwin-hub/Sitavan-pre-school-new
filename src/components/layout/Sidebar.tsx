import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  HeartHandshake,
  CalendarCheck,
  QrCode,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

type Section = 'students' | 'staff' | 'volunteers' | 'attendance';

const sectionForPath = (path: string): Section | null => {
  if (path.startsWith('/students')) return 'students';
  if (path.startsWith('/staff')) return 'staff';
  if (path.startsWith('/volunteers')) return 'volunteers';
  if (path.startsWith('/attendance')) return 'attendance';
  return null;
};

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isStaff, isViewer } = useAuth();
  const queryClient = useQueryClient();
  const [openSection, setOpenSection] = React.useState<Section | null>(() =>
    sectionForPath(location.pathname)
  );

  // Open the section that contains the current page (refresh / navigation)
  React.useEffect(() => {
    const current = sectionForPath(location.pathname);
    if (current) setOpenSection(current);
  }, [location.pathname]);

  const toggle = (section: Section) =>
    setOpenSection((cur) => (cur === section ? null : section));

  const studentsOpen = openSection === 'students';
  const staffOpen = openSection === 'staff';
  const volunteersOpen = openSection === 'volunteers';
  const attendanceOpen = openSection === 'attendance';

  // Highlight the parent header when the current page is inside it
  const headerClass = (section: Section) =>
    `flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-lg ${
      sectionForPath(location.pathname) === section ? 'bg-sidebar-accent' : ''
    }`;

  // Attendance items grouped; hidden by role, empty groups dropped
  const attendanceGroups = [
    {
      label: 'Mark',
      items: [
        { to: '/attendance/scan', label: 'Scan In', show: isAdmin || isStaff },
        { to: '/attendance/face-kiosk', label: 'Face Scan', show: isAdmin || isStaff },
        { to: '/attendance/manual', label: 'Manual Override', show: isAdmin },
      ],
    },
    {
      label: 'Review',
      items: [
        { to: '/attendance/calendar', label: 'Calendar View', show: isAdmin || isViewer },
        { to: '/attendance/reports', label: 'Reports', show: isAdmin || isViewer },
      ],
    },
    {
      label: 'Setup',
      items: [
        { to: '/attendance/face-enroll', label: 'Face Enrollment', show: isAdmin },
        { to: '/attendance/holidays', label: 'Holiday Manager', show: isAdmin },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length > 0);

  const isActive = (path: string) => location.pathname === path;

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 text-sidebar-foreground">
      <div className="p-5 flex flex-col items-center gap-2 text-center">
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md p-1 overflow-hidden">
          <img src="/logo.png" alt="Sitavan Pre-School" className="w-full h-full object-contain" />
        </div>
        <span className="text-base font-bold tracking-tight leading-[1.15]">Sitavan Pre-School</span>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/dashboard'))}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>

        {/* Students Group */}
        <div className="pt-2">
          <button
            onClick={() => toggle('students')}
            className={headerClass('students')}
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
              {(isAdmin || isStaff) && (
                <Link to="/students/new" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/students/new'))}>
                  Add New
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Staff Group */}
        {(isAdmin || isViewer) && (
        <div className="pt-2">
          <button
            onClick={() => toggle('staff')}
            className={headerClass('staff')}
          >
            <div className="flex items-center gap-3">
              <UserCog className="w-5 h-5" />
              <span>Staff</span>
            </div>
            {staffOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {staffOpen && (
            <div className="mt-1 space-y-1 pl-10">
              <Link to="/staff" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/staff'))}>
                Overview
              </Link>
              {isAdmin && (
                <Link to="/staff/new" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/staff/new'))}>
                  Add New
                </Link>
              )}
            </div>
          )}
        </div>
        )}

        {/* Volunteers Group */}
        <div className="pt-2">
          <button
            onClick={() => toggle('volunteers')}
            className={headerClass('volunteers')}
          >
            <div className="flex items-center gap-3">
              <HeartHandshake className="w-5 h-5" />
              <span>Volunteers</span>
            </div>
            {volunteersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {volunteersOpen && (
            <div className="mt-1 space-y-1 pl-10">
              <Link to="/volunteers" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/volunteers'))}>
                Overview
              </Link>
              {(isAdmin || isStaff) && (
                <Link to="/volunteers/new" onClick={() => setMobileOpen(false)} className={navItemClass(isActive('/volunteers/new'))}>
                  Add New
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Attendance Group */}
        {attendanceGroups.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => toggle('attendance')}
            className={headerClass('attendance')}
          >
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5" />
              <span>Attendance</span>
            </div>
            {attendanceOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {attendanceOpen && (
            <div className="mt-1 pl-10">
              {attendanceGroups.map((group, idx) => (
                <div key={group.label} className="space-y-1">
                  {attendanceGroups.length > 1 && (
                    <div className={`px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 ${idx === 0 ? 'pt-1' : 'pt-3'}`}>
                      {group.label}
                    </div>
                  )}
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={navItemClass(isActive(item.to))}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {isAdmin && (
          <>
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
          </>
        )}
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
