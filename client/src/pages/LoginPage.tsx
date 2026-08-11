import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { FileText, LockKeyhole, Mail } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useLoginMutation } from '@/api/authApi';
import { setCredentials } from '@/auth/authSlice';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAppSelector((state) => state.auth.token);
  const [login, { isLoading, error }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  if (token) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginForm) => {
    try {
      const result = await login(values).unwrap();
      dispatch(setCredentials({ token: result.access_token, user: result.user }));
      navigate(from, { replace: true });
    } catch {
      // error surfaced via `error` below
    }
  };

  const brandPanel = (
    <Box
      sx={{
        flex: '1 1 45%',
        background: 'linear-gradient(160deg, #023020 0%, #04552B 100%)',
        color: '#fff',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 8,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            background: '#087A3D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileText size={24} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.2 }}>
            CRM<span style={{ color: '#4ADE80' }}>FINANCE</span>
          </Typography>
          <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: '#9FD9B4' }}>
            KIM
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography variant="h4" sx={{ maxWidth: 440, lineHeight: 1.25 }}>
          Vehicle finance pipeline, managed end to end.
        </Typography>
        <Typography sx={{ mt: 2, color: '#BFE6CC', fontSize: 14, maxWidth: 400 }}>
          Track applications from lead to disbursement — documents, verification, sanctions and
          deliveries in one dashboard.
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 12, color: '#8FC5A5' }}>
        © 2025 CRMFinance. All rights reserved.
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#F7F9F5' }}>
      {brandPanel}

      <Box
        sx={{
          flex: '1 1 55%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: '#087A3D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <FileText size={20} />
            </Box>
            <Typography sx={{ fontWeight: 800, color: '#023020' }}>
              CRM<span style={{ color: '#087A3D' }}>FINANCE</span>
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ color: '#023020' }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: '#7A8B80', fontSize: 13, mt: 0.5, mb: 4 }}>
            Sign in to the KIM finance dashboard.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              Invalid email or password. Please try again.
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              fullWidth
              label="Email"
              type="email"
              autoComplete="email"
              margin="normal"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              slotProps={{
                input: {
                  startAdornment: <Mail size={16} color="#9BA99F" style={{ marginRight: 8 }} />,
                },
              }}
              {...register('email')}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              autoComplete="current-password"
              margin="normal"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <LockKeyhole size={16} color="#9BA99F" style={{ marginRight: 8 }} />
                  ),
                },
              }}
              {...register('password')}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{ mt: 3, py: 1.2, fontWeight: 700 }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Box
            sx={{
              mt: 4,
              p: 2,
              borderRadius: 2,
              background: '#F2FAF0',
              border: '1px solid #E4EBE1',
              fontSize: 12,
              color: '#44584C',
            }}
          >
            <Typography sx={{ fontWeight: 700, color: '#04552B', mb: 0.5 }}>Demo credentials</Typography>
            sales@kim.com / Kim@2025
            <br />
            finance@kim.com · delivery@kim.com · admin@kim.com (same password)
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link
              to="/"
              style={{ fontSize: 12, color: '#7A8B80', textDecoration: 'none' }}
            >
              © 2025 CRMFinance · Privacy · Terms
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
