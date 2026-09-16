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

export function initialsOf(name?: string | null): string {
  return ((name || '').trim().charAt(0) || '?').toUpperCase();
}

export const ROLE_LABELS: Record<string, string> = {
  SALES_EXECUTIVE: 'Sales Executive',
  FINANCE_OFFICER: 'Finance Officer',
  DELIVERY_TEAM: 'Delivery Team',
  ADMIN: 'Admin',
};

export function time24To12(time24?: string | null): string {
  if (!time24) return '';
  if (time24.includes('AM') || time24.includes('PM')) return time24;
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? '0' + hours : '' + hours;
  return `${strHours}:${minutes} ${ampm}`;
}

export function time12To24(time12?: string | null): string {
  if (!time12) return '';
  if (!time12.includes('AM') && !time12.includes('PM')) return time12;
  const parts = time12.trim().split(' ');
  if (parts.length < 2) return time12;
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);
  if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
  if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
  const strH = h < 10 ? '0' + h : '' + h;
  return `${strH}:${minutes}`;
}

export function formatDateTime12h(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return '—';
  if (!timeStr) return dateStr;
  const formattedTime = time24To12(timeStr);
  return `${dateStr} ${formattedTime}`;
}

