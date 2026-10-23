import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Tooltip, useTheme } from '@mui/material';
import { TaskItem, useUpdateTaskMutation, useGetCalendarConfigQuery } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

export interface ParsedDuration {
  days: number;
  hours: number;
  isValid: boolean;
  error?: string;
}

/**
 * Parses user input for Duration into Days and Hours.
 * Supports:
 * - "D - H", "D-H", "D:H", "D/H" (e.g. "2 - 4", "0 - 5", " - 4", "3 - ")
 * - Natural text (e.g. "2d 4h", "2d", "4h")
 * - Single integer (Days only, e.g. "3")
 * Validates that hours < dailyWorkingHours.
 */
export function parseDurationInput(raw: string, dailyWorkingHours: number): ParsedDuration {
  const str = raw.trim();
  if (!str) {
    return { days: 0, hours: 0, isValid: true };
  }

  // 1. Dash / colon / slash separated: "2 - 4", "2-4", "0 - 5", "3 - ", " - 4"
  const dashMatch = str.match(/^(\d+)?\s*[-:/]\s*(\d+)?$/);
  if (dashMatch) {
    const days = dashMatch[1] !== undefined ? parseInt(dashMatch[1], 10) : 0;
    const hours = dashMatch[2] !== undefined ? parseInt(dashMatch[2], 10) : 0;

    if (hours >= dailyWorkingHours) {
      return {
        days,
        hours,
        isValid: false,
        error: `Hours (${hours}h) must be smaller than daily working hours (${dailyWorkingHours}h). Please convert into days.`,
      };
    }
    return { days, hours, isValid: true };
  }

  // 2. Natural units: "2d 4h", "2d", "4h"
  const dMatch = str.match(/(\d+)\s*d/i);
  const hMatch = str.match(/(\d+)\s*h/i);
  if (dMatch || hMatch) {
    const days = dMatch ? parseInt(dMatch[1], 10) : 0;
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;

    if (hours >= dailyWorkingHours) {
      return {
        days,
        hours,
        isValid: false,
        error: `Hours (${hours}h) must be smaller than daily working hours (${dailyWorkingHours}h). Please convert into days.`,
      };
    }
    return { days, hours, isValid: true };
  }

  // 3. Single integer (Days only)
  if (/^\d+$/.test(str)) {
    const days = parseInt(str, 10);
    return { days, hours: 0, isValid: true };
  }

  return {
    days: 0,
    hours: 0,
    isValid: false,
    error: "Invalid duration format. Use 'D - H' (Days - Hours, e.g. 2 - 4 or 3).",
  };
}

export function getFormattedDuration(task: TaskItem): string {
  const days = task.duration_working_days ?? 0;
  const hours = task.duration_working_hours ?? 0;
  return `${days}d ${hours}h`;
}

interface DurationInlineCellProps {
  task: TaskItem;
  onUpdate?: (taskId: number, days: number, hours: number) => Promise<void>;
  disabled?: boolean;
}

