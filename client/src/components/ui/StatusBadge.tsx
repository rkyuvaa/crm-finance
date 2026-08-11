import { statusMeta } from '@/utils/format';
import type { ApplicationStatus } from '@/types';

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = statusMeta(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3.5px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: meta.bg,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: meta.dot, flexShrink: 0 }}
      />
      {meta.label}
    </span>
  );
}
