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
  Link2,
} from 'lucide-react';
import { TaskItem, useUpdateTaskMutation } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';
import { useTableSort } from '@/hooks/useTableSort';
import ErpSortHeaderCell from '@/components/ui/ErpSortHeaderCell';

const DEP_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  FS: { bg: '#D1FAE5', color: '#065F46' },
  SS: { bg: '#DBEAFE', color: '#1E40AF' },
  FF: { bg: '#EDE9FE', color: '#5B21B6' },
  SF: { bg: '#FEF3C7', color: '#92400E' },
};

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

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Group into root tasks (parent_task_id is null/undefined)
  const rootTasks = safeTasks.filter((t) => t && !t.parent_task_id);

  const { sortState, handleSort, sortData } = useTableSort<TaskItem>({
    getValue: {
      task_title: (t) => t.title,
      start_date: (t) => t.start_date || '',
      due_date: (t) => t.due_date || '',
      status: (t) => t.status_name || '',
      completion_date: (t) => t.completion_date || t.completed_at || '',
      estimated_cost: (t) => t.estimated_cost || 0,
      actual_cost: (t) => t.actual_cost || 0,
    },
  });

  const sortedRootTasks = React.useMemo(() => sortData(rootTasks), [rootTasks, sortData]);

  const allTaskIds = tasks.map((t) => t.id);
  const isAllSelected = allTaskIds.length > 0 && selectedTaskIds.length === allTaskIds.length;

  const renderTaskRow = (task: TaskItem, depth = 0) => {
    const subtaskList = task.nested_subtasks || task.subtasks || [];
    const hasChildren = subtaskList.length > 0;
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

          {/* 1. Name */}
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
                label={task.task_number ? task.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${task.id}`}
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

              {task.is_blocked && (
                <Chip
                  label="BLOCKED"
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#FEE2E2', color: '#DC2626' }}
                />
              )}

              {task.subtask_count !== undefined && task.subtask_count > 0 && (
                <Chip
                  label={`${task.completed_subtask_count || 0}/${task.subtask_count} subtasks`}
                  size="small"
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569' }}
                />
              )}
            </Box>
          </TableCell>

          {/* 2. Dependencies */}
          <TableCell onClick={(e) => e.stopPropagation()}>
            {task.dependencies && task.dependencies.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, maxWidth: 180 }}>
                {task.dependencies.slice(0, 2).map((dep) => {
                  const dt = dep.dep_type || 'FS';
                  const colors = DEP_TYPE_COLORS[dt] || DEP_TYPE_COLORS.FS;
                  const num = dep.predecessor_task_number || dep.depends_on_task_number || `TASK-${dep.depends_on_task_id}`;
                  return (
                    <Tooltip
                      key={dep.id}
                      title={`${dep.predecessor_task_title || dep.depends_on_task_title || 'Task'} · ${dt}${dep.lag_days ? ` +${dep.lag_days}d` : ''}`}
                    >
                      <Chip
                        icon={<Link2 size={9} color={colors.color} />}
                        label={`${num.replace(/0+([1-9]\d*)$/, '$1')} (${dt})`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          bgcolor: colors.bg,
                          color: colors.color,
                          '& .MuiChip-icon': { ml: 0.5 },
                        }}
                      />
                    </Tooltip>
                  );
                })}
                {task.dependencies.length > 2 && (
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', alignSelf: 'center' }}>
                    +{task.dependencies.length - 2}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>—</Typography>
            )}
          </TableCell>

          {/* 3. Assigned To */}
          <TableCell>
            {task.assignees && task.assignees.length > 0 ? (
              <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11, bgcolor: '#04552B', color: '#FFFFFF' } }}>
                {task.assignees.map((a) => (
                  <Avatar key={a.id} title={a.user?.full_name || `User #${a.user_id}`}>
                    {(a.user?.full_name || '?').charAt(0).toUpperCase()}
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : (
              <Typography variant="caption" color="textSecondary">
                {task.assignee_name || 'Unassigned'}
              </Typography>
            )}
          </TableCell>

          {/* 4. Start Date */}
          <TableCell>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {task.start_date || '—'}
            </Typography>
          </TableCell>

          {/* 5. End Date */}
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
                —
              </Typography>
            )}
          </TableCell>

          {/* 6. Duration */}
          <TableCell>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
              {task.is_parent ? `${task.duration_working_days || 0} CD` : `${task.duration_working_days || 0} WD`}
            </Typography>
          </TableCell>

          {/* 7. Status */}
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Chip
              label={task.status_name || (task.is_completed ? 'Done' : 'To Do')}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                bgcolor: task.status_color || (task.is_completed ? '#16A34A' : '#64748B'),
                color: '#FFFFFF',
              }}
            />
          </TableCell>

          {/* 8. Completion Date */}
          <TableCell>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {task.completion_date || (task.completed_at ? task.completed_at.split('T')[0] : '—')}
            </Typography>
          </TableCell>

          {/* 9. Estimated Cost */}
          <TableCell>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              ₹{(task.estimated_cost || 0).toLocaleString('en-IN')}
            </Typography>
          </TableCell>

          {/* 10. Actual Cost */}
          <TableCell>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              ₹{(task.actual_cost || 0).toLocaleString('en-IN')}
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
          subtaskList.map((subtask) => renderTaskRow(subtask, depth + 1))}
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
            <ErpSortHeaderCell variant="mui" field="task_title" label="NAME" sortState={sortState} onSort={handleSort} sx={{ py: 1.5 }} />
            <ErpSortHeaderCell variant="mui" label="DEPENDENCIES" sortable={false} />
            <ErpSortHeaderCell variant="mui" label="ASSIGNED TO" sortable={false} />
            <ErpSortHeaderCell variant="mui" field="start_date" label="START DATE" sortState={sortState} onSort={handleSort} />
            <ErpSortHeaderCell variant="mui" field="due_date" label="END DATE" sortState={sortState} onSort={handleSort} />
            <ErpSortHeaderCell variant="mui" label="DURATION" sortable={false} />
            <ErpSortHeaderCell variant="mui" field="status" label="STATUS" sortState={sortState} onSort={handleSort} />
            <ErpSortHeaderCell variant="mui" field="completion_date" label="COMPLETION DATE" sortState={sortState} onSort={handleSort} />
            <ErpSortHeaderCell variant="mui" field="estimated_cost" label="ESTIMATED COST" sortState={sortState} onSort={handleSort} />
            <ErpSortHeaderCell variant="mui" field="actual_cost" label="ACTUAL COST" sortState={sortState} onSort={handleSort} />
            <ErpSortHeaderCell variant="mui" label="ACTIONS" align="right" sortable={false} />
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRootTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="textSecondary">
                  No tasks found in this view.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            sortedRootTasks.map((task) => renderTaskRow(task, 0))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
