import { useEffect, useState } from 'react';
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
  useActivityTypesQuery,
  useCreateActivityTypeMutation,
  useDeleteActivityTypeMutation,
  useUpdateActivityTypeMutation,
} from '@/api/mastersApi';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import type { ActivityType } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, 'Activity type name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function ActivityTypeFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: ActivityType | null;
  onClose: () => void;
}) {
  const [createType, { isLoading: creating }] = useCreateActivityTypeMutation();
  const [updateType, { isLoading: updating }] = useUpdateActivityTypeMutation();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', icon: 'Calendar' },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      icon: editing?.icon ?? 'Calendar',
    });
  }, [open, editing, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await updateType({ id: editing.id, body: values }).unwrap();
        showToast('Activity type updated', 'success');
      } else {
        await createType(values).unwrap();
        showToast('Activity type added', 'success');
      }
      reset();
      onClose();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not save activity type', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editing ? 'Edit Activity Type' : 'Add Activity Type'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            fullWidth
            label="Activity type name (e.g. Phone Call, Follow-up, Meeting)"
            margin="dense"
            autoFocus
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
          <TextField
            fullWidth
            label="Description (optional)"
            margin="dense"
            multiline
            rows={2}
            {...register('description')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={creating || updating}>
            {editing ? 'Save Changes' : 'Add Activity Type'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function ActivityTypesPanel() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'ADMIN';
  const { data, isFetching, isError, refetch } = useActivityTypesQuery();
  const [deleteType] = useDeleteActivityTypeMutation();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityType | null>(null);

  const types = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (type: ActivityType) => {
    setEditing(type);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteType(deleteTarget.id).unwrap();
      showToast(`${deleteTarget.name} deleted`, 'success');
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not delete activity type', 'error');
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
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>Activity Types</span>
          {isAdmin && (
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={openCreate}>
              Add Activity Type
            </Button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={6} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading activity types
              </Button>
            </div>
          ) : types.length === 0 ? (
            <EmptyState
              title="No activity types configured"
              hint={isAdmin ? 'Add activity types like Phone Call, Site Visit, Documents Collection.' : 'Contact an admin to configure activity types.'}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>
                  {['Name', 'Description', ...(isAdmin ? ['Actions'] : [])].map((h) => (
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
                {types.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 600, color: '#16231B' }}>
                      {t.name}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C', fontSize: 13 }}>
                      {t.description || '—'}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <IconButton size="small" aria-label={`Edit ${t.name}`} onClick={() => openEdit(t)}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton size="small" aria-label={`Delete ${t.name}`} onClick={() => setDeleteTarget(t)}>
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

      <ActivityTypeFormDialog open={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete activity type?</DialogTitle>
        <DialogContent>
          This will remove "{deleteTarget?.name}".
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