export default function DurationInlineCell({ task, onUpdate, disabled = false }: DurationInlineCellProps) {
  const toast = useToast();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { data: calendarConfig } = useGetCalendarConfigQuery();
  const [updateTask] = useUpdateTaskMutation();

  const dailyWorkingHours = calendarConfig?.daily_working_hours || 8;

  const tTokens = {
    inputBgHover: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    inputBgFocus: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
    inputBorderFocus: isDark ? '#5FCF87' : '#203020',
  };

  const initialDays = task.duration_working_days !== undefined && task.duration_working_days !== null
    ? task.duration_working_days
    : 0;
  const initialHours = task.duration_working_hours !== undefined && task.duration_working_hours !== null
    ? task.duration_working_hours
    : 0;

  const [daysStr, setDaysStr] = useState<string>(String(initialDays));
  const [hoursStr, setHoursStr] = useState<string>(String(initialHours));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDaysStr(String(task.duration_working_days ?? 0));
      setHoursStr(String(task.duration_working_hours ?? 0));
    }
  }, [task.duration_working_days, task.duration_working_hours, isEditing]);

  const isParent = Boolean(task.is_parent || (task.subtask_count && task.subtask_count > 0));
  const isReadOnly = isParent || disabled;

  // Read-only parent rollup task
  if (isReadOnly) {
    const pDays = task.duration_working_days ?? 0;
    const pHours = task.duration_working_hours ?? 0;

    return (
      <Tooltip
        title={`Summary Task: ${pDays} Days, ${pHours} Hours calculated from child tasks`}
        arrow
        placement="top"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, whiteSpace: 'nowrap' }}>
          <TextField
            size="small"
            variant="standard"
            value={pDays}
            disabled
            InputProps={{ disableUnderline: true }}
            sx={{
              width: 34,
              '& .MuiInputBase-input': {
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'text.secondary',
                py: 0.25,
                px: 0.25,
                textAlign: 'center',
                borderRadius: '4px',
                cursor: 'default',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            d
          </Typography>

          <TextField
            size="small"
            variant="standard"
            value={pHours}
            disabled
            InputProps={{ disableUnderline: true }}
            sx={{
              width: 30,
              ml: 0.25,
              '& .MuiInputBase-input': {
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'text.secondary',
                py: 0.25,
                px: 0.25,
                textAlign: 'center',
                borderRadius: '4px',
                cursor: 'default',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            h
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '0.7rem',
              ml: 0.5,
              letterSpacing: 0.3,
            }}
          >
            CD
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  const handleCommit = async (customDays?: number, customHours?: number) => {
    setIsEditing(false);

    let d = customDays !== undefined ? customDays : parseInt(daysStr, 10);
    let h = customHours !== undefined ? customHours : parseInt(hoursStr, 10);

    if (isNaN(d) || d < 0) d = 0;
    if (isNaN(h) || h < 0) h = 0;

    // Rollover hours if >= dailyWorkingHours
    if (h >= dailyWorkingHours) {
      const extraDays = Math.floor(h / dailyWorkingHours);
      const remHours = h % dailyWorkingHours;
      d += extraDays;
      h = remHours;
      toast.showSuccess(`Converted ${extraDays * dailyWorkingHours + remHours}h to ${d}d ${h}h (${dailyWorkingHours}h workday)`);
    }

    // Default to at least 1 day if both are 0
    if (d === 0 && h === 0) {
      d = 1;
      h = 0;
    }

    setDaysStr(String(d));
    setHoursStr(String(h));

    const currentDays = task.duration_working_days ?? 0;
    const currentHours = task.duration_working_hours ?? 0;

    if (d === currentDays && h === currentHours) {
      return;
    }

    try {
      if (onUpdate) {
        await onUpdate(task.id, d, h);
      } else {
        await updateTask({
          id: task.id,
          body: {
            duration_working_days: d,
            duration_working_hours: h,
          },
        }).unwrap();
        toast.showSuccess('Duration updated');
      }
    } catch (err: any) {
      const msg = err?.data?.detail || err?.data?.message || err?.message || 'Failed to update duration';
      toast.showError(typeof msg === 'string' ? msg : 'Failed to update duration');
      setDaysStr(String(currentDays));
      setHoursStr(String(currentHours));
    }
  };

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            Duration (Days & Hours)
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', display: 'block' }}>
            Set working days (d) and hours (h).
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
            Hours auto-rollover into days if &ge; {dailyWorkingHours}h.
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, whiteSpace: 'nowrap' }}>
        {/* Days Input */}
        <TextField
          type="number"
          size="small"
          variant="standard"
          value={daysStr}
          onFocus={() => setIsEditing(true)}
          onChange={(e) => setDaysStr(e.target.value)}
          onBlur={() => handleCommit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLElement).blur();
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setDaysStr(String(task.duration_working_days ?? 0));
              (e.target as HTMLElement).blur();
            }
          }}
          inputProps={{ min: 0 }}
          InputProps={{ disableUnderline: true }}
          sx={{
            width: 34,
            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
            '& input[type=number]': {
              MozAppearance: 'textfield',
            },
            '& .MuiInputBase-input': {
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: 'text.primary',
              py: 0.25,
              px: 0.25,
              textAlign: 'center',
              borderRadius: '4px',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: tTokens.inputBgHover },
              '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
            },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          d
        </Typography>

        {/* Hours Input */}
        <TextField
          type="number"
          size="small"
          variant="standard"
          value={hoursStr}
          onFocus={() => setIsEditing(true)}
          onChange={(e) => setHoursStr(e.target.value)}
          onBlur={() => handleCommit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLElement).blur();
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setHoursStr(String(task.duration_working_hours ?? 0));
              (e.target as HTMLElement).blur();
            }
          }}
          inputProps={{ min: 0 }}
          InputProps={{ disableUnderline: true }}
          sx={{
            width: 30,
            ml: 0.25,
            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
            '& input[type=number]': {
              MozAppearance: 'textfield',
            },
            '& .MuiInputBase-input': {
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: 'text.primary',
              py: 0.25,
              px: 0.25,
              textAlign: 'center',
              borderRadius: '4px',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: tTokens.inputBgHover },
              '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
            },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          h
        </Typography>

        {/* WD Unit Tag */}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '0.7rem',
            ml: 0.5,
            letterSpacing: 0.3,
          }}
        >
          WD
        </Typography>
      </Box>
    </Tooltip>
  );
}
