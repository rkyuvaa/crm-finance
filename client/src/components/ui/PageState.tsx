import type { ReactNode } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { RefreshCw } from 'lucide-react';

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ padding: '4px 16px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 0',
            borderBottom: '1px solid #F0F4EE',
          }}
        >
          <div className="skeleton-shimmer" style={{ width: 30, height: 30, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-shimmer" style={{ width: '45%', height: 13 }} />
            <div className="skeleton-shimmer" style={{ width: '30%', height: 10, marginTop: 5 }} />
          </div>
          <div className="skeleton-shimmer" style={{ width: 80, height: 20, borderRadius: 20 }} />
        </div>
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="error" sx={{ display: 'inline-flex', mb: 2 }}>
        Could not load this section. Check your connection and try again.
      </Alert>
      <div>
        <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </Box>
  );
}

export function PanelHead({
  icon,
  title,
  right,
}: {
  icon?: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
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
        {icon}
        {title}
      </span>
      {right}
    </div>
  );
}
