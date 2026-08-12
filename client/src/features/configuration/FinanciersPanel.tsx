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
  useCreateFinanceCompanyMutation,
  useDeleteFinanceCompanyMutation,
  useFinanceCompaniesQuery,
  useUpdateFinanceCompanyMutation,
} from '@/api/mastersApi';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import type { FinanceCompanyOption } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, 'Financier name is required'),
});

type FormValues = z.infer<typeof formSchema>;

function FinancierFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: FinanceCompanyOption | null;
  onClose: () => void;
}) {
  const [createCompany, { isLoading: creating }] = useCreateFinanceCompanyMutation();
  const [updateCompany, { isLoading: updating }] = useUpdateFinanceCompanyMutation();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: editing?.name ?? '' });
  }, [open, editing, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await updateCompany({ id: editing.id, body: values }).unwrap();
        showToast('Financier updated', 'success');
      } else {
        await createCompany(values).unwrap();
        showToast('Financier added', 'success');
      }
      reset();
      onClose();
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not save financier', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit Financier' : 'Add Financier'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            fullWidth
            label="Financier name"
            margin="dense"
            autoFocus
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={creating || updating}>
            {editing ? 'Save Changes' : 'Add Financier'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function FinanciersPanel() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'ADMIN';
  const { data, isFetching, isError, refetch } = useFinanceCompaniesQuery();
  const [deleteCompany] = useDeleteFinanceCompanyMutation();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCompanyOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceCompanyOption | null>(null);

  const companies = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (company: FinanceCompanyOption) => {
    setEditing(company);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCompany(deleteTarget.id).unwrap();
      showToast(`${deleteTarget.name} deleted`, 'success');
    } catch (err) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      showToast(detail ?? 'Could not delete financier', 'error');
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
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>Financiers</span>
          {isAdmin && (
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={openCreate}>
              Add Financier
            </Button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={6} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading financiers
              </Button>
            </div>
          ) : companies.length === 0 ? (
            <EmptyState
              title="No financiers yet"
              hint={isAdmin ? 'Add the finance companies you work with.' : 'Contact an admin to configure financiers.'}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>
                  {['Name', ...(isAdmin ? ['Actions'] : [])].map((h) => (
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
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 600, color: '#16231B' }}>
                      {c.name}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <IconButton size="small" aria-label={`Edit ${c.name}`} onClick={() => openEdit(c)}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton size="small" aria-label={`Delete ${c.name}`} onClick={() => setDeleteTarget(c)}>
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

      <FinancierFormDialog open={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete financier?</DialogTitle>
        <DialogContent>
          This will remove {deleteTarget?.name}. Financiers used by applications cannot be deleted.
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
