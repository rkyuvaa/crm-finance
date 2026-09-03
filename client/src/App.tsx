import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import { ToastProvider } from '@/components/ui/ToastHost';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/auth/RequireAuth';

import { AuthPermissionProvider } from '@/context/AuthPermissionContext';

import LoginPage from '@/pages/LoginPage';
import LeadsPage from '@/pages/LeadsPage';
import LeadDetailPage from '@/pages/LeadDetailPage';
import HRPage from '@/pages/HRPage';
import PlmPage from '@/pages/PlmPage';
import ProjectsPage from '@/pages/ProjectsPage';
import TasksPage from '@/pages/TasksPage';
import GenericStagePage from '@/pages/GenericStagePage';
import ReportsPage from '@/pages/ReportsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/SettingsPage';
import ConfigurationPage from '@/pages/ConfigurationPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import PublicFinancierDocumentView from '@/pages/PublicFinancierDocumentView';

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
                <Route path="/opportunities" element={<LeadsPage />} />
                <Route path="/opportunities/:id" element={<LeadDetailPage />} />
                <Route path="/hr" element={<HRPage />} />
                <Route path="/plm" element={<PlmPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                
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
