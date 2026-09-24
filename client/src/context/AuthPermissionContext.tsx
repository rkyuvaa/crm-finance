import React, { createContext, useContext, useMemo } from 'react';
import { useAppSelector } from '../app/hooks';
import { useGetUserEffectivePermissionsQuery } from '../api/rbacApi';

interface AuthPermissionContextType {
  can: (action: string, resource: string) => boolean;
  canAccessRoute: (path: string) => boolean;
  isSuperAdmin: boolean;
  effectivePermissionsMap: Record<string, boolean>;
  isLoading: boolean;
}

const AuthPermissionContext = createContext<AuthPermissionContextType>({
  can: () => true,
  canAccessRoute: () => true,
  isSuperAdmin: true,
  effectivePermissionsMap: {},
  isLoading: false,
});

export const AuthPermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id;

  const { data: effectiveData, isLoading } = useGetUserEffectivePermissionsQuery(userId ?? 0, {
    skip: !userId,
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
  });

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (effectiveData?.roles?.some((r) => r.toLowerCase().includes('admin'))) return true;
    return false;
  }, [user, effectiveData]);

  const effectivePermissionsMap = useMemo(() => {
    if (!effectiveData?.permissions) return {};
    const map: Record<string, boolean> = {};
    for (const p of effectiveData.permissions) {
      if (p.resource_code && p.action_code) {
        map[`${p.resource_code}:${p.action_code}`] = p.granted;
      }
      map[p.permission_code] = p.granted;
    }
    return map;
  }, [effectiveData]);

  const can = (action: string, resource: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    const key = `${resource}:${action}`;
    if (key in effectivePermissionsMap) {
      return effectivePermissionsMap[key];
    }
    const altKey = `${action}:${resource}`;
    if (altKey in effectivePermissionsMap) {
      return effectivePermissionsMap[altKey];
    }
    if (resource in effectivePermissionsMap) {
      return effectivePermissionsMap[resource];
    }
    return false; // Default Deny for unallocated/unmapped resources
  };

  const canAccessRoute = (path: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (path === '/') return true;

    if (path === '/plm') return can('view', 'plm');
    if (path.startsWith('/leads')) return can('view', 'leads');
    if (path.startsWith('/customers')) return can('view', 'customers');
    if (path.startsWith('/opportunities')) return can('view', 'opportunities');
    if (path.startsWith('/activities')) return can('view', 'activities');
    if (path === '/configuration') return can('view', 'crm_configuration');
    
    if (path === '/projects/configuration') return can('view', 'project_configuration');
    if (path.startsWith('/projects')) return can('view', 'projects');
    if (path.startsWith('/my-tasks')) return can('view', 'my_tasks') || can('view', 'tasks');
    if (path.startsWith('/tasks')) return can('view', 'tasks');

    if (path.startsWith('/hr')) {
      if (path === '/hr/recruitment') return can('view', 'hr_recruitment');
      if (path === '/hr/onboarding') return can('view', 'hr_onboarding');
      if (path === '/hr/master') return can('view', 'hr_master');
      if (path === '/hr/attendance') return can('view', 'hr_attendance');
      if (path === '/hr/leave') return can('view', 'hr_leave');
      if (path === '/hr/payroll') return can('view', 'hr_payroll');
      if (path === '/hr/self-service') return can('view', 'hr_self_service');
      if (path === '/hr/reports') return can('view', 'hr_reports');
      if (path === '/hr/configuration') return can('view', 'hr_configuration');
      return can('view', 'hr_master') || can('view', 'hr_recruitment') || can('view', 'hr_onboarding');
    }

    if (path.startsWith('/renewal')) {
      if (path === '/renewal/dashboard' || path === '/renewal') return can('view', 'renewal_dashboard');
      if (path === '/renewal/tracker') return can('view', 'renewal_tracker');
      if (path === '/renewal/reports') return can('view', 'renewal_reports');
      if (path === '/renewal/configuration') return can('view', 'renewal_configuration');
      return can('view', 'renewal_tracker');
    }

    if (path.startsWith('/requirements')) {
      if (path === '/requirements/material') return can('view', 'req_material');
      if (path === '/requirements/it') return can('view', 'req_it');
      return can('view', 'req_material') || can('view', 'req_it');
    }

    if (path.startsWith('/compliance')) {
      if (path === '/compliance/policies') return can('view', 'compliance_policies');
      if (path === '/compliance/audit') return can('view', 'compliance_audit');
      if (path === '/compliance/sops') return can('view', 'compliance_sops');
      if (path === '/compliance/acknowledgements') return can('view', 'compliance_acknowledgements');
      return can('view', 'compliance_policies');
    }

    if (path.startsWith('/admin')) {
      if (path.startsWith('/admin/users')) return can('view', 'users');
      if (path.startsWith('/admin/roles')) return can('view', 'roles');
      if (path.startsWith('/admin/departments')) return can('view', 'departments');
      if (path.startsWith('/admin/audit-logs')) return can('view', 'audit_logs');
      if (path.startsWith('/admin/permissions')) return can('view', 'permissions');
      return can('view', 'users') || can('view', 'roles');
    }

    if (path.startsWith('/reports')) return can('view', 'summary_reports') || can('view', 'crm_reports');
    if (path.startsWith('/notifications')) return true;
    if (path.startsWith('/settings')) return true;

    if (['/documents', '/verification', '/finance', '/sanction', '/delivery', '/disbursement'].includes(path)) {
      return can('view', 'leads') || can('view', 'opportunities') || can('view', 'crm_dashboard');
    }

    return false;
  };

  return (
    <AuthPermissionContext.Provider
      value={{
        can,
        canAccessRoute,
        isSuperAdmin,
        effectivePermissionsMap,
        isLoading,
      }}
    >
      {children}
    </AuthPermissionContext.Provider>
  );
};

export const usePermission = () => useContext(AuthPermissionContext);
