import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Checkbox,
  LinearProgress,
  Tooltip,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ChevronRight,
  ChevronDown,
  Clock,
  Briefcase,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { TaskItem, useUpdateTaskMutation } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

interface TaskListViewProps {
  tasks: TaskItem[];
  selectedTaskIds: number[];
  onToggleSelectTask: (id: number) => void;
  onSelectAllTasks: (ids: number[]) => void;
  onOpenTaskDetail: (task: TaskItem) => void;
  onDeleteTask: (id: number) => void;
}

export default function TaskListView({
  tasks,
  selectedTaskIds,
  onToggleSelectTask,
  onSelectAllTasks,
  onOpenTaskDetail,
  onDeleteTask,
}: TaskListViewProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<number, boolean>>({});
  const [updateTask] = useUpdateTaskMutation();
  const { showToast } = useToast();

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusChange = async (taskId: number, newStatusId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateTask({ id: taskId, body: { status_id: newStatusId } }).unwrap();
      showToast('Task status updated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handlePriorityChange = async (taskId: number, newPriority: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateTask({ id: taskId, body: { priority: newPriority } }).unwrap();
      showToast('Priority updated', 'success');
    } catch {
      showToast('Failed to update priority', 'error');
    }
  };

  // Group into root tasks (parent_task_id is null/undefined)
  const rootTasks = tasks.filter((t) => !t.parent_task_id);

  const allTaskIds = tasks.map((t) => t.id);
  const isAllSelected = allTaskIds.length > 0 && selectedTaskIds.length === allTaskIds.length;

  const renderTaskRow = (task: TaskItem, depth = 0) => {
    const hasChildren = task.subtasks && task.subtasks.length > 0;
    const isExpanded = !!expandedTaskIds[task.id];
    const isSelected = selectedTaskIds.includes(task.id);

    const isOverdue =
      task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;

    return (
      <React.Fragment key={task.id}>
        <TableRow
          hover
          onClick={() => onOpenTaskDetail(task)}
          sx={{
            cursor: 'pointer',
            bgcolor: isSelected ? 'action.selected' : depth > 0 ? 'action.hover' : 'inherit',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {/* Checkbox */}
          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() => onToggleSelectTask(task.id)}
              sx={{ color: '#64748B', '&.Mui-checked': { color: '#04552B' } }}
            />
          </TableCell>

          {/* Task Title & Hierarchy Indentation */}
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: depth * 3 }}>
              {hasChildren ? (
                <IconButton size="small" onClick={(e) => toggleExpand(task.id, e)} sx={{ p: 0.5 }}>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </IconButton>
              ) : (
                <Box sx={{ width: 24 }} />
              )}

              <Chip
                label={task.task_number || `TASK-${task.id}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: '#F1F5F9',
                  color: '#475569',
                  fontFamily: 'monospace',
                }}
              />

              <Typography
                variant="body2"
                sx={{
                  fontWeight: depth === 0 ? 700 : 500,
                  color: task.is_completed ? 'text.secondary' : 'text.primary',
                  textDecoration: task.is_completed ? 'line-through' : 'none',
                }}
              >
                {task.title}
              </Typography>

              {task.dependencies && task.dependencies.length > 0 && (
                <Tooltip title={`${task.dependencies.length} task dependencies`}>
                  <Box sx={{ display: 'inline-flex', ml: 0.5 }}>
                    <Lock size={13} color="#D97706" />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </TableCell>

          {/* Project & Cost Center */}
          <TableCell>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {task.project_name || 'General'}
              </Typography>
              {task.cost_center_code && (
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: 11 }}>
                  {task.cost_center_code} ({task.cost_center_name})
                </Typography>
              )}
            </Box>
          </TableCell>

          {/* Status */}
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Chip
              label={task.status_name || (task.is_completed ? 'Completed' : 'Open')}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                bgcolor: task.status_color || (task.is_completed ? '#DCFCE7' : '#E2E8F0'),
                color: task.is_completed ? '#166534' : '#1E293B',
              }}
            />
          </TableCell>

          {/* Assignees */}
          <TableCell>
            {task.assignees && task.assignees.length > 0 ? (
              <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11, bgcolor: '#04552B' } }}>
                {task.assignees.map((a) => (
                  <Avatar key={a.id} title={a.full_name}>
                    {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : (
              <Typography variant="caption" color="textSecondary">
                Unassigned
              </Typography>
            )}
          </TableCell>

          {/* Priority */}
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Chip
              label={task.priority}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 700,
                bgcolor:
                  task.priority === 'URGENT'
                    ? '#FEE2E2'
                    : task.priority === 'HIGH'
                    ? '#FEF3C7'
                    : '#F1F5F9',
                color:
                  task.priority === 'URGENT'
                    ? '#DC2626'
                    : task.priority === 'HIGH'
                    ? '#D97706'
                    : '#475569',
              }}
            />
          </TableCell>

          {/* Due Date */}
          <TableCell>
            {task.due_date ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isOverdue && <AlertCircle size={13} color="#DC2626" />}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isOverdue ? 700 : 500,
                    color: isOverdue ? '#DC2626' : 'text.primary',
                  }}
                >
                  {task.due_date}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="textSecondary">
                -
              </Typography>
            )}
          </TableCell>

          {/* Progress */}
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
              <LinearProgress
                variant="determinate"
                value={task.progress_percentage || 0}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'divider',
                  '& .MuiLinearProgress-bar': { bgcolor: '#04552B' },
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 30 }}>
                {task.progress_percentage || 0}%
              </Typography>
            </Box>
          </TableCell>

          {/* Time Tracking */}
          <TableCell>
            <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
              {Math.round(((task.actual_minutes || 0) / 60) * 10) / 10}h / {Math.round(((task.estimated_minutes || 0) / 60) * 10) / 10}h
            </Typography>
          </TableCell>

          {/* Actions */}
          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
            <IconButton size="small" onClick={() => onDeleteTask(task.id)} sx={{ color: '#DC2626' }}>
              <Trash2 size={15} />
            </IconButton>
          </TableCell>
        </TableRow>

        {/* Recursive Subtasks */}
        {hasChildren &&
          isExpanded &&
          task.subtasks.map((subtask) => renderTaskRow(subtask, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            <TableCell padding="checkbox">
              <Checkbox
                size="small"
                checked={isAllSelected}
                onChange={() => onSelectAllTasks(isAllSelected ? [] : allTaskIds)}
                sx={{ color: '#64748B', '&.Mui-checked': { color: '#04552B' } }}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>TASK / SUBTASK</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>PROJECT / COST CENTER</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>STATUS</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>ASSIGNEES</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>PRIORITY</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DUE DATE</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>PROGRESS</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>TIME TRACKED</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>ACTIONS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rootTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="textSecondary">
                  No tasks found in this view.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rootTasks.map((task) => renderTaskRow(task, 0))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
