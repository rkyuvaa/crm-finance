import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Banknote, Clock, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useDashboardQuery } from '@/api/dashboardApi';
import { PanelHead } from '@/components/ui/PageState';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastHost';

const ACTIONS: Record<string, { label: string; icon: LucideIcon }> = {
  upload_now: { label: 'Upload now', icon: Upload },
  open_application: { label: 'Open application', icon: ArrowRight },
  enter_utr: { label: 'Enter UTR', icon: Banknote },
};

export default function NeedsAttention() {
  const { data, isError, refetch } = useDashboardQuery();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (isError) {
    return (
      <div className="panel">
        <PanelHead icon={<AlertTriangle size={15} color="#087A3D" />} title="Needs Attention" />
        <button onClick={refetch} style={retryStyle}>
          Retry
        </button>
      </div>
    );
  }

  const items = data?.needs_attention ?? [];
  const total = data?.needs_attention_total ?? 0;

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
          <AlertTriangle size={15} color="#087A3D" />
          Needs Attention
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: '#EAF6E8',
            color: '#04552B',
            borderRadius: 20,
            padding: '2px 8px',
          }}
        >
          {total}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing needs attention" />
      ) : (
        items.map((item) => {
          const action = ACTIONS[item.action] ?? ACTIONS.open_application;
          const ActionIcon = action.icon;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => showToast(`Opening ${item.app_no}…`, 'info')}
              onKeyDown={(e) => e.key === 'Enter' && showToast(`Opening ${item.app_no}…`, 'info')}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F0F4EE',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="app-id" style={{ fontSize: 11.5 }}>
                  {item.app_no}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: item.urgent ? '#DC2626' : '#D97706',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Clock size={12} />
                  {item.wait_label}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#16231B', marginTop: 3 }}>
                {item.customer_name}
              </div>
              <div style={{ fontSize: 12, color: '#7A8B80', marginTop: 1 }}>{item.issue}</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showToast(
                    item.action === 'enter_utr'
                      ? `UTR entry opened for ${item.app_no}`
                      : `Upload flow started for ${item.app_no}`,
                    'success',
                  );
                }}
                style={{
                  marginTop: 7,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#087A3D',
                  background: '#EAF6E8',
                  padding: '4px 9px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <ActionIcon size={13} />
                {action.label}
              </button>
            </div>
          );
        })
      )}

      <div style={{ borderTop: '1px solid #E4EBE1' }}>
        <button
          type="button"
          onClick={() => navigate('/applications?tab=pending')}
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

const retryStyle: React.CSSProperties = {
  margin: '10px 16px',
  padding: '5px 12px',
  border: '1px solid #E4EBE1',
  borderRadius: 8,
  background: '#fff',
  color: '#04552B',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
