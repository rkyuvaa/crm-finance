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
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Send, Server, ShieldCheck } from 'lucide-react';

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
        smtp_security: smtp.smtp_security ?? 'TLS',
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

  const onSave = async (values: SmtpFormValues) => {
    try {
      await updateSmtp({
        smtp_host: values.smtp_host || null,
        smtp_port: values.smtp_port,
        smtp_security: values.smtp_security,
        smtp_user: values.smtp_user || null,
        smtp_password: values.smtp_password || null,
        smtp_from_email: values.smtp_from_email || null,
        smtp_from_name: values.smtp_from_name,
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
        smtp_host: formVals.smtp_host || null,
        smtp_port: formVals.smtp_port,
        smtp_security: formVals.smtp_security,
        smtp_user: formVals.smtp_user || null,
        smtp_password: formVals.smtp_password || null,
        smtp_from_email: formVals.smtp_from_email || null,
        smtp_from_name: formVals.smtp_from_name,
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
            Configure your SMTP server credentials for sending no-login document links to financiers and system email alerts.
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

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: '10px', '& .MuiAlert-message': { fontSize: 13, lineHeight: 1.5 } }}>
        <strong>Zoho Configuration Guidelines:</strong><br />
        • <strong>Using Primary Login Password:</strong> Set Host to <code>smtp.zoho.in</code> (for India accounts) or <code>smtp.zoho.com</code>, Port <code>587</code>, Encryption <code>TLS</code>. Ensure <em>SMTP Access</em> is enabled in Zoho Admin.<br />
        • <strong>If 2FA/MFA is enabled on Zoho:</strong> Zoho requires an <em>App-Specific Password</em> (from <em>Zoho Account &gt; Security &gt; Application-Specific Passwords</em>).<br />
        • <strong>Sender Matching:</strong> Ensure <em>Sender Email Address</em> matches your <em>SMTP Username</em> (or is an authorized Send-As alias).
      </Alert>

      <form onSubmit={handleSubmit(onSave)}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="SMTP Host"
            placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net"
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
              onChange={(e) => setValue('smtp_security', e.target.value as 'TLS' | 'SSL' | 'NONE')}
            >
              <MenuItem value="TLS">TLS (STARTTLS)</MenuItem>
              <MenuItem value="SSL">SSL (Implicit)</MenuItem>
              <MenuItem value="NONE">None (Plain TCP)</MenuItem>
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
            margin="dense"
            placeholder={smtp?.has_password ? '•••••••• (Password Saved)' : 'Enter SMTP Password'}
            helperText={smtp?.has_password ? 'Leave empty to keep existing password' : 'App-specific password recommended'}
            error={Boolean(errors.smtp_password)}
            {...register('smtp_password')}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
          <TextField
            fullWidth
            label="Sender Email Address (From)"
            placeholder="e.g. noreply@crmfinance.com"
            margin="dense"
            error={Boolean(errors.smtp_from_email)}
            helperText={errors.smtp_from_email?.message}
            {...register('smtp_from_email')}
          />
          <TextField
            fullWidth
            label="Sender Name"
            placeholder="e.g. CRMFinance / KIM"
            margin="dense"
            error={Boolean(errors.smtp_from_name)}
            helperText={errors.smtp_from_name?.message}
            {...register('smtp_from_name')}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, pt: 1, borderTop: '1px solid #E4EBE1' }}>
          <Button
            type="button"
            variant="outlined"
            color="primary"
            startIcon={<Mail size={16} />}
            onClick={() => {
              setTestEmailInput(smtp?.smtp_from_email || smtp?.smtp_user || '');
              setTestResult(null);
              setTestDialogOpen(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Send Test Email
          </Button>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSaving}
            startIcon={<ShieldCheck size={18} />}
            sx={{ fontWeight: 800, px: 3, py: 1 }}
          >
            {isSaving ? 'Saving Settings...' : 'Save Mail Server Config'}
          </Button>
        </Box>
      </form>

      {/* Send Test Email Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020' }}>
          Send Test Email
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#44584C', mb: 2 }}>
            Enter a recipient email address to test your SMTP server connection and email delivery.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            label="Test Recipient Email"
            type="email"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder="recipient@example.com"
          />

          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {testResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTestDialogOpen(false)} color="inherit">
            Close
          </Button>
          <Button
            onClick={handleSendTestEmail}
            variant="contained"
            color="primary"
            disabled={isTesting}
            startIcon={<Send size={16} />}
            sx={{ fontWeight: 700 }}
          >
            {isTesting ? 'Sending Test...' : 'Send Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
