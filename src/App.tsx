import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Layout } from '@/components/layout/Layout';
import { useAuth, type AppRole } from '@/hooks/useAuth';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const StudentsOverview = lazy(() => import('@/pages/students/index'));
const StudentProfile = lazy(() => import('@/pages/students/[id]'));
const AddStudent = lazy(() => import('@/pages/students/new'));
const StaffOverview = lazy(() => import('@/pages/staff/index'));
const AddStaff = lazy(() => import('@/pages/staff/new'));
const StaffProfile = lazy(() => import('@/pages/staff/[id]'));
const VolunteersOverview = lazy(() => import('@/pages/volunteers/index'));
const AddVolunteer = lazy(() => import('@/pages/volunteers/new'));
const VolunteerProfile = lazy(() => import('@/pages/volunteers/[id]'));
const ScanAttendance = lazy(() => import('@/pages/attendance/Scan'));
const ManualAttendance = lazy(() => import('@/pages/attendance/Manual'));
const FaceEnroll = lazy(() => import('@/pages/attendance/FaceEnroll'));
const FaceKiosk = lazy(() => import('@/pages/attendance/FaceKiosk'));
const CalendarAttendance = lazy(() => import('@/pages/attendance/Calendar'));
const ReportsAttendance = lazy(() => import('@/pages/attendance/Reports'));
const HolidayManager = lazy(() => import('@/pages/attendance/Holidays'));
const QRBadges = lazy(() => import('@/pages/QRBadges'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const ALL: AppRole[] = ['admin', 'staff', 'viewer'];
const ADMIN_STAFF: AppRole[] = ['admin', 'staff'];
const ADMIN_VIEWER: AppRole[] = ['admin', 'viewer'];
const ADMIN_ONLY: AppRole[] = ['admin'];

function RequireRole({ allow, children }: { allow: AppRole[]; children: ReactElement }) {
  const { loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">Loading...</div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-center">
        Your account has no access yet. Please contact the administrator.
      </div>
    );
  }

  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

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
                <Route path="/dashboard" element={<RequireRole allow={ALL}><Dashboard /></RequireRole>} />

                <Route path="/students">
                  <Route index element={<RequireRole allow={ALL}><StudentsOverview /></RequireRole>} />
                  <Route path="new" element={<RequireRole allow={ADMIN_STAFF}><AddStudent /></RequireRole>} />
                  <Route path=":id" element={<RequireRole allow={ALL}><StudentProfile /></RequireRole>} />
                </Route>

                <Route path="/staff">
                  <Route index element={<RequireRole allow={ADMIN_VIEWER}><StaffOverview /></RequireRole>} />
                  <Route path="new" element={<RequireRole allow={ADMIN_ONLY}><AddStaff /></RequireRole>} />
                  <Route path=":id" element={<RequireRole allow={ADMIN_VIEWER}><StaffProfile /></RequireRole>} />
                </Route>

                <Route path="/volunteers">
                  <Route index element={<RequireRole allow={ALL}><VolunteersOverview /></RequireRole>} />
                  <Route path="new" element={<RequireRole allow={ADMIN_STAFF}><AddVolunteer /></RequireRole>} />
                  <Route path=":id" element={<RequireRole allow={ALL}><VolunteerProfile /></RequireRole>} />
                </Route>

                <Route path="/attendance">
                  <Route path="scan" element={<RequireRole allow={ADMIN_STAFF}><ScanAttendance /></RequireRole>} />
                  <Route path="face-kiosk" element={<RequireRole allow={ADMIN_STAFF}><FaceKiosk /></RequireRole>} />
                  <Route path="manual" element={<RequireRole allow={ADMIN_ONLY}><ManualAttendance /></RequireRole>} />
                  <Route path="face-enroll" element={<RequireRole allow={ADMIN_ONLY}><FaceEnroll /></RequireRole>} />
                  <Route path="calendar" element={<RequireRole allow={ADMIN_VIEWER}><CalendarAttendance /></RequireRole>} />
                  <Route path="reports" element={<RequireRole allow={ADMIN_VIEWER}><ReportsAttendance /></RequireRole>} />
                  <Route path="holidays" element={<RequireRole allow={ADMIN_ONLY}><HolidayManager /></RequireRole>} />
                </Route>

                <Route path="/qr-badges" element={<RequireRole allow={ADMIN_ONLY}><QRBadges /></RequireRole>} />
                <Route path="/settings" element={<RequireRole allow={ADMIN_ONLY}><Settings /></RequireRole>} />

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