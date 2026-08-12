import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import {
  useCreateStageMutation,
  useDeleteStageMutation,
  useStagesQuery,
  useUpdateStageMutation,
} from '@/api/mastersApi';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import type { ApplicationStatus, StageConfig } from '@/types';

const STATUS_OPTIONS: ApplicationStatus[] = [
  'LEAD',
  'APPLICATION',
  'VERIFICATION',
  'FINANCE',
  'QUERY',
  'SANCTIONED',
  'DELIVERY',
  'DISBURSEMENT',
  'COMPLETED',
  'REJECTED',
];

const formSchema = z.object({
  key: z
    .string()
    .min(2, 'Key is required')
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, _ or -'),
  label: z.string().min(2, 'Label is required'),
  status: z.string().min(1, 'Select a status'),
  order_index: z.coerce.number({ invalid_type_error: 'Required' }).int('Must be a whole number').nonnegative(),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function StageFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: StageConfig | null;
  onClose: () => void;
}) {
  const [createStage, { isLoading: creating }] = useCreateStageMutation();
  const [updateStage, { isLoading: updating }] = useUpdateStageMutation();
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
    defaultValues: { key: '', label: '', status: '', order_index: 0, enabled: true },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      key: editing?.key ?? '',
      label: editing?.label ?? '',
      status: editing?.status ?? '',
      order_index: editing?.order_index ?? 0,
      enabled: editing?.enabled ?? true,
    });
  }, [open, editing, reset]);

  const onSubmit = async (values: FormValues) => {
    const body = {
      key: values.key,
      label: values.label,
      status: values.status as ApplicationStatus,
      order_index: values.order_index,
      enabled: values.enabled,
    };
    try {
      if (editing) {
        await updateStage({ id: editing.id, body }).unwrap();
        showToast('Stage updated', 'success');
      } else {
        await createStage(body).unwrap();
        showToast('Stage added', 'success');
      }
      reset();
      onClose();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not save stage', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            fullWidth
            label="Key"
            margin="dense"
            disabled={Boolean(editing)}
            placeholder="e.g. leads"
            error={Boolean(errors.key)}
            helperText={errors.key?.message}
            {...register('key')}
          />
          <TextField
            fullWidth
            label="Label"
            margin="dense"
            error={Boolean(errors.label)}
            helperText={errors.label?.message}
            {...register('label')}
          />
          <Select
            fullWidth
            displayEmpty
            size="small"
            value={watch('status')}
            onChange={(e) => setValue('status', String(e.target.value), { shouldValidate: true })}
            error={Boolean(errors.status)}
            sx={{ mt: 1, mb: 0.5 }}
            renderValue={(value) => (value ? String(value) : 'Select status')}
            inputProps={{ 'aria-label': 'Status' }}
          >
            <MenuItem value="">Select status</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
          <TextField
            fullWidth
            label="Order"
            type="number"
            margin="dense"
            error={Boolean(errors.order_index)}
            helperText={errors.order_index?.message}
            {...register('order_index')}
          />
          <FormControlLabel
            control={
              <Checkbox checked={watch('enabled')} onChange={(e) => setValue('enabled', e.target.checked)} />
            }
            label="Show this stage"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={creating || updating}>
            {editing ? 'Save Changes' : 'Add Stage'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function StagesPanel() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'ADMIN';
  const { data, isFetching, isError, refetch } = useStagesQuery();
  const [updateStage] = useUpdateStageMutation();
  const [deleteStage] = useDeleteStageMutation();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StageConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StageConfig | null>(null);

  const stages = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (stage: StageConfig) => {
    setEditing(stage);
    setDialogOpen(true);
  };

  const toggleEnabled = async (stage: StageConfig, enabled: boolean) => {
    try {
      await updateStage({ id: stage.id, body: { enabled } }).unwrap();
      showToast(`${stage.label} ${enabled ? 'shown' : 'hidden'}`, 'success');
    } catch {
      showToast('Could not update stage', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStage(deleteTarget.id).unwrap();
      showToast(`${deleteTarget.label} deleted`, 'success');
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not delete stage', 'error');
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
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>Stages</span>
          {isAdmin && (
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={openCreate}>
              Add Stage
            </Button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={6} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading stages
              </Button>
            </div>
          ) : stages.length === 0 ? (
            <EmptyState
              title="No stages configured"
              hint={isAdmin ? 'Add stages to control which statuses appear in the pipeline.' : 'Contact an admin to configure stages.'}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['Order', 'Key', 'Label', 'Status', 'Show', ...(isAdmin ? ['Actions'] : [])].map((h) => (
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
                {stages.map((s) => (
                  <tr key={s.id} style={{ opacity: s.enabled ? 1 : 0.55 }}>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C' }}>
                      {s.order_index}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <span className="app-id">{s.key}</span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 600, color: '#16231B' }}>
                      {s.label}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C', fontSize: 12 }}>
                      {s.status}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <Switch
                        size="small"
                        disabled={!isAdmin}
                        checked={s.enabled}
                        onChange={(e) => toggleEnabled(s, e.target.checked)}
                      />
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <IconButton size="small" aria-label={`Edit ${s.label}`} onClick={() => openEdit(s)}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton size="small" aria-label={`Delete ${s.label}`} onClick={() => setDeleteTarget(s)}>
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

      <StageFormDialog open={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete stage?</DialogTitle>
        <DialogContent>This will remove the {deleteTarget?.label} stage from the pipeline.</DialogContent>
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
