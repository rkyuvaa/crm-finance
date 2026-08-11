import { Alert, Button, Divider, Paper, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useChangePasswordMutation, useUpdateProfileMutation } from '@/api/authApi';
import { setUser } from '@/auth/authSlice';
import { useToast } from '@/components/ui/ToastHost';
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

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { showToast } = useToast();
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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>Settings</div>
        <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
          Manage your profile, role and password.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Profile</Typography>
          <Typography sx={{ fontSize: 12.5, color: '#7A8B80', mb: 2 }}>
            {user?.email} · {user ? ROLE_LABELS[user.role] ?? user.role : ''}
          </Typography>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)}>
            <TextField
              fullWidth
              label="Full name"
              margin="normal"
              error={Boolean(profileForm.formState.errors.full_name)}
              helperText={profileForm.formState.errors.full_name?.message}
              {...profileForm.register('full_name')}
            />
            <Button type="submit" variant="contained" disabled={savingProfile} sx={{ mt: 2 }}>
              Save Profile
            </Button>
          </form>
        </Paper>

        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Change password</Typography>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            You will stay signed in after changing your password.
          </Alert>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
            <TextField
              fullWidth
              label="Current password"
              type="password"
              margin="normal"
              error={Boolean(passwordForm.formState.errors.current_password)}
              helperText={passwordForm.formState.errors.current_password?.message}
              {...passwordForm.register('current_password')}
            />
            <TextField
              fullWidth
              label="New password"
              type="password"
              margin="normal"
              error={Boolean(passwordForm.formState.errors.new_password)}
              helperText={passwordForm.formState.errors.new_password?.message}
              {...passwordForm.register('new_password')}
            />
            <TextField
              fullWidth
              label="Confirm new password"
              type="password"
              margin="normal"
              error={Boolean(passwordForm.formState.errors.confirm)}
              helperText={passwordForm.formState.errors.confirm?.message}
              {...passwordForm.register('confirm')}
            />
            <Button type="submit" variant="contained" disabled={changingPassword} sx={{ mt: 2 }}>
              Update Password
            </Button>
          </form>
        </Paper>

        <Divider />

        <Typography sx={{ fontSize: 12, color: '#9BA99F' }}>
          Organization settings, role permissions and notification preferences arrive in a later phase.
        </Typography>
      </div>
    </div>
  );
}
