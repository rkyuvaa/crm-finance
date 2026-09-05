import { useState } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import {
  Mail,
  Database,
  Users as UsersIcon,
  Shield,
  Building2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import MailServerConfigCard from '@/components/settings/MailServerConfigCard';
import SystemBackupCard from '@/components/settings/SystemBackupCard';
import UserManagementPage from '@/pages/admin/UserManagementPage';
import RoleManagementPage from '@/pages/admin/RoleManagementPage';
import DepartmentManagementPage from '@/pages/admin/DepartmentManagementPage';
import PermissionRegistryPage from '@/pages/admin/PermissionRegistryPage';
import AccessAuditLogPage from '@/pages/admin/AccessAuditLogPage';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2.5 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState(0);
  const [userRoleSubTab, setUserRoleSubTab] = useState(0);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: '#023020' }}>
          System Settings & Preferences
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#7A8B80', mt: 0.5 }}>
          Manage organization users & roles, departments, mail server, and data backups.
        </Typography>
      </Box>

      {/* ERP Style Navigation Tabs */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #E4EBE1',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          px: 2,
          pt: 1,
          mb: 1,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 13.5,
              color: '#667A6D',
              mr: 1,
              px: 2,
              borderRadius: '8px 8px 0 0',
              '&.Mui-selected': {
                color: '#023020',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#023020',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {isAdmin && <Tab icon={<UsersIcon size={16} />} iconPosition="start" label="Users & Roles" />}
          {isAdmin && <Tab icon={<Building2 size={16} />} iconPosition="start" label="Departments" />}
          <Tab icon={<Mail size={16} />} iconPosition="start" label="Mail Server (SMTP)" />
          {isAdmin && <Tab icon={<Database size={16} />} iconPosition="start" label="System Data Backup" />}
        </Tabs>
      </Paper>

      {isAdmin ? (
        <>
          {/* Tab 0: Users & Roles */}
          <CustomTabPanel value={activeTab} index={0}>
            <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 2, background: '#FFFFFF' }}>
              <Tabs
                value={userRoleSubTab}
                onChange={(_, val) => setUserRoleSubTab(val)}
                sx={{
                  borderBottom: 1,
                  borderColor: '#E4EBE1',
                  mb: 2,
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13 },
                }}
              >
                <Tab icon={<UsersIcon size={15} />} iconPosition="start" label="Users Management" />
                <Tab icon={<Shield size={15} />} iconPosition="start" label="Roles & Access" />
                <Tab icon={<KeyRound size={15} />} iconPosition="start" label="Permission Matrix" />
                <Tab icon={<ShieldAlert size={15} />} iconPosition="start" label="Access Audit Logs" />
              </Tabs>
              {userRoleSubTab === 0 && <UserManagementPage />}
              {userRoleSubTab === 1 && <RoleManagementPage />}
              {userRoleSubTab === 2 && <PermissionRegistryPage />}
              {userRoleSubTab === 3 && <AccessAuditLogPage />}
            </Paper>
          </CustomTabPanel>

          {/* Tab 1: Departments */}
          <CustomTabPanel value={activeTab} index={1}>
            <Paper elevation={0} sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 2, background: '#FFFFFF' }}>
              <DepartmentManagementPage />
            </Paper>
          </CustomTabPanel>

          {/* Tab 2: Mail Server (SMTP) */}
          <CustomTabPanel value={activeTab} index={2}>
            <MailServerConfigCard />
          </CustomTabPanel>

          {/* Tab 3: System Data Backup */}
          <CustomTabPanel value={activeTab} index={3}>
            <SystemBackupCard />
          </CustomTabPanel>
        </>
      ) : (
        /* Non-admin view */
        <CustomTabPanel value={activeTab} index={0}>
          <MailServerConfigCard />
        </CustomTabPanel>
      )}
    </Box>
  );
}
