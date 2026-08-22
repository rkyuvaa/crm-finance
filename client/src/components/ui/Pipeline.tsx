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
  applications: FileText,
  verification: ShieldCheck,
  finance: Building2,
  query: AlertCircle,
  sanctioned: CircleCheck,
  delivery: Truck,
  disburse: Banknote,
  completed: CheckCircle2,
};

const STAGE_COLORS: Record<string, string> = {
  leads: '#7A8B80',
  applications: '#087A3D',
  verification: '#2563EB',
  finance: '#2563EB',
  query: '#C2410C',
  sanctioned: '#7C3AED',
  delivery: '#7C3AED',
  disburse: '#DC2626',
  completed: '#087A3D',
};

const STAGE_BG: Record<string, string> = {
  query: '#FFF8EE',
  disburse: '#FFF5F5',
  completed: '#E6F3EA',
};

export default function Pipeline({
  stages,
  onStageClick,
}: {
  stages: PipelineStage[];
  onStageClick?: (stage: PipelineStage) => void;
}) {
  return (
    <div className="scroll-touch" style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', padding: '12px 14px', minWidth: 780 }}>
        {stages.map((stage, i) => {
          const Icon = ICONS[stage.key] ?? FileText;
          const color = STAGE_COLORS[stage.key] ?? '#087A3D';
          const bg = STAGE_BG[stage.key];
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
                    gap: 4,
                    minWidth: 92,
                    border: '1px solid',
                    borderColor: bg ? undefined : '#E4EBE1',
                    borderRadius: 10,
                    padding: '12px 6px 10px',
                    cursor: 'pointer',
                    backgroundColor: bg ?? '#F7F9F5',
                    transition: 'border-color 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#087A3D';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(2, 48, 32, 0.07)';
                  }}
                  onMouseLeave={(e) => {
                    const defaultBorder = bg ? '#E4EBE1' : '#E4EBE1';
                    e.currentTarget.style.borderColor = defaultBorder;
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Icon size={19} color={color} />
                  <div style={{ fontSize: 19, fontWeight: 800, color: '#16231B', letterSpacing: '-0.3px' }}>
                    {stage.count}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#7A8B80',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
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
                  <ChevronRight size={15} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
