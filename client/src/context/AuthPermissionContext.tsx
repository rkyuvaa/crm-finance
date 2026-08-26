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
    return true; // Default allow for standard navigation if unmapped
  };

  const canAccessRoute = (path: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (path.startsWith('/admin/users') || path.startsWith('/admin/roles') || path.startsWith('/admin/departments')) {
      return can('view', 'users') || can('view', 'roles') || can('view', 'departments');
    }
    if (path.startsWith('/admin/audit-logs')) {
      return can('view', 'audit_logs');
    }
    if (path.startsWith('/admin/permissions')) {
      return can('view', 'permissions');
    }
    if (path.startsWith('/reports')) {
      return can('view', 'summary_reports');
    }
    return true;
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
