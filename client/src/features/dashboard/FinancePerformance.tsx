import { BarChart3 } from 'lucide-react';

import { useDashboardQuery } from '@/api/dashboardApi';
import EmptyState from '@/components/ui/EmptyState';

const BAR_COLORS = ['#087A3D', '#2563EB', '#D97706'];

export default function FinancePerformance() {
  const { data } = useDashboardQuery();
  const companies = data?.finance_companies ?? [];

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E4EBE1',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 16px',
          borderBottom: '1px solid #E4EBE1',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#7A8B80',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <BarChart3 size={15} color="#087A3D" />
          Finance Company Performance
        </span>
        <span style={{ fontSize: 11, color: '#7A8B80', fontWeight: 500 }}>This month</span>
      </div>

      {companies.length === 0 ? (
        <EmptyState title="No finance companies yet" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr>
                {['Company', 'Apps', 'Approved', 'Rejected', 'Avg. Time'].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#7A8B80',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      textAlign: 'left',
                      padding: '9px 16px',
                      background: '#F2FAF0',
                      borderBottom: '1px solid #E4EBE1',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ padding: '10px 16px', fontSize: 12.5, fontWeight: 600, color: '#16231B' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12.5 }}>{c.total_apps}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#087A3D', fontWeight: 600 }}>
                    {c.approved}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12.5, color: '#DC2626' }}>{c.rejected}</td>
                  <td style={{ padding: '10px 16px', minWidth: 120 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.avg_time_days}d</div>
                    <div style={{ height: 5, borderRadius: 3, background: '#E4EBE1', marginTop: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          background: BAR_COLORS[i % BAR_COLORS.length],
                          width: `${Math.min(100, c.bar_pct)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
