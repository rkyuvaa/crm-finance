import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Divider, IconButton, InputAdornment, Menu, MenuItem, TextField, Tooltip, useMediaQuery } from '@mui/material';
import { Bell, ChevronDown, ChevronRight, LogOut, Menu as MenuIcon, Search, User as UserIcon } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { useDashboardQuery } from '@/api/dashboardApi';
import { useLogoutMutation } from '@/api/authApi';
import { initialsOf } from '@/utils/format';
import { logout } from '@/auth/authSlice';
import { useAppDispatch } from '@/app/hooks';

const BREADCRUMBS: Record<string, [string, string]> = {
  '/': ['Dashboard', 'Overview'],
  '/leads': ['Leads', 'All Leads'],
  '/applications': ['Applications', 'All Applications'],
  '/documents': ['Documents', 'Upload & Manage'],
  '/verification': ['Verification', 'Pending Review'],
  '/finance': ['Finance', 'Finance Processing'],
  '/sanction': ['Sanction', 'Sanction Details'],
  '/delivery': ['Delivery', 'Vehicle Delivery'],
  '/disbursement': ['Disbursement', 'UTR Entry'],
  '/reports': ['Reports', 'Analytics & Reports'],
  '/notifications': ['Notifications', 'Inbox'],
  '/settings': ['Settings', 'System Settings'],
};

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [query, setQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { data: dashboard } = useDashboardQuery();
  const [doLogout] = useLogoutMutation();

  const isSmallMobile = useMediaQuery('(max-width:600px)');
  const isTablet = useMediaQuery('(max-width:900px)');

  const crumb = BREADCRUMBS[location.pathname] ?? BREADCRUMBS[`/${location.pathname.split('/')[1]}`] ?? [
    'CRMFinance',
    'KIM',
  ];
  const unread = dashboard?.nav_counts.notifications ?? 0;

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/applications?q=${encodeURIComponent(q)}`);
    setQuery('');
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    try {
      await doLogout();
    } catch {
      // cookie may already be gone
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: isSmallMobile ? 52 : 58,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E4EBE1',
        display: 'flex',
        alignItems: 'center',
        gap: isSmallMobile ? 8 : 14,
        padding: isSmallMobile ? '0 10px' : '0 20px',
        flexShrink: 0,
      }}
    >
      <IconButton onClick={onToggleSidebar} aria-label="Toggle sidebar" sx={{ border: '1px solid #E4EBE1', borderRadius: 2, p: 1 }}>
        <MenuIcon size={19} />
      </IconButton>

      {!isSmallMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', minWidth: 0 }}>
          {!isTablet && <span style={{ fontSize: 13, color: '#7A8B80', fontWeight: 500 }}>{crumb[0]}</span>}
          {!isTablet && <ChevronRight size={14} color="#9BA99F" />}
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#16231B' }}>{crumb[1]}</span>
        </div>
      )}

      <TextField
        size="small"
        placeholder={isSmallMobile ? "Search..." : "Search by App ID, customer, mobile, vehicle…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
        sx={{
          flex: 1,
          maxWidth: isSmallMobile ? 180 : 520,
          mx: isSmallMobile ? 0 : 'auto',
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            background: '#F7F9F5',
            fontSize: isSmallMobile ? 12 : 13.5,
            '& fieldset': { borderColor: '#E4EBE1' },
            '&:hover fieldset': { borderColor: '#C9E0C6' },
            '&.Mui-focused fieldset': { borderColor: '#087A3D', borderWidth: 1 },
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color="#7A8B80" />
              </InputAdornment>
            ),
          },
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: isSmallMobile ? 6 : 10, flexShrink: 0 }}>
        <Tooltip title="Notifications" arrow>
          <IconButton
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            sx={{ border: '1px solid #E4EBE1', borderRadius: 2, position: 'relative', p: 1 }}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#C2410C',
                  border: '2px solid #fff',
                }}
              />
            )}
          </IconButton>
        </Tooltip>

        <button
          type="button"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Account menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isSmallMobile ? 4 : 8,
            padding: isSmallMobile ? '3px 6px' : '4px 10px 4px 5px',
            borderRadius: 24,
            border: '1px solid #E4EBE1',
            background: '#fff',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Avatar sx={{ width: 26, height: 26, bgcolor: '#087A3D', fontSize: 11, fontWeight: 700 }}>
            {user ? user.initials || initialsOf(user.full_name) : '?'}
          </Avatar>
          {!isSmallMobile && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#16231B' }}>{user?.full_name}</span>
          )}
          <ChevronDown size={14} color="#7A8B80" />
        </button>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/settings');
            }}
          >
            <UserIcon size={15} style={{ marginRight: 9 }} />
            My Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/notifications');
            }}
          >
            <Bell size={15} style={{ marginRight: 9 }} />
            Notifications
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <LogOut size={15} style={{ marginRight: 9 }} />
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}
