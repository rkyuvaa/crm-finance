import { ArrowRight, Clock } from 'lucide-react';

import { useDashboardQuery } from '@/api/dashboardApi';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastHost';

export default function WaitingOn() {
  const { data } = useDashboardQuery();
  const { showToast } = useToast();

  const items = data?.waiting_on ?? [];
  const total = data?.waiting_on_total ?? 0;

  return (
    <div
      style={{
        background: '#FFFDF6',
        border: '1px solid #EDE4C6',
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
          borderBottom: '1px solid #F3ECCF',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#8A6D1A',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock size={15} />
          Currently Waiting On
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing waiting" />
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              borderBottom: '1px solid #F3ECCF',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: 11.5, fontWeight: 700, color: '#087A3D' }}>
                {item.app_no}
              </div>
              <div style={{ fontSize: 12, color: '#44584C', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.who}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: item.hot ? '#DC2626' : '#D97706',
                whiteSpace: 'nowrap',
              }}
            >
              {item.wait_label}
            </span>
          </div>
        ))
      )}

      <div style={{ borderTop: '1px solid #F3ECCF' }}>
        <button
          type="button"
          onClick={() => showToast(`Showing all ${total} waiting items`, 'info')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: '#087A3D',
            background: 'none',
            border: 'none',
            padding: '10px 16px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          View All ({total}) <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
