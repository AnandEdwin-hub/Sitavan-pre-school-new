import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Layout } from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import StudentsOverview from '@/pages/students/index';
import StudentProfile from '@/pages/students/[id]';
import AddStudent from '@/pages/students/new';
import ScanAttendance from '@/pages/attendance/scan';
import ManualAttendance from '@/pages/attendance/manual';
import CalendarAttendance from '@/pages/attendance/calendar';
import ReportsAttendance from '@/pages/attendance/reports';
import HolidayManager from '@/pages/attendance/holidays';
import QRBadges from '@/pages/qr-badges';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route path="/students">
                <Route index element={<StudentsOverview />} />
                <Route path="new" element={<AddStudent />} />
                <Route path=":id" element={<StudentProfile />} />
              </Route>

              <Route path="/attendance">
                <Route path="scan" element={<ScanAttendance />} />
                <Route path="manual" element={<ManualAttendance />} />
                <Route path="calendar" element={<CalendarAttendance />} />
                <Route path="reports" element={<ReportsAttendance />} />
                <Route path="holidays" element={<HolidayManager />} />
              </Route>

              <Route path="/qr-badges" element={<QRBadges />} />
              <Route path="/settings" element={<Settings />} />
              
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
