import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Avatar, Button, IconButton, InputAdornment, Menu, MenuItem, Paper, Select, TextField } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { useApplicationsQuery, useCreateApplicationMutation, useDeleteApplicationMutation } from '@/api/applicationsApi';
import { useDashboardQuery } from '@/api/dashboardApi';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingRows } from '@/components/ui/PageState';
import { useToast } from '@/components/ui/ToastHost';
import { agingColor, formatAmount, formatDate, initialsOf } from '@/utils/format';
import type { ApplicationItem, ApplicationStatus } from '@/types';

const PAGE_SIZE = 10;

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

export default function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { data: dashboard } = useDashboardQuery();
  const selectedStageKey = useAppSelector((state) => state.stageFilter.selectedStageKey);

  const tab = (searchParams.get('tab') ?? 'all') as 'all' | 'mine' | 'pending';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [financeId, setFinanceId] = useState('');
  const [menuFor, setMenuFor] = useState<ApplicationItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteApplication] = useDeleteApplicationMutation();
  const [createApplication] = useCreateApplicationMutation();

  const pipeline = dashboard?.pipeline ?? [];
  const stageKey = tab === 'all' && selectedStageKey ? selectedStageKey : undefined;

  const { data, isFetching, isError, refetch } = useApplicationsQuery({
    page,
    page_size: PAGE_SIZE,
    tab,
    q: q || undefined,
    status: status || undefined,
    finance_company_id: financeId ? Number(financeId) : undefined,
    stage_key: stageKey,
  });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabs = data?.tab_counts ?? { all: 0, mine: 0, pending: 0 };

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

  const setTab = (next: 'all' | 'mine' | 'pending') => {
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'all') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  const runSearch = () => {
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (q.trim()) nextParams.set('q', q.trim());
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const onFilterChange = (setter: (v: string) => void) => (e: SelectChangeEvent<string>) => {
    setter(e.target.value);
    setPage(1);
  };

  const quickCreate = async () => {
    try {
      const app = await createApplication({
        customer_name: 'New Lead',
        customer_phone: '9000000000',
        vehicle: 'Konwert EV Auto',
        amount: 400000,
        status: 'LEAD',
      }).unwrap();
      showToast(`Application ${app.app_no} created`, 'success');
    } catch {
      showToast('Could not create the application', 'error');
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 14,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>Applications</div>
          <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
            Search, filter and manage every application in the pipeline.
          </div>
        </div>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={quickCreate}>
          New Application
        </Button>
      </div>

      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E4EBE1', padding: '0 16px' }}>
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
              onClick={() => setTab(key)}
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
            gap: 8,
            flexWrap: 'wrap',
            padding: '13px 16px',
            borderBottom: '1px solid #E4EBE1',
          }}
        >
          <TextField
            size="small"
            placeholder="Search by App ID, customer, mobile, vehicle…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            sx={{ flex: 1, minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#7A8B80" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Select
            size="small"
            value={status}
            onChange={onFilterChange(setStatus)}
            displayEmpty
            startAdornment={<Filter size={14} color="#7A8B80" style={{ marginRight: 6 }} />}
            sx={{ fontSize: 12, minWidth: 130, borderRadius: 2 }}
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
            displayEmpty
            startAdornment={<Building2 size={14} color="#7A8B80" style={{ marginRight: 6 }} />}
            sx={{ fontSize: 12, minWidth: 140, borderRadius: 2 }}
          >
            <MenuItem value="">All finance</MenuItem>
            {(dashboard?.finance_companies ?? []).map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={8} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading applications
              </Button>
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState title="No applications found" hint="Adjust filters or create a new application." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr>
                  {['App ID', 'Customer', 'Vehicle', 'Amount', 'Finance', 'Status', 'Aging', 'Created', 'Actions'].map(
                    (h) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.items.map((app) => (
                  <tr key={app.id}>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <span className="app-id">{app.app_no}</span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar
                          sx={{ width: 30, height: 30, bgcolor: '#EAF6E8', color: '#04552B', fontSize: 11.5, fontWeight: 700 }}
                        >
                          {initialsOf(app.customer_name)}
                        </Avatar>
                        <div>
                          <div style={{ fontWeight: 600, color: '#16231B', fontSize: 13 }}>{app.customer_name}</div>
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
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C', fontSize: 12 }}>
                      {app.finance_company_name ?? '—'}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <StatusBadge status={app.status} />
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: agingColor(app.aging_tone) }}>
                        {app.aging_label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#7A8B80', fontSize: 12 }}>
                      {formatDate(app.created_at)}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
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
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtnStyle(page <= 1)} aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            {pagesToShow.map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} style={{ alignSelf: 'center', color: '#9BA99F' }}>
                  …
                </span>
              ) : (
                <button key={p} type="button" onClick={() => setPage(p)} style={pageBtnStyle(false, p === page)}>
                  {p}
                </button>
              ),
            )}
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} style={pageBtnStyle(page >= pageCount)} aria-label="Next page">
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
          onClick={async () => {
            if (!menuFor) return;
            try {
              await navigator.clipboard.writeText(menuFor.app_no);
            } catch {
              // ignore
            }
            showToast(`${menuFor.app_no} copied to clipboard`, 'success');
            setMenuAnchor(null);
            setMenuFor(null);
          }}
        >
          <Copy size={15} style={{ marginRight: 9 }} /> Copy App ID
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (!menuFor) return;
            try {
              await deleteApplication(menuFor.id).unwrap();
              showToast(`${menuFor.app_no} removed`, 'success');
            } catch {
              showToast('Could not remove the application', 'error');
            }
            setMenuAnchor(null);
            setMenuFor(null);
          }}
          sx={{ color: '#DC2626' }}
        >
          <Trash2 size={15} style={{ marginRight: 9 }} /> Remove
        </MenuItem>
      </Menu>
    </div>
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
