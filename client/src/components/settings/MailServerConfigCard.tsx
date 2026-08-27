import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Send, Server, ShieldCheck, Zap } from 'lucide-react';

import {
  useGetSmtpSettingsQuery,
  useTestSmtpConnectionMutation,
  useUpdateSmtpSettingsMutation,
} from '@/api/smtpApi';
import { useToast } from '@/components/ui/ToastHost';

const smtpSchema = z.object({
  smtp_host: z.string().optional().or(z.literal('')),
  smtp_port: z.coerce.number().min(1, 'Port must be between 1 and 65535').max(65535),
  smtp_security: z.enum(['TLS', 'SSL', 'NONE']),
  smtp_user: z.string().optional().or(z.literal('')),
  smtp_password: z.string().optional().or(z.literal('')),
  smtp_from_email: z.string().email('Invalid sender email').optional().or(z.literal('')),
  smtp_from_name: z.string().min(1, 'Sender name is required'),
  is_enabled: z.boolean(),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

export default function MailServerConfigCard() {
  const { showToast } = useToast();
  const { data: smtp, isLoading } = useGetSmtpSettingsQuery();
  const [updateSmtp, { isLoading: isSaving }] = useUpdateSmtpSettingsMutation();
  const [testSmtp, { isLoading: isTesting }] = useTestSmtpConnectionMutation();

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      smtp_host: '',
      smtp_port: 587,
      smtp_security: 'TLS',
      smtp_user: '',
      smtp_password: '',
      smtp_from_email: '',
      smtp_from_name: 'CRMFinance',
      is_enabled: true,
    },
  });

  useEffect(() => {
    if (smtp) {
      reset({
        smtp_host: smtp.smtp_host ?? '',
        smtp_port: smtp.smtp_port ?? 587,
        smtp_security: (smtp.smtp_security as 'TLS' | 'SSL' | 'NONE') ?? 'TLS',
        smtp_user: smtp.smtp_user ?? '',
        smtp_password: '',
        smtp_from_email: smtp.smtp_from_email ?? '',
        smtp_from_name: smtp.smtp_from_name ?? 'CRMFinance',
        is_enabled: smtp.is_enabled ?? true,
      });
    }
  }, [smtp, reset]);

  const isEnabled = watch('is_enabled');
  const securityVal = watch('smtp_security');
  const hostVal = watch('smtp_host');

  const applyPreset = (host: string, port: number, security: 'TLS' | 'SSL' | 'NONE') => {
    setValue('smtp_host', host);
    setValue('smtp_port', port);
    setValue('smtp_security', security);
    showToast(`Applied preset for ${host}`, 'info');
  };

  const onSave = async (values: SmtpFormValues) => {
    try {
      await updateSmtp({
        smtp_host: values.smtp_host ? values.smtp_host.trim() : null,
        smtp_port: values.smtp_port,
        smtp_security: values.smtp_security,
        smtp_user: values.smtp_user ? values.smtp_user.trim() : null,
        smtp_password: values.smtp_password ? values.smtp_password.trim() : null,
        smtp_from_email: values.smtp_from_email ? values.smtp_from_email.trim() : null,
        smtp_from_name: values.smtp_from_name ? values.smtp_from_name.trim() : 'CRMFinance',
        is_enabled: values.is_enabled,
      }).unwrap();

      showToast('Mail server settings saved successfully', 'success');
      setValue('smtp_password', '');
    } catch (err: any) {
      const detail = err?.data?.detail || 'Failed to save mail server settings';
      showToast(typeof detail === 'string' ? detail : 'Failed to save settings', 'error');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailInput || !testEmailInput.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setTestResult(null);
    const formVals = watch();

    try {
      const res = await testSmtp({
        test_email: testEmailInput.trim(),
        smtp_host: formVals.smtp_host ? formVals.smtp_host.trim() : null,
        smtp_port: formVals.smtp_port,
        smtp_security: formVals.smtp_security,
        smtp_user: formVals.smtp_user ? formVals.smtp_user.trim() : null,
        smtp_password: formVals.smtp_password ? formVals.smtp_password.trim() : null,
        smtp_from_email: formVals.smtp_from_email ? formVals.smtp_from_email.trim() : null,
        smtp_from_name: formVals.smtp_from_name ? formVals.smtp_from_name.trim() : 'CRMFinance',
      }).unwrap();

      setTestResult({ success: true, message: res.message });
      showToast(res.message, 'success');
    } catch (err: any) {
      const detail = err?.data?.detail || 'SMTP Connection Test Failed';
      setTestResult({ success: false, message: typeof detail === 'string' ? detail : 'Test failed' });
      showToast('SMTP Test Failed', 'error');
    }
  };

  if (isLoading) {
    return (
      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 4, textAlign: 'center' }}>
        <CircularProgress color="success" size={28} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3, background: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <div>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Server size={20} color="#087A3D" />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#023020' }}>
              Mail Server Configuration (SMTP)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#7A8B80', mt: 0.5 }}>
            Configure your SMTP server credentials for sending document links to financiers and automated email notifications.
          </Typography>
        </div>

        <FormControlLabel
          control={
            <Switch
              checked={isEnabled}
              onChange={(e) => setValue('is_enabled', e.target.checked)}
              color="success"
            />
          }
          label={<span style={{ fontWeight: 700, fontSize: 13, color: isEnabled ? '#087A3D' : '#7A8B80' }}>{isEnabled ? 'Mail Service Enabled' : 'Service Disabled'}</span>}
        />
      </Box>

      {/* Quick Provider Presets */}
      <Box sx={{ mb: 2.5, p: 2, backgroundColor: '#F8FAF7', borderRadius: '10px', border: '1px solid #E4EBE1' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Zap size={14} color="#087A3D" />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#023020', textTransform: 'uppercase' }}>
            Quick Presets (1-Click Provider Setup)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="Gmail / Google Workspace"
            onClick={() => applyPreset('smtp.gmail.com', 587, 'TLS')}
            sx={{ fontWeight: 700, fontSize: 11.5, cursor: 'pointer', backgroundColor: '#FFFFFF', border: '1px solid #D6E4D9' }}
          />
          <Chip
            label="Zoho Mail (India - .in)"
            onClick={() => applyPreset('smtp.zoho.in', 587, 'TLS')}
            sx={{ fontWeight: 700, fontSize: 11.5, cursor: 'pointer', backgroundColor: '#FFFFFF', border: '1px solid #D6E4D9' }}
          />
          <Chip
            label="Zoho Mail (Global - .com)"
            onClick={() => applyPreset('smtp.zoho.com', 587, 'TLS')}
            sx={{ fontWeight: 700, fontSize: 11.5, cursor: 'pointer', backgroundColor: '#FFFFFF', border: '1px solid #D6E4D9' }}
          />
          <Chip
            label="Office 365 / Outlook"
            onClick={() => applyPreset('smtp.office365.com', 587, 'TLS')}
            sx={{ fontWeight: 700, fontSize: 11.5, cursor: 'pointer', backgroundColor: '#FFFFFF', border: '1px solid #D6E4D9' }}
          />
          <Chip
            label="SendGrid"
            onClick={() => applyPreset('smtp.sendgrid.net', 587, 'TLS')}
            sx={{ fontWeight: 700, fontSize: 11.5, cursor: 'pointer', backgroundColor: '#FFFFFF', border: '1px solid #D6E4D9' }}
          />
        </Box>
      </Box>

      {hostVal?.toLowerCase().includes('gmail') ? (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px', '& .MuiAlert-message': { fontSize: 13, lineHeight: 1.5 } }}>
          <strong>Google Gmail Setup:</strong> Google requires a 16-character <strong>App Password</strong> (normal login passwords will fail with 535 error). Turn on 2-Step Verification on your Google account and generate an App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#087A3D' }}>myaccount.google.com/apppasswords</a>.
        </Alert>
      ) : hostVal?.toLowerCase().includes('zoho') ? (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: '10px', '& .MuiAlert-message': { fontSize: 13, lineHeight: 1.5 } }}>
          <strong>Zoho Mail Setup:</strong> Use <code>smtp.zoho.in</code> for India accounts or <code>smtp.zoho.com</code> for Global. Ensure <em>SMTP Access</em> is enabled in your Zoho Mail account settings. If 2FA is active, generate an App Password under Zoho Account Security.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: '10px', '& .MuiAlert-message': { fontSize: 13, lineHeight: 1.5 } }}>
          Enter your SMTP Host, Port (587 for TLS, 465 for SSL), Username, and App Password. Click <strong>Test Connection</strong> to verify settings before saving.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSave)}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="SMTP Host"
            placeholder="e.g. smtp.gmail.com or smtp.zoho.in"
            margin="dense"
            error={Boolean(errors.smtp_host)}
            helperText={errors.smtp_host?.message}
            {...register('smtp_host')}
          />
          <TextField
            fullWidth
            label="Port"
            type="number"
            placeholder="587"
            margin="dense"
            error={Boolean(errors.smtp_port)}
            helperText={errors.smtp_port?.message}
            {...register('smtp_port')}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="smtp-security-label">Encryption</InputLabel>
            <Select
              labelId="smtp-security-label"
              label="Encryption"
              value={securityVal}
              onChange={(e) => {
                const sec = e.target.value as 'TLS' | 'SSL' | 'NONE';
                setValue('smtp_security', sec);
                if (sec === 'TLS') setValue('smtp_port', 587);
                if (sec === 'SSL') setValue('smtp_port', 465);
                if (sec === 'NONE') setValue('smtp_port', 25);
              }}
            >
              <MenuItem value="TLS">TLS (STARTTLS - Port 587)</MenuItem>
              <MenuItem value="SSL">SSL (Implicit - Port 465)</MenuItem>
              <MenuItem value="NONE">None (Plain TCP - Port 25)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="SMTP Username / Email"
            placeholder="e.g. notifications@domain.com"
            margin="dense"
            error={Boolean(errors.smtp_user)}
            helperText={errors.smtp_user?.message}
            {...register('smtp_user')}
          />
          <TextField
            fullWidth
            label="SMTP Password / App Password"
            type="password"
            placeholder={smtp?.has_password ? '•••••••• (Leave blank to keep existing)' : 'Enter SMTP password'}
            margin="dense"
            error={Boolean(errors.smtp_password)}
            helperText={errors.smtp_password?.message}
            {...register('smtp_password')}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Sender Email Address"
            placeholder="e.g. no-reply@domain.com"
            margin="dense"
            error={Boolean(errors.smtp_from_email)}
            helperText={errors.smtp_from_email?.message || 'Must match your SMTP user or authorized domain alias'}
            {...register('smtp_from_email')}
          />
          <TextField
            fullWidth
            label="Sender Display Name"
            placeholder="CRMFinance"
            margin="dense"
            error={Boolean(errors.smtp_from_name)}
            helperText={errors.smtp_from_name?.message}
            {...register('smtp_from_name')}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => {
              setTestDialogOpen(true);
              setTestResult(null);
              setTestEmailInput(watch('smtp_from_email') || watch('smtp_user') || '');
            }}
            startIcon={<Send size={16} />}
            sx={{
              borderColor: '#087A3D',
              color: '#087A3D',
              '&:hover': { borderColor: '#023020', backgroundColor: '#EAF6E8' },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
            }}
          >
            Test Connection
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <ShieldCheck size={16} />}
            sx={{
              backgroundColor: '#023020',
              '&:hover': { backgroundColor: '#012015' },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Mail Server Settings'}
          </Button>
        </Box>
      </form>

      {/* Test Connection Modal */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#023020' }}>
          <Mail size={22} color="#087A3D" />
          Send Test Email
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#7A8B80', mb: 2 }}>
            Enter a recipient email address to send a test message using your current form configuration.
          </Typography>

          <TextField
            fullWidth
            label="Recipient Email Address"
            placeholder="your-email@gmail.com"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            sx={{ mb: 2 }}
          />

          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ borderRadius: '8px', '& .MuiAlert-message': { fontSize: 13, lineHeight: 1.5 } }}
            >
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setTestDialogOpen(false)} sx={{ textTransform: 'none', color: '#7A8B80' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSendTestEmail}
            disabled={isTesting}
            startIcon={isTesting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
            sx={{
              backgroundColor: '#087A3D',
              '&:hover': { backgroundColor: '#023020' },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
            }}
          >
            {isTesting ? 'Sending Test...' : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
