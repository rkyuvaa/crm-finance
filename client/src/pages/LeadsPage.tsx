import { useState } from 'react';
import { Avatar, Button, Paper } from '@mui/material';
import { Plus } from 'lucide-react';

import { useApplicationsQuery } from '@/api/applicationsApi';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import NewApplicationDialog from '@/components/ui/NewApplicationDialog';
import { LoadingRows } from '@/components/ui/PageState';
import { formatAmount, formatDate, initialsOf } from '@/utils/format';

export default function LeadsPage() {
  const { data, isFetching, isError, refetch } = useApplicationsQuery({
    page: 1,
    page_size: 10,
    status: 'LEAD',
  });
  const [createOpen, setCreateOpen] = useState(false);

  const rows = data?.items ?? [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>Leads</div>
          <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
            New leads captured from the dealership funnel.
          </div>
        </div>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          New Lead
        </Button>
      </div>

      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr>
                  {['App ID', 'Customer', 'Vehicle', 'Amount', 'Status', 'Aging', 'Created'].map((h) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Paper>

      <NewApplicationDialog title="New Lead" open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
