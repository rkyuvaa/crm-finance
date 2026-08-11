import type { ApplicationStatus } from '@/types';

export interface StatusMeta {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  LEAD: { label: 'Lead', bg: '#F5F1E8', color: '#B45309', dot: '#B45309' },
  APPLICATION: { label: 'Application', bg: '#EAF1FD', color: '#2563EB', dot: '#2563EB' },
  VERIFICATION: { label: 'Verification', bg: '#EAF1FD', color: '#2563EB', dot: '#2563EB' },
  FINANCE: { label: 'Processing', bg: '#EAF1FD', color: '#2563EB', dot: '#2563EB' },
  QUERY: { label: 'Query', bg: '#FCE9DE', color: '#C2410C', dot: '#C2410C' },
  SANCTIONED: { label: 'Sanctioned', bg: '#E6F3EA', color: '#087A3D', dot: '#087A3D' },
  DELIVERY: { label: 'Delivery', bg: '#F0EAFE', color: '#7C3AED', dot: '#7C3AED' },
  DISBURSEMENT: { label: 'Disbursement', bg: '#FDEBEB', color: '#DC2626', dot: '#DC2626' },
  COMPLETED: { label: 'Completed', bg: '#E6F3EA', color: '#087A3D', dot: '#087A3D' },
  REJECTED: { label: 'Rejected', bg: '#FDEBEB', color: '#DC2626', dot: '#DC2626' },
};

export function statusMeta(status: ApplicationStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.APPLICATION;
}

const AGING_COLORS: Record<string, string> = {
  neutral: '#087A3D',
  medium: '#D97706',
  high: '#DC2626',
};

export function agingColor(tone: string): string {
  return AGING_COLORS[tone] ?? AGING_COLORS.neutral;
}

export function formatAmount(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initialsOf(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

export const ROLE_LABELS: Record<string, string> = {
  SALES_EXECUTIVE: 'Sales Executive',
  FINANCE_OFFICER: 'Finance Officer',
  DELIVERY_TEAM: 'Delivery Team',
  ADMIN: 'Admin',
};
