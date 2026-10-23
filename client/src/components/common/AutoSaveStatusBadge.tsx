import React from 'react';
import { Box, Typography, Button, CircularProgress, Tooltip, useTheme } from '@mui/material';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveStatusBadgeProps {
  status: AutoSaveStatus;
  lastSaved?: Date | string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  showIdleMessage?: boolean;
  size?: 'small' | 'medium';
  sx?: object;
}

export default function AutoSaveStatusBadge({
  status,
  lastSaved,
  errorMessage,
  onRetry,
  showIdleMessage = true,
  size = 'small',
  sx = {},
}: AutoSaveStatusBadgeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isSmall = size === 'small';
  const fontSize = isSmall ? '0.75rem' : '0.85rem';
  const iconSize = isSmall ? 13 : 15;

  if (status === 'saving') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          color: isDark ? '#93C5FD' : '#2563EB',
          bgcolor: isDark ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.08)',
          px: 1,
          py: 0.35,
          borderRadius: '9999px',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          ...sx,
        }}
      >
        <CircularProgress size={iconSize - 2} thickness={5} color="inherit" />
        <Typography
          variant="caption"
          sx={{
            fontSize,
            fontWeight: 600,
            lineHeight: 1,
            color: 'inherit',
          }}
        >
          Saving...
        </Typography>
      </Box>
    );
  }

  if (status === 'error') {
    const tooltipText = errorMessage || 'Failed to automatically save changes. Click retry to persist your data.';

    return (
      <Tooltip title={tooltipText} arrow placement="top">
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            color: '#DC2626',
            bgcolor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2',
            border: isDark ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid #FECACA',
            px: 1,
            py: 0.35,
            borderRadius: '9999px',
            transition: 'all 0.2s ease',
            ...sx,
          }}
        >
          <AlertCircle size={iconSize} />
          <Typography
            variant="caption"
            sx={{
              fontSize,
              fontWeight: 700,
              lineHeight: 1,
              color: 'inherit',
            }}
          >
            Save failed
          </Typography>
          {onRetry && (
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              startIcon={<RefreshCw size={11} />}
              sx={{
                p: 0,
                minWidth: 'auto',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#DC2626',
                textTransform: 'none',
                textDecoration: 'underline',
                ml: 0.25,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              Retry
            </Button>
          )}
        </Box>
      </Tooltip>
    );
  }

  // Saved or Idle
  const savedColor = isDark ? '#5FCF87' : '#16A34A';
  const savedBg = isDark ? 'rgba(95, 207, 135, 0.12)' : 'rgba(22, 163, 74, 0.08)';

  if (!showIdleMessage && status === 'idle') {
    return null;
  }

  const tooltipTitle = lastSaved
    ? `Last automatically saved at ${typeof lastSaved === 'string' ? lastSaved : lastSaved.toLocaleTimeString()}`
    : 'All changes are automatically saved to backend database on blur.';

  return (
    <Tooltip title={tooltipTitle} arrow placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: savedColor,
          bgcolor: savedBg,
          px: 1,
          py: 0.35,
          borderRadius: '9999px',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          ...sx,
        }}
      >
        <Check size={iconSize} strokeWidth={2.5} />
        <Typography
          variant="caption"
          sx={{
            fontSize,
            fontWeight: 600,
            lineHeight: 1,
            color: 'inherit',
          }}
        >
          {status === 'saved' ? 'Saved' : 'All changes saved'}
        </Typography>
      </Box>
    </Tooltip>
  );
}
