import { useState } from 'react';
import { Alert, Box, Button, Paper, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User as UserIcon, Key, Mail, Database } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useChangePasswordMutation, useUpdateProfileMutation } from '@/api/authApi';
import { setUser } from '@/auth/authSlice';
import { useToast } from '@/components/ui/ToastHost';
import MailServerConfigCard from '@/components/settings/MailServerConfigCard';
import SystemBackupCard from '@/components/settings/SystemBackupCard';
import { ROLE_LABELS } from '@/utils/format';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(6, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
    confirm: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((data) => data.new_password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

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
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  });

  const onSaveProfile = async (values: ProfileForm) => {
    try {
      const updated = await updateProfile(values).unwrap();
      dispatch(setUser(updated));
      showToast('Profile updated', 'success');
    } catch {
      showToast('Could not update profile', 'error');
    }
  };

  const onChangePassword = async (values: PasswordForm) => {
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      }).unwrap();
      showToast('Password changed', 'success');
      passwordForm.reset();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not change password', 'error');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <Box sx={{ maxWidth: 960 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: '#023020' }}>
          System Settings & Preferences
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#7A8B80', mt: 0.5 }}>
          Manage your personal account, security preferences, mail server parameters, and system backups.
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
          <Tab icon={<UserIcon size={16} />} iconPosition="start" label="My Profile" />
          <Tab icon={<Key size={16} />} iconPosition="start" label="Security & Password" />
          <Tab icon={<Mail size={16} />} iconPosition="start" label="Mail Server (SMTP)" />
          {isAdmin && <Tab icon={<Database size={16} />} iconPosition="start" label="System Data Backup" />}
        </Tabs>
      </Paper>

      {/* Tab 0: My Profile */}
      <CustomTabPanel value={activeTab} index={0}>
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3.5, maxWidth: 680 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#023020', mb: 0.5 }}>Profile Details</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A8B80', mb: 3 }}>
            Primary account credentials and display details.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, mb: 3, backgroundColor: '#F8FAF7', borderRadius: '10px', border: '1px solid #E4EBE1' }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: '#7A8B80', fontWeight: 700, textTransform: 'uppercase' }}>Email Address</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#023020' }}>{user?.email}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: '#7A8B80', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Role</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#023020' }}>
                {user ? ROLE_LABELS[user.role] ?? user.role : ''}
              </Typography>
            </Box>
          </Box>

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)}>
            <TextField
              fullWidth
              label="Full Name"
              margin="normal"
              error={Boolean(profileForm.formState.errors.full_name)}
              helperText={profileForm.formState.errors.full_name?.message}
              {...profileForm.register('full_name')}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={savingProfile}
              sx={{
                mt: 2.5,
                backgroundColor: '#023020',
                '&:hover': { backgroundColor: '#012015' },
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
              }}
            >
              Save Profile Changes
            </Button>
          </form>
        </Paper>
      </CustomTabPanel>

      {/* Tab 1: Security & Password */}
      <CustomTabPanel value={activeTab} index={1}>
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3.5, maxWidth: 680 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#023020', mb: 0.5 }}>Change Password</Typography>
          <Typography sx={{ fontSize: 13, color: '#7A8B80', mb: 2 }}>
            Ensure your account uses a strong, unique password.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, borderRadius: '10px' }}>
            You will stay signed in on this device after changing your password.
          </Alert>

          <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              margin="normal"
              error={Boolean(passwordForm.formState.errors.current_password)}
              helperText={passwordForm.formState.errors.current_password?.message}
              {...passwordForm.register('current_password')}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              margin="normal"
              error={Boolean(passwordForm.formState.errors.new_password)}
              helperText={passwordForm.formState.errors.new_password?.message}
              {...passwordForm.register('new_password')}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              margin="normal"
              error={Boolean(passwordForm.formState.errors.confirm)}
              helperText={passwordForm.formState.errors.confirm?.message}
              {...passwordForm.register('confirm')}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={changingPassword}
              sx={{
                mt: 2.5,
                backgroundColor: '#023020',
                '&:hover': { backgroundColor: '#012015' },
                fontWeight: 700,
                textTransform: 'none',
                px: 3,
              }}
            >
              Update Password
            </Button>
          </form>
        </Paper>
      </CustomTabPanel>

      {/* Tab 2: Mail Server Config */}
      <CustomTabPanel value={activeTab} index={2}>
        <MailServerConfigCard />
      </CustomTabPanel>

      {/* Tab 3: System Data Backup */}
      {isAdmin && (
        <CustomTabPanel value={activeTab} index={3}>
          <SystemBackupCard />
        </CustomTabPanel>
      )}
    </Box>
  );
}
