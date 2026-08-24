import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Chip, IconButton, Menu, MenuItem, Paper, TablePagination } from '@mui/material';
import { Plus, Trash2, Edit, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';

import { useApplicationsQuery, useDeleteApplicationMutation } from '@/api/applicationsApi';
import { useDashboardQuery } from '@/api/dashboardApi';
import { useStagesQuery, useTabsQuery } from '@/api/mastersApi';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import NewApplicationDialog from '@/components/ui/NewApplicationDialog';
import Pipeline from '@/components/ui/Pipeline';
import { LoadingRows } from '@/components/ui/PageState';
import { formatAmount, formatDate, initialsOf } from '@/utils/format';
import { useToast } from '@/components/ui/ToastHost';
import type { ApplicationItem } from '@/types';

export default function LeadsPage() {
  const navigate = useNavigate();
  const { data: crmTabs } = useTabsQuery();
  const [activeTabCode, setActiveTabCode] = useState<string>('all_leads');
  const [selectedStageKey, setSelectedStageKey] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Set default tab on load if configured
  useEffect(() => {
    if (crmTabs && crmTabs.length > 0 && !activeTabCode) {
      const def = crmTabs.find((t) => t.is_default && t.is_active) ?? crmTabs[0];
      if (def) setActiveTabCode(def.code);
    }
  }, [crmTabs, activeTabCode]);

  const activeTabConfig = crmTabs?.find((t) => t.code === activeTabCode);

  const queryParams = {
    page: page + 1,
    page_size: rowsPerPage,
    ...(selectedStageKey ? { stage_key: selectedStageKey } : {}),
  };

  const { data, isFetching, isError, refetch } = useApplicationsQuery(queryParams);
  const { data: dashboard } = useDashboardQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<ApplicationItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteApplication] = useDeleteApplicationMutation();
  const { showToast } = useToast();

  const { data: masterStages } = useStagesQuery();

  // Filter rows based on active dynamic tab configuration
  const allRows = data?.items ?? [];
  const rows = allRows.filter((app) => {
    if (!activeTabConfig || activeTabConfig.code === 'all_leads') return true;
    if (activeTabConfig.stage_ids && activeTabConfig.stage_ids.length > 0 && masterStages) {
      const mappedStatuses = masterStages
        .filter((s) => activeTabConfig.stage_ids.includes(s.id))
        .map((s) => s.status)
        .filter(Boolean);
      if (mappedStatuses.length > 0) {
        return mappedStatuses.includes(app.status);
      }
    }
    return true;
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <div>
      {/* 1. Full-width Stage Pills row */}
      <div style={{ marginBottom: 12 }}>
        <Pipeline
          stages={dashboard?.pipeline ?? []}
          selectedStageKey={selectedStageKey}
          onStageClick={(stage) => {
            setSelectedStageKey((prev) => (prev === stage.key ? undefined : stage.key));
          }}
        />
      </div>

      {/* 2. Action row below stage pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedStageKey && (
            <Chip
              label={`Filtered by: ${dashboard?.pipeline?.find((s) => s.key === selectedStageKey)?.label ?? selectedStageKey}`}
              size="small"
              onDelete={() => setSelectedStageKey(undefined)}
              color="primary"
              variant="outlined"
              sx={{ fontSize: 11, fontWeight: 600, borderRadius: '6px' }}
            />
          )}
        </div>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setCreateOpen(true)}
          sx={{ height: 38, borderRadius: '10px', px: 2.5 }}
        >
          New Lead
        </Button>
      </div>

      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #E4EBE1' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16231B' }}>All Records</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton
              size="small"
              aria-label="Previous page"
              onClick={() => handleChangePage(null, Math.max(0, page - 1))}
              disabled={page === 0}
              sx={{ color: page === 0 ? '#B0B8B0' : '#023020' }}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <span style={{ fontSize: 12, color: '#7A8B80', minWidth: 60, textAlign: 'center' }}>
              Page {page + 1} of {Math.ceil((data?.total ?? 0) / rowsPerPage) || 1}
            </span>
            <IconButton
              size="small"
              aria-label="Next page"
              onClick={() => handleChangePage(null, Math.min(Math.ceil((data?.total ?? 0) / rowsPerPage) - 1, page + 1))}
              disabled={page >= Math.ceil((data?.total ?? 0) / rowsPerPage) - 1}
              sx={{ color: page >= Math.ceil((data?.total ?? 0) / rowsPerPage) - 1 ? '#B0B8B0' : '#023020' }}
            >
              <ChevronRight size={18} />
            </IconButton>
          </div>
        </div>
        <div className="scroll-touch" style={{ overflowX: 'auto' }}>
          {isFetching && !data ? (
            <LoadingRows rows={8} />
          ) : isError ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Button variant="outlined" onClick={refetch}>
                Retry loading leads
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title="No leads yet" hint="Leads will appear here as they are captured." />
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead>
                  <tr>
                    {['App ID', 'Customer', 'Vehicle', 'Amount', 'Status', 'Aging', 'Created', 'Actions'].map((h) => (
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
                  {rows.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/leads/${app.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
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
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C' }}>{app.vehicle}</td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', fontWeight: 700 }}>
                        {formatAmount(app.amount)}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE' }}>
                        <StatusBadge status={app.status} />
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#44584C', fontSize: 12 }}>
                        {app.aging_label}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', color: '#7A8B80', fontSize: 12 }}>
                        {formatDate(app.created_at)}
                      </td>
                      <td style={{ padding: '11px 16px', borderBottom: '1px solid #F0F4EE', textAlign: 'right' }}>
                        <IconButton
                          size="small"
                          aria-label={`More actions for ${app.app_no}`}
                          onClick={(e) => {
                            e.stopPropagation();
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
              <TablePagination
                rowsPerPageOptions={[10, 20, 50]}
                component="div"
                count={data?.total ?? 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
                labelRowsPerPage="Rows per page:"
                SelectProps={{ size: 'small' }}
              />
            </>
          )}
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
          onClick={async () => {
            if (!menuFor) return;
            try {
              await deleteApplication(menuFor.id).unwrap();
              showToast(`Lead ${menuFor.app_no} deleted`, 'success');
            } catch {
              showToast('Could not delete the lead', 'error');
            }
            setMenuAnchor(null);
            setMenuFor(null);
          }}
          sx={{ color: '#DC2626' }}
        >
          <Trash2 size={15} style={{ marginRight: 9 }} /> Delete
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) {
              navigate(`/leads/${menuFor.id}`);
            }
            setMenuAnchor(null);
            setMenuFor(null);
          }}
          sx={{ color: '#1976D2' }}
        >
          <Edit size={15} style={{ marginRight: 9 }} /> Edit
        </MenuItem>
      </Menu>

      <NewApplicationDialog title="New Lead" open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
