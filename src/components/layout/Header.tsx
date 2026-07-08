import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export function Header({ setMobileOpen }: HeaderProps) {
  const location = useLocation();

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/students') return 'Students Overview';
    if (path === '/students/new') return 'Add Student';
    if (path.startsWith('/students/')) return 'Student Profile';
    if (path === '/attendance/scan') return 'Scan Attendance';
    if (path === '/attendance/manual') return 'Manual Override';
    if (path === '/attendance/calendar') return 'Attendance Calendar';
    if (path === '/attendance/reports') return 'Attendance Reports';
    if (path === '/qr-badges') return 'QR Badges';
    if (path === '/settings') return 'Settings';
    return '';
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 no-print">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <h1 className="text-xl font-semibold text-gray-900">{getPageTitle(location.pathname)}</h1>
        </div>
      </div>
    </header>
  );
}
