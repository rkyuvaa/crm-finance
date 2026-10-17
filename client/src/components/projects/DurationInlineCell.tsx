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
  if (task.is_parent) {
    return String(task.duration_working_days ?? 0);
  }
  const days = task.duration_working_days;
  const hours = task.duration_working_hours;

  if ((days === null || days === undefined) && (hours === null || hours === undefined)) {
    return '';
  }

  if (hours && hours > 0) {
    return `${days || 0} - ${hours}`;
  }

  if (days !== null && days !== undefined && days > 0) {
    return `${days}`;
  }

  if (days === 0 && (!hours || hours === 0)) {
    return '0';
  }

  return '';
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

  const dailyWorkingHours = calendarConfig?.daily_working_hours || 9;

  const tTokens = {
    inputBgHover: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    inputBgFocus: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
    inputBorderFocus: isDark ? '#5FCF87' : '#203020',
  };

  const [localValue, setLocalValue] = useState<string>(() => getFormattedDuration(task));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(getFormattedDuration(task));
    }
  }, [task.duration_working_days, task.duration_working_hours, task.is_parent, isEditing]);

  // Read-only parent rollup task
  if (task.is_parent || disabled) {
    return (
      <Tooltip
        title={`Summary Task: ${task.duration_working_days ?? 0} Calendar Days (CD) calculated from child tasks`}
        arrow
        placement="top"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField
            size="small"
            variant="standard"
            value={task.duration_working_days ?? 0}
            disabled
            InputProps={{ disableUnderline: true }}
            sx={{
              width: 52,
              '& .MuiInputBase-input': {
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'text.secondary',
                py: 0.25,
                px: 0.5,
                textAlign: 'center',
                borderRadius: '4px',
                cursor: 'default',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
            CD
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  const handleCommit = async () => {
    setIsEditing(false);
    const trimmed = localValue.trim();
    const currentDays = task.duration_working_days ?? 0;
    const currentHours = task.duration_working_hours ?? 0;

    if (!trimmed) {
      setLocalValue(getFormattedDuration(task));
      return;
    }

    const parsed = parseDurationInput(trimmed, dailyWorkingHours);
    if (!parsed.isValid) {
      toast.showError(parsed.error || 'Invalid duration');
      setLocalValue(getFormattedDuration(task));
      return;
    }

    // Default to at least 1 day if both are 0
    let targetDays = parsed.days;
    let targetHours = parsed.hours;
    if (targetDays === 0 && targetHours === 0) {
      targetDays = 1;
    }

    // Unchanged check
    if (targetDays === currentDays && targetHours === currentHours) {
      setLocalValue(getFormattedDuration({ ...task, duration_working_days: targetDays, duration_working_hours: targetHours }));
      return;
    }

    try {
      if (onUpdate) {
        await onUpdate(task.id, targetDays, targetHours);
      } else {
        await updateTask({
          id: task.id,
          body: {
            duration_working_days: targetDays,
            duration_working_hours: targetHours,
          },
        }).unwrap();
        toast.showSuccess('Duration updated');
      }
    } catch (err: any) {
      const msg = err?.data?.detail || err?.data?.message || err?.message || 'Failed to update duration';
      toast.showError(typeof msg === 'string' ? msg : 'Failed to update duration');
      setLocalValue(getFormattedDuration(task));
    }
  };

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            Duration (D - H)
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', display: 'block' }}>
            Format: Days - Hours (e.g. 2 - 4 or 3).
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
            Hours must be less than daily working hours ({dailyWorkingHours}h).
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          type="text"
          size="small"
          variant="standard"
          placeholder="D - H"
          value={localValue}
          onFocus={() => setIsEditing(true)}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLElement).blur();
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setLocalValue(getFormattedDuration(task));
              (e.target as HTMLElement).blur();
            }
          }}
          InputProps={{ disableUnderline: true }}
          sx={{
            width: 58,
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
              px: 0.5,
              textAlign: 'center',
              borderRadius: '4px',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: tTokens.inputBgHover },
              '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
              '&::placeholder': {
                color: 'text.disabled',
                opacity: 0.75,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
              },
            },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
          WD
        </Typography>
      </Box>
    </Tooltip>
  );
}
