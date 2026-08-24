import { Tooltip } from '@mui/material';
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  FileText,
  ShieldCheck,
  Truck,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { PipelineStage } from '@/types';

const ICONS: Record<string, LucideIcon> = {
  leads: UserPlus,
  lead: UserPlus,
  applications: FileText,
  application: FileText,
  verification: ShieldCheck,
  finance: Building2,
  query: AlertCircle,
  sanctioned: CircleCheck,
  delivery: Truck,
  disburse: Banknote,
  disbursement: Banknote,
  completed: CheckCircle2,
};

// Vibrant default stage color themes
const DEFAULT_STAGE_PALETTE: Record<string, { color: string; bg: string; border: string }> = {
  leads: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  applications: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  verification: { color: '#0891B2', bg: '#CFFAFE', border: '#A5F3FC' },
  finance: { color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
  query: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  sanctioned: { color: '#E11D48', bg: '#FFE4E6', border: '#FECDD3' },
  delivery: { color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  disburse: { color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
  completed: { color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' },
};

const PALETTE_INDEX = [
  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { color: '#0891B2', bg: '#CFFAFE', border: '#A5F3FC' },
  { color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
  { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  { color: '#E11D48', bg: '#FFE4E6', border: '#FECDD3' },
  { color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD' },
  { color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' },
];

function getStageTheme(stageKey: string, customColor?: string | null, index: number = 0) {
  if (customColor && customColor.startsWith('#')) {
    return {
      color: customColor,
      bg: `${customColor}14`,
      border: `${customColor}44`,
    };
  }
  const keyLower = stageKey.toLowerCase();
  for (const [k, v] of Object.entries(DEFAULT_STAGE_PALETTE)) {
    if (keyLower.includes(k)) return v;
  }
  return PALETTE_INDEX[index % PALETTE_INDEX.length];
}

export default function Pipeline({
  stages,
  selectedStageKey,
  onStageClick,
}: {
  stages: PipelineStage[];
  selectedStageKey?: string;
  onStageClick?: (stage: PipelineStage) => void;
}) {
  return (
    <div className="scroll-touch" style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', padding: '12px 14px', minWidth: 820 }}>
        {stages.map((stage, i) => {
          const Icon = ICONS[stage.key.toLowerCase()] ?? FileText;
          const theme = getStageTheme(stage.key, stage.color, i);
          const isSelected = selectedStageKey === stage.key;

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={stage.tip} placement="top" arrow>
                <button
                  type="button"
                  onClick={() => onStageClick?.(stage)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 104,
                    border: '1.5px solid',
                    borderColor: isSelected ? theme.color : theme.border,
                    borderRadius: 12,
                    padding: '12px 8px 10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? `${theme.color}22` : theme.bg,
                    boxShadow: isSelected ? `0 4px 14px ${theme.color}33` : 'none',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = theme.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${theme.color}26`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: `${theme.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={17} color={theme.color} />
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: theme.color,
                      letterSpacing: '-0.3px',
                      lineHeight: 1,
                    }}
                  >
                    {stage.count}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: theme.color,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      background: `${theme.color}15`,
                      padding: '2px 6px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {stage.label}
                  </div>
                </button>
              </Tooltip>

              {i < stages.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9BA99F',
                    width: 22,
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
