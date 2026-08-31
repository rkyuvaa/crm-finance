import type { UserRole } from './index';

export type PermissionStatus = 'ACTIVE' | 'INACTIVE';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export type DataScopeType = 'ALL' | 'DEPARTMENT' | 'TEAM' | 'OWN' | 'ASSIGNED' | 'CUSTOM';
export type FieldPermissionType = 'VISIBLE' | 'HIDDEN' | 'READ_ONLY' | 'EDITABLE' | 'REQUIRED';

export type AuditActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'USER_LOCKED'
  | 'USER_UNLOCKED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'ROLE_DUPLICATED'
  | 'PERMISSION_CHANGED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED'
  | 'DEPARTMENT_DELETED'
  | 'DEPARTMENT_ASSIGNED'
  | 'DEPARTMENT_REMOVED'
  | 'MODULE_CREATED'
  | 'MODULE_UPDATED'
  | 'MODULE_DELETED'
  | 'RESOURCE_CREATED'
  | 'RESOURCE_UPDATED'
  | 'RESOURCE_DELETED'
  | 'ACTION_CREATED'
  | 'ACTION_UPDATED'
  | 'ACTION_DELETED';

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
  parent_id: number | null;
  head_id: number | null;
  status: PermissionStatus;
  created_at: string;
  updated_at: string;
  employee_count: number;
  head_name: string | null;
  parent_name: string | null;
}

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

export interface Action {
  id: number;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  status: PermissionStatus;
}

export interface Resource {
  id: number;
  module_id: number;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  status: PermissionStatus;
  actions: Action[];
}

export interface Module {
  id: number;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  icon: string | null;
  status: PermissionStatus;
  resources: Resource[];
}

export interface Permission {
  id: number;
  module_id: number;
  resource_id: number;
  action_id: number;
  code: string;
  description: string | null;
  status: PermissionStatus;
  module_code?: string;
  resource_code?: string;
  action_code?: string;
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: PermissionStatus;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  creator_name: string | null;
  user_count: number;
  permission_count: number;
  permission_ids: number[];
}

export interface UserDetail {
  id: number;
  email: string;
  full_name: string;
  username: string | null;
  mobile: string | null;
  employee_id: string | null;
  designation: string | null;
  role: UserRole;
  status: UserStatus;
  force_password_change: boolean;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  profile_photo: string | null;
  reporting_manager_id: number | null;
  reporting_manager_name: string | null;
  created_at: string;
  updated_at: string;
  assigned_roles: Role[];
  departments: Department[];
  primary_department_id: number | null;
  primary_department_name: string | null;
}

export interface EffectivePermissionItem {
  permission_code: string;
  module_code: string;
  resource_code: string;
  action_code: string;
  granted: boolean;
  source_type: string;
  source_name: string;
  scope_type: DataScopeType;
}

export interface EffectiveAccessSummary {
  user_id: number;
  user_name: string;
  roles: string[];
  departments: string[];
  permissions: EffectivePermissionItem[];
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action_type: AuditActionType;
  module: string | null;
  resource: string | null;
  record_id: string | null;
  previous_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PaginatedUsers {
  items: UserDetail[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
