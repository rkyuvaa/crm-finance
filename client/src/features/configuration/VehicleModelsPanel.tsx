import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import {
  useCreateVehicleModelMutation,
  useDeleteVehicleModelMutation,
  useUpdateVehicleModelMutation,
  useVehicleModelsQuery,
} from '@/api/mastersApi';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import { formatAmount } from '@/utils/format';
import type { VehicleModel } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, 'Model name is required'),
  vehicle_price: z.coerce.number({ invalid_type_error: 'Required' }).positive('Must be positive'),
  down_payment: z.coerce
    .number({ invalid_type_error: 'Required' })
    .nonnegative('Cannot be negative'),
  loan_amount: z.coerce.number({ invalid_type_error: 'Required' }).positive('Must be positive'),
});

type FormValues = z.infer<typeof formSchema>;

function ModelFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: VehicleModel | null;
  onClose: () => void;
}) {
  const [createModel, { isLoading: creating }] = useCreateVehicleModelMutation();
  const [updateModel, { isLoading: updating }] = useUpdateVehicleModelMutation();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      vehicle_price: 0,
      down_payment: 0,
      loan_amount: 0,
    },
  });

  const price = watch('vehicle_price');
  const downPayment = watch('down_payment');
  const skipAutoCalc = useRef(false);

  useEffect(() => {
    if (!open) return;
    skipAutoCalc.current = true;
    reset({
      name: editing?.name ?? '',
      vehicle_price: editing?.vehicle_price ?? 0,
      down_payment: editing?.down_payment ?? 0,
      loan_amount: editing?.loan_amount ?? 0,
    });
    window.setTimeout(() => {
      skipAutoCalc.current = false;
    }, 0);
  }, [open, editing, reset]);

  useEffect(() => {
    if (skipAutoCalc.current) return;
    if (Number.isFinite(Number(price)) && Number.isFinite(Number(downPayment))) {
      const loan = Number(price) - Number(downPayment);
      if (loan > 0) setValue('loan_amount', loan);
    }
  }, [price, downPayment, setValue]);

  const onSubmit = async (values: FormValues) => {
    const body = {
      name: values.name,
      vehicle_price: values.vehicle_price,
      down_payment: values.down_payment,
      loan_amount: values.loan_amount,
    };
    try {
      if (editing) {
        await updateModel({ id: editing.id, body }).unwrap();
        showToast('Vehicle model updated', 'success');
      } else {
        await createModel(body).unwrap();
        showToast('Vehicle model created', 'success');
      }
      reset();
      onClose();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not save vehicle model', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit Vehicle Model' : 'Add Vehicle Model'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            fullWidth
            label="Model name"
            margin="dense"
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextField
              fullWidth
              label="Vehicle price (₹)"
              type="number"
              margin="dense"
              error={Boolean(errors.vehicle_price)}
              helperText={errors.vehicle_price?.message}
              {...register('vehicle_price')}
            />
            <TextField
              fullWidth
              label="Down payment (₹)"
              type="number"
              margin="dense"
              error={Boolean(errors.down_payment)}
              helperText={errors.down_payment?.message}
              {...register('down_payment')}
            />
          </div>
          <TextField
            fullWidth
            label="Loan amount (₹)"
            type="number"
            margin="dense"
            helperText="Auto-calculated as vehicle price minus down payment; you can override it."
            error={Boolean(errors.loan_amount)}
            {...register('loan_amount')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={creating || updating}>
            {editing ? 'Save Changes' : 'Add Model'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function VehicleModelsPanel() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'ADMIN';
  const { data, isFetching, isError, refetch } = useVehicleModelsQuery();
  const [deleteModel] = useDeleteVehicleModelMutation();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleModel | null>(null);

  const models = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (model: VehicleModel) => {
    setEditing(model);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModel(deleteTarget.id).unwrap();
      showToast(`${deleteTarget.name} deleted`, 'success');
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not delete vehicle model', 'error');
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: '13px 16px',
            borderBottom: '1px solid #E4EBE1',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>Vehicle Models</span>
          {isAdmin && (
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={openCreate}>
              Add Model
            </Button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={6} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading models
              </Button>
            </div>
          ) : models.length === 0 ? (
            <EmptyState
              title="No vehicle models yet"
              hint={isAdmin ? 'Add a model to pre-fill price, down payment and loan details for new leads.' : 'Contact an admin to configure vehicle models.'}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  {['Model', 'Vehicle Price', 'Down Payment', 'Loan Amount', 'Finance Company', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                    <th
                      key={h}
                      style={{
                        background: '#F2FAF0',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#7A8B80',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        textAlign: 'left',
                        padding: '10px 16px',
                        borderBottom: '1px solid #E4EBE1',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 600, color: '#16231B' }}>
                      {m.name}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 700 }}>
                      {formatAmount(m.vehicle_price)}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C' }}>
                      {formatAmount(m.down_payment)}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 700 }}>
                      {formatAmount(m.loan_amount)}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C' }}>
                      {m.finance_company_name ?? '—'}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <IconButton size="small" aria-label={`Edit ${m.name}`} onClick={() => openEdit(m)}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton size="small" aria-label={`Delete ${m.name}`} onClick={() => setDeleteTarget(m)}>
                            <Trash2 size={15} color="#DC2626" />
                          </IconButton>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Paper>

      <ModelFormDialog open={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete vehicle model?</DialogTitle>
        <DialogContent>
          This will remove {deleteTarget?.name} from the master. Existing leads keep their captured details.
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
