import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Autocomplete,
  IconButton,
  Grid,
  Divider,
  Tooltip,
  Paper,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { Link2, X, Trash2, ArrowRight, Clock, Calendar, AlertCircle } from 'lucide-react';
import {
  TaskItem,
  TaskDependencyInfo,
  useAddDependencyMutation,
  useUpdateDependencyMutation,
  useRemoveDependencyMutation,
  useGetCalendarConfigQuery,
} from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';
import { getTaskIdBadgeStyle } from '@/utils/format';

interface DependencyModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
  dependency: TaskDependencyInfo | null;
  projectTasks: TaskItem[];
}

const DEP_TYPES: Array<{
  id: 'FS' | 'SS' | 'FF' | 'SF';
  label: string;
  name: string;
  description: string;
}> = [
  { id: 'FS', label: 'FS', name: 'Finish to Start', description: 'Successor starts after Predecessor finishes' },
  { id: 'SS', label: 'SS', name: 'Start to Start', description: 'Successor starts together with Predecessor' },
  { id: 'FF', label: 'FF', name: 'Finish to Finish', description: 'Successor finishes together with Predecessor' },
  { id: 'SF', label: 'SF', name: 'Start to Finish', description: 'Successor finishes after Predecessor starts' },
];

export default function DependencyModal({
  open,
  onClose,
  task,
  dependency,
  projectTasks = [],
}: DependencyModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { showToast } = useToast();

  const [addDependency, { isLoading: isAdding }] = useAddDependencyMutation();
  const [updateDependency, { isLoading: isUpdating }] = useUpdateDependencyMutation();
  const [removeDependency, { isLoading: isRemoving }] = useRemoveDependencyMutation();
  const { data: calendarConfig } = useGetCalendarConfigQuery();
  const dailyWorkingHours = calendarConfig?.daily_working_hours || 8;

  const [selectedPredecessor, setSelectedPredecessor] = useState<TaskItem | null>(null);
  const [depType, setDepType] = useState<'FS' | 'SS' | 'FF' | 'SF'>('FS');
  const [lagDays, setLagDays] = useState<number | string>(0);
  const [lagHours, setLagHours] = useState<number | string>(0);

  // Initialize or reset form state when dialog opens or inputs change
  useEffect(() => {
    if (!open) return;

    if (dependency) {
      const predId = dependency.predecessor_task_id || dependency.depends_on_task_id;
      const found = projectTasks.find((t) => t.id === predId) || null;
      setSelectedPredecessor(found);
      setDepType((dependency.dep_type as any) || 'FS');
      setLagDays(dependency.lag_days ?? 0);
      setLagHours(dependency.lag_hours ?? 0);
    } else {
      setSelectedPredecessor(null);
      setDepType('FS');
      setLagDays(0);
      setLagHours(0);
    }
  }, [open, dependency, projectTasks]);

  // Candidates for predecessor:
  // Must belong to the same project.
  // Cannot be the current task itself or any of its descendants.
  // Cannot be a task that already is a dependency (except when editing that dependency).
  const availablePredecessors = useMemo(() => {
    if (!task) return [];

    const existingDepTaskIds = new Set(
      (task.dependencies || [])
        .map((d) => d.predecessor_task_id || d.depends_on_task_id)
        .filter((id) => Boolean(id) && (!dependency || id !== (dependency.predecessor_task_id || dependency.depends_on_task_id)))
    );

    // Collect all descendant ids of current task
    const descendantIds = new Set<number>();
    const collectDescendants = (tList: TaskItem[], parentId: number) => {
      for (const t of tList) {
        if (t.parent_task_id === parentId) {
          descendantIds.add(t.id);
          collectDescendants(tList, t.id);
        }
      }
    };
    collectDescendants(projectTasks, task.id);

    return projectTasks.filter((t) => {
      if (!t || t.id === task.id) return false;
      if (descendantIds.has(t.id)) return false;
      if (t.parent_task_id === task.id) return false;
      if (existingDepTaskIds.has(t.id)) return false;
      return true;
    });
  }, [task, projectTasks, dependency]);

  const handleReset = () => {
    if (dependency) {
      const predId = dependency.predecessor_task_id || dependency.depends_on_task_id;
      const found = projectTasks.find((t) => t.id === predId) || null;
      setSelectedPredecessor(found);
      setDepType((dependency.dep_type as any) || 'FS');
      setLagDays(dependency.lag_days ?? 0);
      setLagHours(dependency.lag_hours ?? 0);
    } else {
      setSelectedPredecessor(null);
      setDepType('FS');
      setLagDays(0);
      setLagHours(0);
    }
  };

  const handleRemove = async () => {
    if (!task || !dependency) return;
    try {
      await removeDependency({ taskId: task.id, dependencyId: dependency.id }).unwrap();
      showToast('Dependency removed successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.data?.detail?.message || err?.data?.detail || 'Failed to remove dependency', 'error');
    }
  };

  const handleSave = async () => {
    if (!task) return;
    if (!selectedPredecessor) {
      showToast('Please select a predecessor task', 'error');
      return;
    }

    const numericDays = Number(lagDays) || 0;
    const numericHours = Number(lagHours) || 0;

    if (Math.abs(numericHours) >= dailyWorkingHours) {
      showToast(`Lag hours (${Math.abs(numericHours)}h) must be less than daily working hours (${dailyWorkingHours}h)`, 'error');
      return;
    }

    try {
      if (dependency) {
        const oldPredId = dependency.predecessor_task_id || dependency.depends_on_task_id;
        if (oldPredId === selectedPredecessor.id) {
          // Update in-place
          await updateDependency({
            dependencyId: dependency.id,
            dep_type: depType,
            lag_days: numericDays,
            lag_hours: numericHours,
          }).unwrap();
          showToast('Dependency updated successfully', 'success');
        } else {
          // Re-create with new predecessor
          await removeDependency({ taskId: task.id, dependencyId: dependency.id }).unwrap();
          await addDependency({
            taskId: task.id,
            depends_on_task_id: selectedPredecessor.id,
            dep_type: depType,
            lag_days: numericDays,
            lag_hours: numericHours,
            direction: 'BLOCKED_BY',
          }).unwrap();
          showToast('Dependency updated with new predecessor', 'success');
        }
      } else {
        // Create new dependency
        await addDependency({
          taskId: task.id,
          depends_on_task_id: selectedPredecessor.id,
          dep_type: depType,
          lag_days: numericDays,
          lag_hours: numericHours,
          direction: 'BLOCKED_BY',
        }).unwrap();
        showToast('Dependency created successfully', 'success');
      }
      onClose();
    } catch (err: any) {
      showToast(err?.data?.detail?.message || err?.data?.detail || 'Failed to save dependency', 'error');
    }
  };

  const isSaving = isAdding || isUpdating || isRemoving;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}>
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? '#141D14' : '#F8FAFC',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: isDark ? 'rgba(95, 207, 135, 0.15)' : '#EAF6E8',
              color: isDark ? '#5FCF87' : '#203020',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Link2 size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {dependency ? 'Edit Dependency' : 'Create Dependency'}
            </Typography>
            {task && (
              <Typography variant="caption" color="textSecondary">
                For Task: <span style={{ fontWeight: 600 }}>{task.task_number || `TASK-${task.id}`}</span> — {task.title}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={isSaving}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.75 }}>
        {/* 1. Predecessor Selector */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
              Predecessor Task <span style={{ color: '#DC2626' }}>*</span>
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.72rem' }}>
              Only tasks in the same project can be selected
            </Typography>
          </Box>

          <Autocomplete
            value={selectedPredecessor}
            onChange={(_, val) => setSelectedPredecessor(val)}
            options={availablePredecessors}
            getOptionLabel={(option) => `${option.task_number ? option.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${option.id}`} - ${option.title}`}
            isOptionEqualToValue={(option, val) => option.id === val.id}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Search predecessor by Task ID or name..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', py: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1, pr: 1 }}>
                    <Chip
                      label={option.task_number ? option.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${option.id}`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, ...getTaskIdBadgeStyle(0) }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {option.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0, fontSize: '0.72rem' }}>
                    {option.due_date ? `Due: ${option.due_date}` : 'No date'}
                  </Typography>
                </Box>
              </li>
            )}
            noOptionsText="No eligible predecessor tasks in this project"
          />
        </Box>

        {/* 2. Dependency Type Selection */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 1 }}>
            Dependency Type
          </Typography>

          <Grid container spacing={1.25}>
            {DEP_TYPES.map((t) => {
              const isSelected = depType === t.id;
              return (
                <Grid item xs={6} key={t.id}>
                  <Paper
                    elevation={0}
                    onClick={() => setDepType(t.id)}
                    sx={{
                      p: 1.5,
                      border: '1.5px solid',
                      borderColor: isSelected ? (isDark ? '#5FCF87' : '#203020') : 'divider',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      bgcolor: isSelected
                        ? isDark
                          ? 'rgba(95, 207, 135, 0.12)'
                          : 'rgba(32, 48, 32, 0.05)'
                        : 'background.paper',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: isDark ? '#5FCF87' : '#203020',
                        bgcolor: isDark ? 'rgba(95, 207, 135, 0.08)' : 'rgba(32, 48, 32, 0.02)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Chip
                          label={t.label}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            bgcolor: isSelected ? (isDark ? '#5FCF87' : '#203020') : 'action.hover',
                            color: isSelected ? '#FFFFFF' : 'text.primary',
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          {t.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }}>
                      {t.description}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* 3. Lag / Lead (Days & Hours) */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 1 }}>
            Lag / Lead Offset
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Days"
                type="number"
                size="small"
                fullWidth
                value={lagDays}
                onChange={(e) => setLagDays(e.target.value)}
                placeholder="0"
                helperText="Working days (e.g. +2 delay, -1 lead)"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Hours"
                type="number"
                size="small"
                fullWidth
                value={lagHours}
                onChange={(e) => setLagHours(e.target.value)}
                placeholder="0"
                helperText={`Working hours (< ${dailyWorkingHours}h per day)`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  },
                }}
              />
            </Grid>
          </Grid>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic', fontSize: '0.74rem' }}>
            ℹ️ Positive values add delay (Lag); negative values represent lead time (Lead).
          </Typography>
        </Box>
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions
        sx={{
          py: 2,
          px: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? '#141D14' : '#F8FAFC',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {dependency && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Trash2 size={14} />}
              onClick={handleRemove}
              disabled={isSaving}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
            >
              Remove Dependency
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={handleReset}
            disabled={isSaving}
            sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.82rem' }}
          >
            Cancel / Reset
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={isSaving || !selectedPredecessor}
            sx={{
              bgcolor: isDark ? '#5FCF87' : '#203020',
              color: isDark ? '#141D14' : '#FFFFFF',
              '&:hover': { bgcolor: isDark ? '#4DB873' : '#2A402A' },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              px: 2.5,
              py: 0.75,
              borderRadius: '8px',
            }}
          >
            {isSaving ? <CircularProgress size={16} color="inherit" /> : 'Save Dependency'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
