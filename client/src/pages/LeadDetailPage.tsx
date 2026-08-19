import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useApplicationsQuery,
  useUpdateApplicationMutation,
  useApplicationActivityQuery,
} from '@/api/applicationsApi';
import { useFinanceCompaniesQuery, useVehicleModelsQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/utils/format';

const editSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_phone: z.string().min(8, 'Valid phone number required').max(20),
  vehicle_model_id: z.string().min(1, 'Select a vehicle model'),
  vehicle_price: z.coerce
    .number({ invalid_type_error: 'Vehicle price is required' })
    .positive('Vehicle price must be positive'),
  down_payment: z.coerce
    .number({ invalid_type_error: 'Down payment is required' })
    .nonnegative('Down payment cannot be negative'),
  amount: z.coerce
    .number({ invalid_type_error: 'Loan amount is required' })
    .positive('Loan amount must be positive'),
  finance_company_id: z.string().min(1, 'Select a finance company'),
});

type EditForm = z.infer<typeof editSchema>;

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const appId = Number(id);

  const { data: applicationsData, isFetching } = useApplicationsQuery({
    page: 1,
    page_size: 100,
    status: 'LEAD',
  });
  const lead = applicationsData?.items?.find((item) => item.id === appId) ?? null;

  const { data: activityLogs = [] } = useApplicationActivityQuery(appId, { skip: !appId });
  const [updateApplication, { isLoading }] = useUpdateApplicationMutation();
  const { data: models = [], isFetching: loadingModels } = useVehicleModelsQuery();
  const { data: companies = [] } = useFinanceCompaniesQuery();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const modelId = watch('vehicle_model_id');

  useEffect(() => {
    if (lead) {
      reset({
        customer_name: lead.customer_name,
        customer_phone: lead.customer_phone,
        vehicle_model_id: String(lead.vehicle_model_id ?? ''),
        vehicle_price: lead.vehicle_price ?? 0,
        down_payment: lead.down_payment ?? 0,
        amount: lead.amount,
        finance_company_id: String(lead.finance_company_id ?? ''),
      });
    }
  }, [lead, reset]);

  const selectedModel = models.find((m) => String(m.id) === modelId);

  const onSubmit = async (values: EditForm) => {
    if (!lead) return;
    try {
      await updateApplication({
        id: lead.id,
        body: {
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          vehicle: selectedModel?.name ?? lead.vehicle,
          amount: values.amount,
          status: lead.status,
          vehicle_model_id: values.vehicle_model_id ? Number(values.vehicle_model_id) : null,
          vehicle_price: values.vehicle_price,
          down_payment: values.down_payment,
          finance_company_id: values.finance_company_id ? Number(values.finance_company_id) : null,
        },
      }).unwrap();
      showToast(`Lead ${lead.app_no} updated`, 'success');
    } catch {
      showToast('Could not update the lead', 'error');
    }
  };

  if (isFetching) {
    return <div style={{ padding: 24, color: '#7A8B80' }}>Loading lead details...</div>;
  }

  if (!lead) {
    return (
      <div style={{ padding: 24 }}>
        <Typography variant="h6" color="error">Lead not found</Typography>
        <Button onClick={() => navigate('/leads')} sx={{ mt: 2 }}>Back to Leads</Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/leads')}
          sx={{ color: '#44584C', textTransform: 'none', fontWeight: 600 }}
        >
          Back to Leads
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>
                {lead.app_no}
              </div>
              <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
                Lead Details
              </div>
            </div>
            <StatusBadge status={lead.status} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <TextField
                fullWidth
                label="Customer name"
                margin="dense"
                error={Boolean(errors.customer_name)}
                helperText={errors.customer_name?.message}
                {...register('customer_name')}
              />
              <TextField
                fullWidth
                label="Mobile number"
                margin="dense"
                error={Boolean(errors.customer_phone)}
                helperText={errors.customer_phone?.message}
                {...register('customer_phone')}
              />
            </div>

            <Select
              fullWidth
              displayEmpty
              size="small"
              value={modelId}
              onChange={(e) => setValue('vehicle_model_id', String(e.target.value), { shouldValidate: true })}
              error={Boolean(errors.vehicle_model_id)}
              sx={{ mt: 1, mb: 0.5 }}
              renderValue={(value) =>
                value ? models.find((m) => String(m.id) === value)?.name ?? value : 'Select vehicle model'
              }
              inputProps={{ 'aria-label': 'Vehicle model' }}
            >
              {loadingModels && <MenuItem disabled>Loading models...</MenuItem>}
              {!loadingModels && models.length === 0 && (
                <MenuItem disabled>No models configured — add them in Configuration</MenuItem>
              )}
              {models.map((m) => (
                <MenuItem key={m.id} value={String(m.id)}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
            {errors.vehicle_model_id && (
              <div style={{ fontSize: 11.5, color: '#d32f2f', margin: '2px 14px 0' }}>
                {errors.vehicle_model_id.message}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TextField
                fullWidth
                label="Vehicle price"
                type="number"
                margin="dense"
                error={Boolean(errors.vehicle_price)}
                helperText={errors.vehicle_price?.message}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                }}
                {...register('vehicle_price')}
              />
              <TextField
                fullWidth
                label="Down payment"
                type="number"
                margin="dense"
                error={Boolean(errors.down_payment)}
                helperText={errors.down_payment?.message}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                }}
                {...register('down_payment')}
              />
            </div>

            <TextField
              fullWidth
              label="Loan amount"
              type="number"
              margin="dense"
              error={Boolean(errors.amount)}
              helperText={errors.amount?.message}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
              }}
              {...register('amount')}
            />

            <Select
              fullWidth
              displayEmpty
              size="small"
              value={watch('finance_company_id')}
              onChange={(e) => setValue('finance_company_id', String(e.target.value), { shouldValidate: true })}
              error={Boolean(errors.finance_company_id)}
              sx={{ mt: 1, mb: 0.5 }}
              renderValue={(value) =>
                value ? companies.find((c) => String(c.id) === value)?.name ?? value : 'Select finance company'
              }
              inputProps={{ 'aria-label': 'Finance company' }}
            >
              <MenuItem value="">Select finance company</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
            {errors.finance_company_id && (
              <div style={{ fontSize: 11.5, color: '#d32f2f', margin: '2px 14px 0' }}>
                {errors.finance_company_id.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save size={16} />}
                disabled={isLoading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Paper>

        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 3 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#023020', marginBottom: 16 }}>
            Activity Log
          </div>

          {activityLogs.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: '#7A8B80', fontSize: 13 }}>
              No changes recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 12px',
                    background: '#F9FBF8',
                    borderRadius: 8,
                    border: '1px solid #E4EBE1',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#16231B' }}>
                      {log.field_name}
                    </div>
                    <div style={{ fontSize: 10, color: '#9BA99F' }}>
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#44584C' }}>
                    {log.old_value && (
                      <span style={{ textDecoration: 'line-through', color: '#DC2626' }}>
                        {log.old_value}
                      </span>
                    )}
                    {log.old_value && log.new_value && <span style={{ margin: '0 6px' }}>&rarr;</span>}
                    {log.new_value && (
                      <span style={{ color: '#087A3D', fontWeight: 600 }}>{log.new_value}</span>
                    )}
                  </div>
                  {log.actor_name && (
                    <div style={{ fontSize: 10, color: '#9BA99F', marginTop: 4 }}>
                      by {log.actor_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Paper>
      </div>
    </div>
  );
}
