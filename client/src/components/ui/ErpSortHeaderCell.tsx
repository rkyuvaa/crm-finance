import React, { useState } from 'react';
import { TableCell, TableCellProps } from '@mui/material';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { SortState } from '@/hooks/useTableSort';

export interface ErpSortHeaderCellProps {
  field?: string;
  label: React.ReactNode;
  sortState?: SortState<any>;
  onSort?: (field: string) => void;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  variant?: 'native' | 'mui';
  style?: React.CSSProperties;
  sx?: TableCellProps['sx'];
  className?: string;
}

export const ErpSortHeaderCell: React.FC<ErpSortHeaderCellProps> = ({
  field,
  label,
  sortState,
  onSort,
  sortable = true,
  align = 'left',
  variant = 'native',
  style,
  sx,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isActive = Boolean(sortable && field && sortState?.key === field && sortState?.direction);
  const direction = isActive ? sortState?.direction : null;

  const handleClick = () => {
    if (sortable && field && onSort) {
      onSort(field);
    }
  };

  const getTooltip = () => {
    if (!sortable || !field) return undefined;
    if (direction === 'asc') return 'Click to sort descending (↓)';
    if (direction === 'desc') return 'Click to clear sorting';
    return 'Click to sort ascending (↑)';
  };

  const renderIcon = () => {
    if (!sortable || !field) return null;

    if (direction === 'asc') {
      return <ArrowUp size={14} style={{ color: '#087A3D', strokeWidth: 2.5, flexShrink: 0 }} />;
    }
    if (direction === 'desc') {
      return <ArrowDown size={14} style={{ color: '#087A3D', strokeWidth: 2.5, flexShrink: 0 }} />;
    }

    // Inactive / default state: show ChevronsUpDown icon (↕) softly on hover or neutral
    return (
      <ChevronsUpDown
        size={14}
        style={{
          color: isHovered ? '#087A3D' : '#94A3B8',
          opacity: isHovered ? 0.9 : 0.45,
          transition: 'opacity 0.15s ease, color 0.15s ease',
          flexShrink: 0,
        }}
      />
    );
  };

  const content = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        width: '100%',
        userSelect: sortable ? 'none' : 'auto',
      }}
    >
      <span>{label}</span>
      {renderIcon()}
    </div>
  );

  if (variant === 'mui') {
    return (
      <TableCell
        align={align}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={getTooltip()}
        sx={{
          fontWeight: 700,
          color: isActive ? '#087A3D' : '#44584C',
          cursor: sortable && field ? 'pointer' : 'default',
          transition: 'background 0.15s ease, color 0.15s ease',
          '&:hover': sortable && field ? { bgcolor: 'rgba(8, 122, 61, 0.04)' } : {},
          ...sx,
        }}
      >
        {content}
      </TableCell>
    );
  }

  // Native <th> rendering
  return (
    <th
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={getTooltip()}
      className={className}
      style={{
        background: isActive ? 'var(--primary-light, rgba(8, 122, 61, 0.08))' : 'var(--primary-lighter, #F8FAF8)',
        fontSize: 10,
        fontWeight: 700,
        color: isActive ? '#087A3D' : 'var(--text-muted, #64748B)',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        textAlign: align,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border, #E2E8F0)',
        whiteSpace: 'nowrap',
        cursor: sortable && field ? 'pointer' : 'default',
        transition: 'background 0.15s ease, color 0.15s ease',
        ...style,
      }}
    >
      {content}
    </th>
  );
};

export default ErpSortHeaderCell;
