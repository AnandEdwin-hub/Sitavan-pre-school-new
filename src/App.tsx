import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Layout } from '@/components/layout/Layout';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const StudentsOverview = lazy(() => import('@/pages/students/index'));
const StudentProfile = lazy(() => import('@/pages/students/[id]'));
const AddStudent = lazy(() => import('@/pages/students/new'));
const ScanAttendance = lazy(() => import('@/pages/attendance/Scan'));
const ManualAttendance = lazy(() => import('@/pages/attendance/Manual'));
const CalendarAttendance = lazy(() => import('@/pages/attendance/Calendar'));
const ReportsAttendance = lazy(() => import('@/pages/attendance/Reports'));
const HolidayManager = lazy(() => import('@/pages/attendance/Holidays'));
const QRBadges = lazy(() => import('@/pages/QRBadges'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center">
                Loading...
              </div>
            }
          >
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
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;