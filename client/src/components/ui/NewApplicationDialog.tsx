import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useCreateApplicationMutation } from '@/api/applicationsApi';
import {
  useFinanceCompaniesQuery,
  useVehicleModelsQuery,
} from '@/api/vehicleModelsApi';
import { useToast } from '@/components/ui/ToastHost';

export const createSchema = z.object({
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

export type CreateForm = z.infer<typeof createSchema>;

interface NewApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  submitLabel?: string;
}

export default function NewApplicationDialog({
  open,
  onClose,
  title = 'New Application',
  submitLabel = 'Create Application',
}: NewApplicationDialogProps) {
  const [createApplication, { isLoading }] = useCreateApplicationMutation();
  const { data: models = [], isFetching: loadingModels } = useVehicleModelsQuery();
  const { data: companies = [] } = useFinanceCompaniesQuery();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      vehicle_model_id: '',
      vehicle_price: 0,
      down_payment: 0,
      amount: 0,
      finance_company_id: '',
    },
  });

  const modelId = watch('vehicle_model_id');
  const selectedModel = models.find((m) => String(m.id) === modelId);

  const onModelChange = (id: string) => {
    setValue('vehicle_model_id', id, { shouldValidate: true });
    const model = models.find((m) => String(m.id) === id);
    if (model) {
      setValue('vehicle_price', model.vehicle_price);
      setValue('down_payment', model.down_payment);
      setValue('amount', model.loan_amount);
      setValue(
        'finance_company_id',
        model.finance_company_id ? String(model.finance_company_id) : '',
      );
    }
  };

  const onSubmit = async (values: CreateForm) => {
    try {
      const app = await createApplication({
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        vehicle: selectedModel?.name ?? '',
        amount: values.amount,
        status: 'LEAD',
        vehicle_model_id: values.vehicle_model_id ? Number(values.vehicle_model_id) : null,
        vehicle_price: values.vehicle_price,
        down_payment: values.down_payment,
        finance_company_id: values.finance_company_id ? Number(values.finance_company_id) : null,
      }).unwrap();
      showToast(`Application ${app.app_no} created`, 'success');
      reset();
      onClose();
    } catch {
      showToast('Could not create the application', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
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
          <Select
            fullWidth
            displayEmpty
            size="small"
            value={modelId}
            onChange={(e) => onModelChange(String(e.target.value))}
            error={Boolean(errors.vehicle_model_id)}
            sx={{ mt: 1, mb: 0.5 }}
            renderValue={(value) =>
              value ? models.find((m) => String(m.id) === value)?.name ?? value : 'Select vehicle model'
            }
            inputProps={{ 'aria-label': 'Vehicle model' }}
          >
            {loadingModels && <MenuItem disabled>Loading models…</MenuItem>}
            {!loadingModels && models.length === 0 && (
              <MenuItem disabled>No models configured — add them in Vehicle Models</MenuItem>
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
              label="Vehicle price (₹)"
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
              label="Down payment (₹)"
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
            label="Loan amount (₹)"
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
