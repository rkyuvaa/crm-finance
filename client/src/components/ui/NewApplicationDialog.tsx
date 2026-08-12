import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useCreateApplicationMutation } from '@/api/applicationsApi';
import { useToast } from '@/components/ui/ToastHost';

export const createSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_phone: z.string().min(8, 'Valid phone number required').max(20),
  vehicle: z.string().min(2, 'Vehicle is required'),
  amount: z.coerce.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be positive'),
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
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { customer_name: '', customer_phone: '', vehicle: '', amount: 0 },
  });

  const onSubmit = async (values: CreateForm) => {
    try {
      const app = await createApplication({ ...values, status: 'LEAD' }).unwrap();
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
          <TextField
            fullWidth
            label="Vehicle"
            margin="dense"
            error={Boolean(errors.vehicle)}
            helperText={errors.vehicle?.message}
            {...register('vehicle')}
          />
          <TextField
            fullWidth
            label="Finance amount (₹)"
            type="number"
            margin="dense"
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              },
            }}
            {...register('amount')}
          />
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