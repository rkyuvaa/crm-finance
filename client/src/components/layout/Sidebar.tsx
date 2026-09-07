import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  Cpu,
  FileText,
  FolderPlus,
  LayoutDashboard,
  ListTodo,
  Menu,
  PanelLeftClose,
  Search,
  Settings,
  Settings2,
  Sparkles,
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Calendar,
  DollarSign,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { useDashboardQuery } from '@/api/dashboardApi';
import { ROLE_LABELS, initialsOf } from '@/utils/format';
import type { NavCounts } from '@/types';
import { usePermission } from '@/context/AuthPermissionContext';
import { useToast } from '@/components/ui/ToastHost';

type NavBadgeKey = Exclude<keyof NavCounts, 'stages'>;

interface ChildNavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge: NavBadgeKey | null;
}

interface NavItem {
  key: string;
  label: string;
  /** Omit for parent-only items that just expand/collapse their children. */
  path?: string;
  icon: LucideIcon;
  badge: NavBadgeKey | null;
  children?: ChildNavItem[];
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'CRM',
    items: [
      {
        key: 'crm',
        label: 'CRM',
        icon: Briefcase,
        badge: null,
        children: [
          { key: 'crm_dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, badge: null },
          { key: 'leads', label: 'Lead', path: '/leads', icon: UserPlus, badge: 'leads' },
          { key: 'opportunities', label: 'Opportunity', path: '/opportunities', icon: Sparkles, badge: null },
          { key: 'crm_reports', label: 'Reports', path: '/reports', icon: BarChart3, badge: null },
          { key: 'crm_configuration', label: 'Configuration', path: '/configuration', icon: Settings2, badge: null },
        ],
      },
    ],
  },
  {
    label: 'Projects & Operations',
    items: [
      {
        key: 'project_task',
        label: 'Project & Task',
        icon: FolderPlus,
        badge: null,
        children: [
          { key: 'projects', label: 'Projects', path: '/projects', icon: Briefcase, badge: null },
          { key: 'tasks', label: 'Tasks', path: '/tasks', icon: ListTodo, badge: null },
          { key: 'project_configuration', label: 'Configuration', path: '/projects/configuration', icon: Settings2, badge: null },
        ],
      },
      { key: 'plm', label: 'PLM', path: '/plm', icon: Cpu, badge: null },
    ],
  },
  {
    label: 'People',
    items: [
      {
        key: 'hr_employee',
        label: 'HR & Employee',
        icon: Users,
        badge: null,
        children: [
          { key: 'hr_onboarding', label: 'Employee On/off boarding', path: '/hr/onboarding', icon: UserPlus, badge: null },
          { key: 'hr_master', label: 'Employee Master', path: '/hr/master', icon: Users, badge: null },
          { key: 'hr_attendance', label: 'Attendance', path: '/hr/attendance', icon: Clock, badge: null },
          { key: 'hr_leave', label: 'Leave Management', path: '/hr/leave', icon: Calendar, badge: null },
          { key: 'hr_payroll', label: 'Payroll', path: '/hr/payroll', icon: DollarSign, badge: null },
          { key: 'hr_self_service', label: 'Self Service', path: '/hr/self-service', icon: UserCheck, badge: null },
          { key: 'hr_reports', label: 'Reports', path: '/hr/reports', icon: BarChart3, badge: null },
          { key: 'hr_configuration', label: 'HR Configuration', path: '/hr/configuration', icon: Settings2, badge: null },
        ],
      },
      {
        key: 'renewal_tracker_group',
        label: 'Renewal Tracker',
        icon: RefreshCw,
        badge: null,
        children: [
          { key: 'renewal_dashboard', label: 'Dashboard', path: '/renewal/dashboard', icon: LayoutDashboard, badge: null },
          { key: 'renewal_tracker', label: 'Tracker', path: '/renewal/tracker', icon: Clock, badge: null },
          { key: 'renewal_reports', label: 'Reports', path: '/renewal/reports', icon: BarChart3, badge: null },
          { key: 'renewal_configuration', label: 'Configuration', path: '/renewal/configuration', icon: Settings2, badge: null },
        ],
      },
    ],
  },
  {
    label: 'Other',
    items: [
      { key: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell, badge: 'notifications' },
      { key: 'settings', label: 'Settings', path: '/settings', icon: Settings, badge: null },
    ],
  },
];

