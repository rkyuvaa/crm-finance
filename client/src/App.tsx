import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import { ToastProvider } from '@/components/ui/ToastHost';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/auth/RequireAuth';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ApplicationsPage = lazy(() => import('@/pages/ApplicationsPage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const GenericStagePage = lazy(() => import('@/pages/GenericStagePage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ConfigurationPage = lazy(() => import('@/pages/ConfigurationPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));

function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/documents" element={<GenericStagePage section="documents" />} />
              <Route path="/verification" element={<GenericStagePage section="verification" />} />
              <Route path="/finance" element={<GenericStagePage section="finance" />} />
              <Route path="/sanction" element={<GenericStagePage section="sanction" />} />
              <Route path="/delivery" element={<GenericStagePage section="delivery" />} />
              <Route path="/disbursement" element={<GenericStagePage section="disbursement" />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/configuration" element={<ConfigurationPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  );
}
