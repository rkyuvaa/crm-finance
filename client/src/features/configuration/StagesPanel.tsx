import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import type { StageConfig } from '@/types';

type StageModule = 'LEAD' | 'OPPORTUNITY';

const PRESET_COLORS = [
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Cyan', hex: '#0891B2' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Sky', hex: '#0284C7' },
  { name: 'Orange', hex: '#EA580C' },
];

const formSchema = z.object({
  key: z
    .string()
    .min(2, 'Key is required')
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, _ or -'),
  label: z.string().min(2, 'Label is required'),
  order_index: z.coerce.number({ invalid_type_error: 'Required' }).int('Must be a whole number').nonnegative(),
  enabled: z.boolean(),
  color: z.string().optional().or(z.literal('')),
  module: z.enum(['LEAD', 'OPPORTUNITY']),
});

type FormValues = z.infer<typeof formSchema>;

function StageFormDialog({
  open,
  editing,
  defaultModule,
  onClose,
}: {
  open: boolean;
  editing: StageConfig | null;
  defaultModule: StageModule;
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
    defaultValues: { key: '', label: '', order_index: 0, enabled: true, color: '#2563EB', module: defaultModule },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      key: editing?.key ?? '',
      label: editing?.label ?? '',
      order_index: editing?.order_index ?? 0,
      enabled: editing?.enabled ?? true,
      color: editing?.color ?? '#2563EB',
      module: (editing?.module as StageModule) ?? defaultModule,
    });
  }, [open, editing, defaultModule, reset]);

  const selectedColor = watch('color');
  const selectedModule = watch('module');

  const onSubmit = async (values: FormValues) => {
    const body = {
      key: values.key,
      label: values.label,
      order_index: values.order_index,
      enabled: values.enabled,
      color: values.color || null,
      module: values.module,
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
          {/* Module selector */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#44584C', display: 'block', marginBottom: 6 }}>
              Module
            </span>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={selectedModule}
              onChange={(_, val) => { if (val) setValue('module', val); }}
              disabled={Boolean(editing)}
            >
              <ToggleButton value="LEAD" sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
                Lead
              </ToggleButton>
              <ToggleButton value="OPPORTUNITY" sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
                Opportunity
              </ToggleButton>
            </ToggleButtonGroup>
            {editing && (
              <div style={{ fontSize: 11, color: '#7A8B80', marginTop: 4 }}>
                Module cannot be changed after creation.
              </div>
            )}
          </div>

          <TextField
            fullWidth
            label="Key"
            margin="dense"
            disabled={Boolean(editing)}
            placeholder="e.g. lead_new"
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
          <TextField
            fullWidth
            label="Order"
            type="number"
            margin="dense"
            error={Boolean(errors.order_index)}
            helperText={errors.order_index?.message}
            {...register('order_index')}
          />

          <div style={{ marginTop: 14, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#44584C', display: 'block', marginBottom: 6 }}>
              Stage Color Accent
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setValue('color', c.hex)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: selectedColor === c.hex ? '2px solid #023020' : '2px solid transparent',
                    boxShadow: selectedColor === c.hex ? '0 0 0 2px rgba(8,122,61,0.4)' : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <TextField
            fullWidth
            label="Custom Hex Color"
            margin="dense"
            placeholder="#2563EB"
            error={Boolean(errors.color)}
            helperText={errors.color?.message}
            {...register('color')}
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
  const [activeModule, setActiveModule] = useState<StageModule>('LEAD');

  const allStages = data ?? [];
  const stages = allStages.filter((s) => (s.module ?? 'OPPORTUNITY') === activeModule);

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
        {/* Header */}
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

        {/* Module tabs */}
        <Box sx={{ borderBottom: '1px solid #E4EBE1', px: 2 }}>
          <Tabs
            value={activeModule}
            onChange={(_, val) => setActiveModule(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minWidth: 120 } }}
          >
            <Tab value="LEAD" label="Lead Stages" />
            <Tab value="OPPORTUNITY" label="Opportunity Stages" />
          </Tabs>
        </Box>

        {/* Table */}
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
              title={`No ${activeModule === 'LEAD' ? 'Lead' : 'Opportunity'} stages configured`}
              hint={
                isAdmin
                  ? `Click "Add Stage" to create stages for the ${activeModule === 'LEAD' ? 'Lead' : 'Opportunity'} pipeline.`
                  : 'Contact an admin to configure stages.'
              }
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['Order', 'Key', 'Label', 'Color', 'Show', ...(isAdmin ? ['Actions'] : [])].map((h) => (
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
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: s.color || '#2563EB',
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#7A8B80' }}>{s.color || 'Default'}</span>
                      </div>
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

      <StageFormDialog
        open={dialogOpen}
        editing={editing}
        defaultModule={activeModule}
        onClose={() => setDialogOpen(false)}
      />

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
