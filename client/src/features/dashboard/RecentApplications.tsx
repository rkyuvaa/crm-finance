import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  TextField,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useApplicationsQuery,
  useCreateApplicationMutation,
  useDeleteApplicationMutation,
} from '@/api/applicationsApi';
import { useDashboardQuery } from '@/api/dashboardApi';
import StatusBadge from '@/components/ui/StatusBadge';
import { LoadingRows } from '@/components/ui/PageState';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastHost';
import { agingColor, formatAmount, initialsOf } from '@/utils/format';
import type { ApplicationItem, ApplicationStatus } from '@/types';

const PAGE_SIZE = 6;

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'APPLICATION', label: 'Application' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'FINANCE', label: 'Processing' },
  { value: 'QUERY', label: 'Query' },
  { value: 'SANCTIONED', label: 'Sanctioned' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'DISBURSEMENT', label: 'Disbursement' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const DATE_OPTIONS = [
  { value: '', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

const createSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_phone: z.string().min(8, 'Valid phone number required').max(20),
  vehicle: z.string().min(2, 'Vehicle is required'),
  amount: z.coerce.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be positive'),
});

type CreateForm = z.infer<typeof createSchema>;

function NewApplicationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <DialogTitle sx={{ fontWeight: 700 }}>New Application</DialogTitle>
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
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              },
            }}
            {...register('amount')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            Create Application
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function RecentApplications() {
  const { showToast } = useToast();
  const { data: dashboard } = useDashboardQuery();
  const [tab, setTab] = useState<'all' | 'mine' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [financeId, setFinanceId] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<ApplicationItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [removeTarget, setRemoveTarget] = useState<ApplicationItem | null>(null);
  const [deleteApplication] = useDeleteApplicationMutation();

  const dateFrom = useMemo(() => {
    if (!dateRange) return undefined;
    const d = new Date();
    d.setDate(d.getDate() - Number(dateRange));
    return d.toISOString();
  }, [dateRange]);

  const { data, isFetching, isError, refetch } = useApplicationsQuery({
    page,
    page_size: PAGE_SIZE,
    scope: 'recent',
    tab,
    status: status || undefined,
    finance_company_id: financeId ? Number(financeId) : undefined,
    date_from: dateFrom,
  });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabs = data?.tab_counts ?? { all: 0, mine: 0, pending: 0 };

  const resetPage = () => setPage(1);

  const onTabChange = (next: 'all' | 'mine' | 'pending') => {
    setTab(next);
    resetPage();
  };

  const onFilterChange = (setter: (v: string) => void) => (e: SelectChangeEvent<string>) => {
    setter(e.target.value);
    resetPage();
  };

  const pagesToShow = useMemo(() => {
    const pages: (number | '…')[] = [];
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…');
      }
    }
    return pages;
  }, [pageCount, page]);

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // clipboard unavailable
    }
    showToast(`${id} copied to clipboard`, 'success');
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setMenuAnchor(null);
    try {
      await deleteApplication(removeTarget.id).unwrap();
      showToast(`${removeTarget.app_no} draft removed`, 'success');
    } catch {
      showToast('Could not remove the application', 'error');
    }
    setRemoveTarget(null);
  };

  return (
    <>
      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid #E4EBE1', padding: '0 16px' }}>
          {(
            [
              ['all', `All Applications (${tabs.all})`],
              ['mine', `My Applications (${tabs.mine})`],
              ['pending', `Pending Action (${tabs.pending})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              aria-selected={tab === key}
              role="tab"
              style={{
                position: 'relative',
                border: 'none',
                background: 'transparent',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: tab === key ? '#087A3D' : '#7A8B80',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {label}
              {tab === key && (
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    right: 14,
                    bottom: -1,
                    height: 2,
                    borderRadius: '2px 2px 0 0',
                    background: '#087A3D',
                  }}
                />
              )}
            </button>
          ))}
        </div>

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
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>Recent Applications</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Select
              size="small"
              value={status}
              onChange={onFilterChange(setStatus)}
              sx={{ fontSize: 12, minWidth: 130, borderRadius: 2 }}
              startAdornment={<Filter size={14} color="#7A8B80" style={{ marginRight: 6 }} />}
              displayEmpty
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={financeId}
              onChange={onFilterChange(setFinanceId)}
              sx={{ fontSize: 12, minWidth: 140, borderRadius: 2 }}
              startAdornment={<Building2 size={14} color="#7A8B80" style={{ marginRight: 6 }} />}
              displayEmpty
            >
              <MenuItem value="">All finance</MenuItem>
              {(dashboard?.finance_companies ?? []).map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={dateRange}
              onChange={onFilterChange(setDateRange)}
              sx={{ fontSize: 12, minWidth: 120, borderRadius: 2 }}
              startAdornment={<Calendar size={14} color="#7A8B80" style={{ marginRight: 6 }} />}
              displayEmpty
            >
              {DATE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              New Application
            </Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={PAGE_SIZE} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading applications
              </Button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No applications found"
              hint="Try adjusting the filters or create a new application."
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr>
                  {['App ID', 'Customer', 'Vehicle', 'Amount', 'Status', 'Aging', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        position: 'sticky',
                        top: 0,
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
                {data.items.map((app) => (
                  <tr key={app.id} style={{ transition: 'background 0.1s ease' }}>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <span className="app-id">{app.app_no}</span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            bgcolor: '#EAF6E8',
                            color: '#04552B',
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}
                        >
                          {initialsOf(app.customer_name)}
                        </Avatar>
                        <div>
                          <div style={{ fontWeight: 600, color: '#16231B', fontSize: 13 }}>
                            {app.customer_name}
                          </div>
                          <div style={{ fontSize: 11, color: '#7A8B80' }}>{app.customer_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C' }}>
                      {app.vehicle}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 700 }}>
                      {formatAmount(app.amount)}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <StatusBadge status={app.status} />
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: agingColor(app.aging_tone) }}>
                        {app.aging_label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => showToast(`Opening ${app.app_no}…`, 'info')}
                        >
                          View
                        </Button>
                        <IconButton
                          size="small"
                          aria-label={`More actions for ${app.app_no}`}
                          onClick={(e) => {
                            setMenuFor(app);
                            setMenuAnchor(e.currentTarget);
                          }}
                        >
                          <MoreVertical size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '11px 16px',
            borderTop: '1px solid #E4EBE1',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: '#7A8B80' }}>
            Showing <strong>{total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> to{' '}
            <strong>{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong> entries
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              style={pageBtnStyle(page <= 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {pagesToShow.map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} style={{ alignSelf: 'center', color: '#9BA99F' }}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  style={pageBtnStyle(false, p === page)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              style={pageBtnStyle(page >= pageCount)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Paper>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuFor(null);
        }}
      >
        <MenuItem
          onClick={() => {
            showToast(`Opening ${menuFor?.app_no}…`, 'info');
            setMenuAnchor(null);
            setMenuFor(null);
          }}
        >
          <Eye size={15} style={{ marginRight: 9 }} /> View details
        </MenuItem>
        <MenuItem
          onClick={() => {
            showToast(`Opened ${menuFor?.app_no} in new tab`, 'success');
            setMenuAnchor(null);
            setMenuFor(null);
          }}
        >
          <ExternalLink size={15} style={{ marginRight: 9 }} /> Open application
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) handleCopy(menuFor.app_no);
            setMenuAnchor(null);
            setMenuFor(null);
          }}
        >
          <Copy size={15} style={{ marginRight: 9 }} /> Copy App ID
        </MenuItem>
        <MenuItem
          onClick={() => {
            setRemoveTarget(menuFor);
            setMenuAnchor(null);
          }}
          sx={{ color: '#DC2626' }}
        >
          <Trash2 size={15} style={{ marginRight: 9 }} /> Remove draft
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Remove draft?</DialogTitle>
        <DialogContent>
          This will remove the draft for {removeTarget?.app_no}. This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmRemove}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <NewApplicationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function pageBtnStyle(disabled: boolean, active = false): React.CSSProperties {
  return {
    minWidth: 32,
    height: 32,
    padding: '0 9px',
    border: '1px solid #E4EBE1',
    background: active ? '#087A3D' : '#fff',
    color: active ? '#fff' : '#44584C',
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontFamily: 'inherit',
  };
}
