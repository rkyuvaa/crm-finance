import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  FolderKanban,
  Layers,
  LayoutDashboard,
  ListTodo,
  Settings,
  Settings2,
  Sparkles,
  UserPlus,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { useDashboardQuery } from '@/api/dashboardApi';
import { ROLE_LABELS, initialsOf } from '@/utils/format';
import type { NavCounts } from '@/types';

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
    label: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, badge: null },
      { key: 'plm', label: 'PLM', path: '/plm', icon: Cpu, badge: null },
    ],
  },
  {
    label: 'CRM',
    items: [
      {
        key: 'crm',
        label: 'CRM',
        icon: Briefcase,
        badge: null,
        children: [
          { key: 'leads', label: 'Lead', path: '/leads', icon: UserPlus, badge: 'leads' },
          { key: 'opportunities', label: 'Opportunity', path: '/opportunities', icon: Sparkles, badge: null },
        ],
      },
    ],
  },
  {
    label: 'Project & Task',
    items: [
      {
        key: 'project-task',
        label: 'Project & Task',
        icon: Layers,
        badge: null,
        children: [
          { key: 'projects', label: 'Projects', path: '/projects', icon: FolderKanban, badge: null },
          { key: 'tasks', label: 'Task', path: '/tasks', icon: ListTodo, badge: null },
        ],
      },
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

/** Map of parent-item key → child paths, used for auto-expand on route change. */
const PARENT_CHILD_PATHS: Record<string, string[]> = {};
NAV_GROUPS.forEach((group) => {
  group.items.forEach((item) => {
    if (item.children) {
      PARENT_CHILD_PATHS[item.key] = item.children.map((c) => c.path);
    }
  });
});

export default function Sidebar({
  collapsed,
  onNavigate,
  isMobile = false,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  isMobile?: boolean;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const { data: dashboard } = useDashboardQuery();
  const counts = dashboard?.nav_counts;
  const location = useLocation();

  // Which expandable nav items are open (keyed by NavItem.key).
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Auto-expand any parent whose child is the current route.
    Object.entries(PARENT_CHILD_PATHS).forEach(([key, paths]) => {
      if (paths.some((p) => location.pathname.startsWith(p))) initial.add(key);
    });
    return initial;
  });

  // Keep auto-expanding on route changes (e.g. programmatic navigation).
  useEffect(() => {
    Object.entries(PARENT_CHILD_PATHS).forEach(([key, paths]) => {
      if (paths.some((p) => location.pathname.startsWith(p))) {
        setExpandedItems((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    });
  }, [location.pathname]);

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Shared style base for all primary nav items (links + expandable buttons). */
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
      color: '#A0B2A6',
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
        background: '#203020',
        borderRight: '1px solid #2C3E2C',
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
      {/* ── Brand / logo ───────────────────────────────────────────────── */}
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
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
              CRM<span style={{ color: '#4ADE80' }}>FINANCE</span>
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.4,
                color: '#819688',
                textTransform: 'uppercase',
              }}
            >
              KIM
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 12px 12px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 6 }}>
            {collapsed && group.label === 'Main' && <div style={{ height: 8 }} />}

            {group.items.map((item) => {
              const Icon = item.icon;

              /* ── Expandable parent item (e.g. CRM) ────────────────── */
              if (item.children) {
                const isExpanded = expandedItems.has(item.key);
                const isAnyChildActive = item.children.some((c) =>
                  location.pathname.startsWith(c.path),
                );

                return (
                  <div key={item.key}>
                    {/* Primary nav button — same look as Dashboard / PLM */}
                    <button
                      onClick={() => toggleItem(item.key)}
                      style={{
                        ...navItemStyle,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: collapsed ? '10px 0' : '8.5px 10px',
                        background: isAnyChildActive ? '#2D442D' : 'transparent',
                        color: isAnyChildActive ? '#FFFFFF' : '#A0B2A6',
                        fontWeight: isAnyChildActive ? 600 : 500,
                        width: '100%',
                      }}
                    >
                      <span style={{ display: 'flex', flexShrink: 0 }}>
                        <Icon
                          size={17}
                          color={isAnyChildActive ? '#4ADE80' : '#819688'}
                          style={{ flexShrink: 0 }}
                        />
                      </span>
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && (
                        <span style={{ display: 'flex', alignItems: 'center', color: '#819688' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </button>

                    {/* Child items — shown when expanded and sidebar is not collapsed */}
                    {isExpanded && !collapsed && (
                      <div
                        style={{
                          marginLeft: 14,
                          paddingLeft: 10,
                          borderLeft: '1px solid #2C3E2C',
                          marginBottom: 2,
                        }}
                      >
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const badgeCount = child.badge ? (counts?.[child.badge] ?? 0) : null;
                          return (
                            <NavLink
                              key={child.key}
                              to={child.path}
                              onClick={() => onNavigate?.()}
                              className="nav-item"
                              style={({ isActive }) => ({
                                ...navItemStyle,
                                padding: '7px 10px',
                                marginBottom: 1,
                                fontSize: 12.5,
                                background: isActive ? '#2D442D' : 'transparent',
                                color: isActive ? '#FFFFFF' : '#A0B2A6',
                                fontWeight: isActive ? 600 : 500,
                              })}
                            >
                              {({ isActive }) => (
                                <>
                                  <span style={{ display: 'flex', flexShrink: 0 }}>
                                    <ChildIcon
                                      size={15}
                                      color={isActive ? '#4ADE80' : '#819688'}
                                      style={{ flexShrink: 0 }}
                                    />
                                  </span>
                                  <span style={{ flex: 1 }}>{child.label}</span>
                                  {badgeCount !== null && badgeCount > 0 && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: '#2D442D',
                                        color: '#4ADE80',
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
                    )}
                  </div>
                );
              }

              /* ── Regular nav item (leaf) ───────────────────────────── */
              const badgeCount = item.badge ? (counts?.[item.badge] ?? 0) : null;
              return (
                <NavLink
                  key={item.key}
                  to={item.path!}
                  end={item.path === '/'}
                  onClick={() => onNavigate?.()}
                  className="nav-item"
                  style={({ isActive }) => ({
                    ...navItemStyle,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : '8.5px 10px',
                    background: isActive ? '#2D442D' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#A0B2A6',
                    fontWeight: isActive ? 600 : 500,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ display: 'flex', flexShrink: 0 }}>
                        <Icon
                          size={17}
                          color={isActive ? '#4ADE80' : '#819688'}
                          style={{ flexShrink: 0 }}
                        />
                      </span>
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && badgeCount !== null && badgeCount > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#2D442D',
                            color: '#4ADE80',
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

      {/* ── User profile footer ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '12px 0' : '12px 14px',
          borderTop: '1px solid #2C3E2C',
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
              <div style={{ fontSize: 11, color: '#819688' }}>{ROLE_LABELS[user.role] ?? user.role}</div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
