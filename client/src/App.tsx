import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import { ToastProvider } from '@/components/ui/ToastHost';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/auth/RequireAuth';

import { AuthPermissionProvider } from '@/context/AuthPermissionContext';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/pages/LeadDetailPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const PlmPage = lazy(() => import('@/pages/PlmPage'));
const GenericStagePage = lazy(() => import('@/pages/GenericStagePage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ConfigurationPage = lazy(() => import('@/pages/ConfigurationPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const PublicFinancierDocumentView = lazy(() => import('@/pages/PublicFinancierDocumentView'));

// Admin RBAC Pages
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const RoleManagementPage = lazy(() => import('@/pages/admin/RoleManagementPage'));
const DepartmentManagementPage = lazy(() => import('@/pages/admin/DepartmentManagementPage'));
const PermissionRegistryPage = lazy(() => import('@/pages/admin/PermissionRegistryPage'));
const AccessAuditLogPage = lazy(() => import('@/pages/admin/AccessAuditLogPage'));

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
        <AuthPermissionProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/financier/documents-view/:token" element={<PublicFinancierDocumentView />} />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/:id" element={<LeadDetailPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/plm" element={<PlmPage />} />
                
                {/* Administration / Access Control */}
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/roles" element={<RoleManagementPage />} />
                <Route path="/admin/departments" element={<DepartmentManagementPage />} />
                <Route path="/admin/permissions" element={<PermissionRegistryPage />} />
                <Route path="/admin/audit-logs" element={<AccessAuditLogPage />} />

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
        </AuthPermissionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
