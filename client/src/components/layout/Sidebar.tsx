import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import {
  BarChart3,
  Bell,
  CheckCircle,
  FileCheck,
  FileText,
  LayoutDashboard,
  Settings,
  Settings2,
  Truck,
  Upload,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { useDashboardQuery } from '@/api/dashboardApi';
import { ROLE_LABELS, initialsOf } from '@/utils/format';
import type { NavCounts } from '@/types';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge: keyof NavCounts | null;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, badge: null },
      { key: 'leads', label: 'Leads', path: '/leads', icon: UserPlus, badge: 'leads' },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { key: 'document_upload', label: 'Document Upload', path: '/documents', icon: Upload, badge: 'documents' },
      { key: 'document_verification', label: 'Document Verification', path: '/verification', icon: FileCheck, badge: 'verification' },
      { key: 'final_submission', label: 'Final Submission', path: '/finance', icon: FileText, badge: 'finance' },
      { key: 'finance_approval', label: 'Finance Approval', path: '/finance', icon: FileCheck, badge: 'finance' },
      { key: 'loan_sanctioned', label: 'Loan Sanctioned', path: '/sanction', icon: CheckCircle, badge: null },
      { key: 'disbursement', label: 'Disbursement', path: '/disbursement', icon: Truck, badge: 'disbursement' },
      { key: 'completed', label: 'Completed', path: '/delivery', icon: CheckCircle, badge: null },
    ],
  },
  {
    label: 'Other',
    items: [
      { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, badge: null },
      { key: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell, badge: 'notifications' },
      { key: 'settings', label: 'Settings', path: '/settings', icon: Settings, badge: null },
      { key: 'configuration', label: 'Configuration', path: '/configuration', icon: Settings2, badge: null },
    ],
  },
];

export default function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const { data: dashboard } = useDashboardQuery();
  const counts = dashboard?.nav_counts;

  const navItemStyle = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      width: '100%',
      padding: '8.5px 10px',
      marginBottom: 2,
      border: 'none',
      background: 'transparent',
      borderRadius: 8,
      color: '#44584C',
      fontSize: 13,
      fontWeight: 500,
      textAlign: 'left' as const,
      cursor: 'pointer',
      fontFamily: 'inherit',
      textDecoration: 'none',
      whiteSpace: 'nowrap' as const,
      position: 'relative' as const,
      transition: 'background 0.12s ease, color 0.12s ease',
    }),
    [],
  );

  return (
    <aside
      aria-label="Primary navigation"
      style={{
        width: collapsed ? 76 : 244,
        background: '#FFFFFF',
        borderRight: '1px solid #E4EBE1',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40,
        overflow: 'hidden',
        transition: 'width 0.22s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '16px 0' : '16px 16px 14px',
          minHeight: 58,
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: '#087A3D',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <FileText size={19} />
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.15, overflow: 'hidden' }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2, color: '#023020', whiteSpace: 'nowrap' }}>
              CRM<span style={{ color: '#087A3D' }}>FINANCE</span>
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.4,
                color: '#9BA99F',
                textTransform: 'uppercase',
              }}
            >
              KIM
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 12px 12px' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  color: '#9BA99F',
                  textTransform: 'uppercase',
                  padding: '14px 10px 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.label}
              </div>
            )}
            {collapsed && group.label === 'Main' && <div style={{ height: 8 }} />}
            {group.items.map((item) => {
              const Icon = item.icon;
              const badgeCount = item.badge ? (counts?.[item.badge] ?? 0) : null;
              return (
                <NavLink
                  key={item.key}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onNavigate}
                  className="nav-item"
                  style={({ isActive }) => ({
                    ...navItemStyle,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : '8.5px 10px',
                    background: isActive ? '#EAF6E8' : 'transparent',
                    color: isActive ? '#04552B' : '#44584C',
                    fontWeight: isActive ? 600 : 500,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ position: 'relative', display: 'flex' }}>
                        <Icon size={17} color={isActive ? '#087A3D' : '#7A8B80'} style={{ flexShrink: 0 }} />
                      </span>
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && badgeCount !== null && badgeCount > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#EAF6E8',
                            color: '#04552B',
                            padding: '2px 7px',
                            borderRadius: 20,
                            minWidth: 20,
                            textAlign: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '12px 0' : '12px 14px',
          borderTop: '1px solid #E4EBE1',
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#087A3D',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {user ? user.initials || initialsOf(user.full_name) : '?'}
        </div>
        {!collapsed && user && (
          <>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#16231B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: 11, color: '#7A8B80' }}>{ROLE_LABELS[user.role] ?? user.role}</div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
