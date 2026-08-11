import type { ReactNode } from 'react';
import { Paper } from '@mui/material';
import { motion } from 'framer-motion';

interface KpiCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number | string;
  sub: string;
  subTone?: 'up' | 'muted';
  onClick?: () => void;
}

export default function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  subTone = 'muted',
  onClick,
}: KpiCardProps) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Paper
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        sx={{
          p: '14px 15px',
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          boxShadow: '0 1px 2px rgba(2, 48, 32, 0.05)',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': {
            borderColor: '#CFE0CB',
            boxShadow: '0 2px 8px rgba(2, 48, 32, 0.07)',
          },
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: iconBg,
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#7A8B80',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 23,
              fontWeight: 800,
              color: '#16231B',
              lineHeight: 1.1,
              letterSpacing: '-0.4px',
              marginTop: 2,
            }}
          >
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: subTone === 'up' ? '#087A3D' : '#7A8B80',
              fontWeight: subTone === 'up' ? 600 : 400,
            }}
          >
            {sub}
          </div>
        </div>
      </Paper>
    </motion.div>
  );
}