/** Map of parent-item key → child paths, used for auto-expand on route change. */
const PARENT_CHILD_PATHS: Record<string, string[]> = {};
NAV_GROUPS.forEach((group) => {
  group.items.forEach((item) => {
    if (item.children) {
      PARENT_CHILD_PATHS[item.key] = item.children.map((c) => c.path);
    }
  });
});

const getParentForPath = (pathname: string): string | null => {
  for (const [parentKey, paths] of Object.entries(PARENT_CHILD_PATHS)) {
    if (
      paths.some((p) =>
        p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/'),
      )
    ) {
      return parentKey;
    }
  }
  return null;
};

export default function Sidebar({
  collapsed,
  onNavigate,
  onToggleSidebar,
  isMobile = false,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const { data: dashboard } = useDashboardQuery();
  const counts = dashboard?.nav_counts;
  const location = useLocation();
  const { can } = usePermission();
  const { showError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');

  // Exactly one open section allowed at a time (string key or null)
  const [openSection, setOpenSection] = useState<string | null>(() =>
    getParentForPath(location.pathname),
  );

  // Filtered menu items based on search query
  const filteredNavGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return NAV_GROUPS;

    return NAV_GROUPS.map((group) => {
      const matchingItems = group.items
        .map((item) => {
          const parentMatch = item.label.toLowerCase().includes(query);
          if (item.children) {
            const matchingChildren = item.children.filter((child) =>
              child.label.toLowerCase().includes(query),
            );
            if (parentMatch || matchingChildren.length > 0) {
              return {
                ...item,
                children: parentMatch ? item.children : matchingChildren,
              };
            }
            return null;
          } else {
            return parentMatch ? item : null;
          }
        })
        .filter(Boolean) as NavItem[];

      return {
        ...group,
        items: matchingItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  // Auto-expand sections that have matching children when searching
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filteredNavGroups.forEach((group) => {
        group.items.forEach((item) => {
          if (item.children && item.children.length > 0) {
            setOpenSection(item.key);
          }
        });
      });
    }
  }, [searchQuery, filteredNavGroups]);

  // Restore state on route change (Rule 5)
  useEffect(() => {
    const activeParent = getParentForPath(location.pathname);
    if (activeParent) {
      setOpenSection(activeParent);
    }
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    // Rule 1 & Rule 2: Only one section open, clicking open section collapses it
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const handleLeafClick = () => {
    // Rule 3: Leaf items close all accordion sections
    setOpenSection(null);
    onNavigate?.();
  };

  return (
    <aside
      aria-label="Primary navigation"
      style={{
        width: collapsed ? 76 : 244,
        background: '#1a3a2a',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: isMobile ? 'sticky' : 'fixed',
        top: 0,
        left: isMobile ? undefined : 0,
        height: '100vh',
        zIndex: isMobile ? undefined : 40,
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Dynamic CSS styles for animations, hover states, active accent bar */}
      <style>{`
        .sb-parent-btn {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 8.5px 10px;
          margin-bottom: 2px;
          border: none;
          background: transparent;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.70);
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .sb-parent-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
        }
        .sb-parent-btn.open-state {
          background: rgba(255, 255, 255, 0.10);
          color: #ffffff;
          font-weight: 600;
        }
        .sb-sub-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 7px 10px 7px 42px;
          margin-bottom: 1px;
          border: none;
          border-left: 3px solid transparent;
          background: transparent;
          border-radius: 0 6px 6px 0;
          color: rgba(255, 255, 255, 0.70);
          font-size: 12.5px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease, border-left-color 0.15s ease;
        }
        .sb-sub-item:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
        }
        .sb-sub-item.active {
          color: #5fcf87 !important;
          background: rgba(95, 207, 135, 0.08) !important;
          border-left: 3px solid #5fcf87 !important;
          font-weight: 600 !important;
        }
        .sb-submenu {
          overflow: hidden;
          transition: max-height 250ms ease, opacity 250ms ease;
        }
        .sb-chevron {
          transition: transform 200ms ease;
        }
        .sb-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 7px 28px 7px 30px;
          color: #ffffff;
          font-size: 12.5px;
          outline: none;
          transition: all 0.15s ease;
        }
        .sb-search-input:focus {
          background: rgba(255, 255, 255, 0.10);
          border-color: #5fcf87;
        }
        .sb-search-input::placeholder {
          color: rgba(255, 255, 255, 0.40);
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '14px 8px' : '14px 14px 14px 16px',
          minHeight: 58,
          flexShrink: 0,
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', minWidth: 0 }}>
          <div
            onClick={collapsed && onToggleSidebar ? onToggleSidebar : undefined}
            title={collapsed ? "Expand sidebar" : undefined}
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
              cursor: collapsed ? 'pointer' : 'default',
            }}
          >
            <FileText size={19} />
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.15, overflow: 'hidden' }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                CRM<span style={{ color: '#5fcf87' }}>FINANCE</span>
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 1.4,
                  color: 'rgba(255, 255, 255, 0.50)',
                  textTransform: 'uppercase',
                }}
              >
                KIM
              </div>
            </div>
          )}
        </div>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 7,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.70)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              marginLeft: collapsed ? 0 : 8,
            }}
          >
            {collapsed ? <Menu size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div style={{ padding: collapsed ? '8px 8px 4px' : '10px 12px 4px', flexShrink: 0 }}>
        {!collapsed ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 9,
                color: 'rgba(255, 255, 255, 0.45)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="sb-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 8,
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.50)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Expand to search"
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderRadius: 8,
              color: 'rgba(255, 255, 255, 0.60)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Search size={15} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 12px 12px' }}>
        {filteredNavGroups.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.40)', fontSize: 12 }}>
            No matching menu items
          </div>
        ) : (
          filteredNavGroups.map((group, gi) => (
            <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 6 }}>
              {group.items.map((item) => {
                const Icon = item.icon;

                /* ── Accordion parent item with children ───────────────── */
                if (item.children) {
                  const isExpanded = openSection === item.key;
                  const isAnyChildActive = item.children.some((c) =>
                    c.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(c.path),
                  );

                  return (
                    <div key={item.key}>
                      <button
                        onClick={() => toggleSection(item.key)}
                        className={`sb-parent-btn ${isExpanded || isAnyChildActive ? 'open-state' : ''}`}
                        style={{
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          padding: collapsed ? '10px 0' : '8.5px 10px',
                        }}
                      >
                        <span style={{ display: 'flex', flexShrink: 0 }}>
                          <Icon
                            size={17}
                            color={isExpanded || isAnyChildActive ? '#5fcf87' : 'rgba(255, 255, 255, 0.70)'}
                            style={{ flexShrink: 0 }}
                          />
                        </span>
                        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                        {!collapsed && (
                          <span
                            className="sb-chevron"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              color: 'rgba(255, 255, 255, 0.70)',
                            }}
                          >
                            <ChevronDown size={14} />
                          </span>
                        )}
                      </button>

                      {/* Submenu with CSS max-height + opacity transition */}
                      <div
                        className="sb-submenu"
                        style={{
                          maxHeight: isExpanded && !collapsed ? '600px' : '0px',
                          opacity: isExpanded && !collapsed ? 1 : 0,
                        }}
                      >
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const badgeCount = child.badge ? (counts?.[child.badge] ?? 0) : null;
                          const isChildPermitted =
                            child.key === 'crm_dashboard' ? true : can('view', child.key);

                          if (!isChildPermitted) {
                            return (
                              <div
                                key={child.key}
                                onClick={() =>
                                  showError(`Access Restricted: Permission required to view ${child.label}.`)
                                }
                                className="sb-sub-item"
                                style={{
                                  paddingLeft: collapsed ? 10 : 42,
                                  color: 'rgba(255, 255, 255, 0.35)',
                                  cursor: 'not-allowed',
                                }}
                                title={`Permission required for ${child.label}`}
                              >
                                <span style={{ display: 'flex', flexShrink: 0 }}>
                                  <ChildIcon size={15} color="rgba(255, 255, 255, 0.35)" />
                                </span>
                                <span style={{ flex: 1, textDecoration: 'line-through opacity' }}>
                                  {child.label}
                                </span>
                                <Lock size={13} color="rgba(255, 255, 255, 0.35)" style={{ flexShrink: 0 }} />
                              </div>
                            );
                          }

                          return (
                            <NavLink
                              key={child.key}
                              to={child.path}
                              end={child.path === '/'}
                              onClick={() => onNavigate?.()}
                              className={({ isActive }) =>
                                `sb-sub-item ${isActive ? 'active' : ''}`
                              }
                              style={!collapsed ? { paddingLeft: 42 } : { paddingLeft: 10, justifyContent: 'center' }}
                            >
                              {({ isActive }) => (
                                <>
                                  <span style={{ display: 'flex', flexShrink: 0 }}>
                                    <ChildIcon
                                      size={15}
                                      color={isActive ? '#5fcf87' : 'rgba(255, 255, 255, 0.70)'}
                                    />
                                  </span>
                                  {!collapsed && <span style={{ flex: 1 }}>{child.label}</span>}
                                  {!collapsed && badgeCount !== null && badgeCount > 0 && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: 'rgba(95, 207, 135, 0.20)',
                                        color: '#5fcf87',
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
                    </div>
                  );
                }

                /* ── Leaf nav item (PLM, Notifications, Settings) ─────── */
                const badgeCount = item.badge ? (counts?.[item.badge] ?? 0) : null;
                const isLeafPermitted = item.key === 'crm_dashboard' ? true : can('view', item.key);

                if (!isLeafPermitted) {
                  return (
                    <div
                      key={item.key}
                      onClick={() =>
                        showError(`Access Restricted: Permission required to view ${item.label}.`)
                      }
                      className="sb-parent-btn"
                      style={{
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: collapsed ? '10px 0' : '8.5px 10px',
                        color: 'rgba(255, 255, 255, 0.35)',
                        cursor: 'not-allowed',
                      }}
                      title={`Permission required for ${item.label}`}
                    >
                      <span style={{ display: 'flex', flexShrink: 0 }}>
                        <Icon size={17} color="rgba(255, 255, 255, 0.35)" />
                      </span>
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && <Lock size={13} color="rgba(255, 255, 255, 0.35)" style={{ flexShrink: 0 }} />}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.key}
                    to={item.path!}
                    end={item.path === '/'}
                    onClick={handleLeafClick}
                    className={({ isActive }) =>
                      `sb-parent-btn ${isActive ? 'open-state' : ''}`
                    }
                    style={{
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '10px 0' : '8.5px 10px',
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={{ display: 'flex', flexShrink: 0 }}>
                          <Icon
                            size={17}
                            color={isActive ? '#5fcf87' : 'rgba(255, 255, 255, 0.70)'}
                            style={{ flexShrink: 0 }}
                          />
                        </span>
                        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                        {!collapsed && badgeCount !== null && badgeCount > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'rgba(95, 207, 135, 0.20)',
                              color: '#5fcf87',
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
          ))
        )}
      </nav>

      {/* User Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '12px 0' : '12px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
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
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.full_name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.50)' }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
