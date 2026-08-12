import { statusMeta } from '@/utils/format';
import type { ApplicationStatus } from '@/types';

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = statusMeta(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '4.5px 11px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        background: `linear-gradient(135deg, ${meta.bg}, ${meta.bg} 55%, #FFFFFF 220%)`,
        color: meta.color,
        border: `1px solid ${meta.dot}40`,
        boxShadow: '0 1px 2px rgba(2, 48, 32, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${meta.dot}, ${meta.dot})`,
          boxShadow: `0 0 0 2.5px ${meta.bg}, 0 0 6px ${meta.dot}80`,
          flexShrink: 0,
        }}
      />
      {meta.label}
    </span>
  );
}
