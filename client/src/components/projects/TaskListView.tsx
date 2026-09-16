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
  TextField,
  FormControl,
  ListItemText,
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
import { TaskItem, useUpdateTaskMutation, useGetStatusDefinitionsQuery } from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import { useTableSort } from '@/hooks/useTableSort';
import ErpSortHeaderCell from '@/components/ui/ErpSortHeaderCell';
import { time24To12, time12To24 } from '@/utils/format';

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
  const { data: users = [] } = useUsersQuery();
  const { data: statusDefs = [] } = useGetStatusDefinitionsQuery();
  const { showToast } = useToast();

  const defaultStatuses = [
    { id: 1, name: 'To Do', color: '#64748B' },
    { id: 2, name: 'In Progress', color: '#2563EB' },
    { id: 3, name: 'In Review', color: '#D97706' },
    { id: 4, name: 'Done', color: '#16A34A' },
    { id: 5, name: 'Blocked', color: '#DC2626' },
  ];
  const activeStatuses = statusDefs.length > 0 ? statusDefs : defaultStatuses;

  const handleCellUpdate = async (taskId: number, field: string, value: any) => {
    try {
      await updateTask({ id: taskId, body: { [field]: value } }).unwrap();
      showToast('Task updated', 'success');
    } catch {
      showToast('Failed to update task', 'error');
    }
  };

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
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

    return (
      <React.Fragment key={task.id}>
        <TableRow
          hover
          onClick={() => onOpenTaskDetail(task)}
          sx={{
            cursor: 'pointer',
            bgcolor: isSelected ? 'action.selected' : depth > 0 ? 'action.hover' : 'inherit',
            '&:hover': { bgcolor: 'action.hover' },
            '&:hover .sticky-cell': { bgcolor: '#F8FAFC' },
          }}
        >
          {/* Checkbox (Sticky) */}
          <TableCell
            className="sticky-cell"
            padding="checkbox"
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() => onToggleSelectTask(task.id)}
              sx={{ color: '#64748B', '&.Mui-checked': { color: '#04552B' } }}
            />
          </TableCell>

          {/* 1. Name (Sticky & Inline Editable) */}
          <TableCell
            className="sticky-cell"
            sx={{
              position: 'sticky',
              left: 48,
              zIndex: 1,
              bgcolor: 'background.paper',
              whiteSpace: 'nowrap',
              borderRight: '2px solid',
              borderColor: 'divider',
              minWidth: 360,
              width: 360,
              transition: 'background-color 0.15s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: depth * 3, width: '100%' }}>
              {hasChildren ? (
                <IconButton size="small" onClick={(e) => toggleExpand(task.id, e)} sx={{ p: 0.5, flexShrink: 0 }}>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </IconButton>
              ) : (
                <Box sx={{ width: 24, flexShrink: 0 }} />
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
                  flexShrink: 0,
                }}
              />

              <TextField
                size="small"
                variant="standard"
                defaultValue={task.title}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== task.title) {
                    handleCellUpdate(task.id, 'title', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  '& .MuiInputBase-input': {
                    fontWeight: depth === 0 ? 700 : 500,
                    fontSize: '0.875rem',
                    color: task.is_completed ? 'text.secondary' : 'text.primary',
                    textDecoration: task.is_completed ? 'line-through' : 'none',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: '4px',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9' },
                  },
                }}
              />

              {task.is_blocked && (
                <Chip
                  label="BLOCKED"
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#FEE2E2', color: '#DC2626', flexShrink: 0 }}
                />
              )}

              {task.subtask_count !== undefined && task.subtask_count > 0 && (
                <Chip
                  label={`${task.completed_subtask_count || 0}/${task.subtask_count} subtasks`}
                  size="small"
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569', flexShrink: 0 }}
                />
              )}
            </Box>
          </TableCell>

          {/* 2. Dependencies */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
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
                        onClick={() => onOpenTaskDetail(task)}
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          bgcolor: colors.bg,
                          color: colors.color,
                          cursor: 'pointer',
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
              <Typography
                variant="caption"
                onClick={() => onOpenTaskDetail(task)}
                sx={{ color: 'text.disabled', fontSize: 11, cursor: 'pointer', '&:hover': { color: '#04552B', textDecoration: 'underline' } }}
              >
                —
              </Typography>
            )}
          </TableCell>

          {/* 3. Assigned To (Inline Select) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <FormControl size="small" variant="standard">
              <Select
                multiple
                displayEmpty
                value={(task.assignees || []).map((a) => a.user_id)}
                onChange={(e) => {
                  const val = e.target.value as number[];
                  handleCellUpdate(task.id, 'assignee_ids', val);
                }}
                renderValue={(selected) => {
                  const selectedIds = selected as number[];
                  if (selectedIds.length === 0) return <Typography variant="caption" color="textSecondary">Unassigned</Typography>;
                  const matched = users.filter((u) => selectedIds.includes(u.id));
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
                      {matched.map((u) => (
                        <Chip
                          key={u.id}
                          avatar={
                            <Avatar sx={{ width: 18, height: 18, fontSize: '0.65rem', bgcolor: '#04552B', color: '#fff' }}>
                              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                            </Avatar>
                          }
                          label={u.full_name || u.email}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                  );
                }}
                disableUnderline
                sx={{
                  fontSize: '0.8rem',
                  '& .MuiSelect-select': { py: 0.25, px: 0.5, borderRadius: '4px', '&:hover': { bgcolor: '#F1F5F9' } },
                }}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    <Checkbox size="small" checked={(task.assignees || []).some((a) => a.user_id === u.id)} />
                    <ListItemText primary={u.full_name || u.email} primaryTypographyProps={{ fontSize: 13 }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </TableCell>

          {/* 4. Start Date & Time */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                type="date"
                size="small"
                variant="standard"
                defaultValue={task.start_date || ''}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val !== (task.start_date || '')) {
                    handleCellUpdate(task.id, 'start_date', val || null);
                  }
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9', color: 'text.primary' },
                  },
                }}
              />
              <TextField
                type="time"
                size="small"
                variant="standard"
                defaultValue={time12To24(task.start_time || '')}
                onBlur={(e) => {
                  const val = e.target.value ? time24To12(e.target.value) : '';
                  if (val !== (task.start_time || '')) {
                    handleCellUpdate(task.id, 'start_time', val || null);
                  }
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    py: 0.25,
                    px: 0.25,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9', color: 'text.primary' },
                  },
                }}
              />
            </Box>
          </TableCell>

          {/* 5. End Date & Time */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                type="date"
                size="small"
                variant="standard"
                defaultValue={task.due_date || ''}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val !== (task.due_date || '')) {
                    handleCellUpdate(task.id, 'due_date', val || null);
                  }
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9', color: 'text.primary' },
                  },
                }}
              />
              <TextField
                type="time"
                size="small"
                variant="standard"
                defaultValue={time12To24(task.due_time || '')}
                onBlur={(e) => {
                  const val = e.target.value ? time24To12(e.target.value) : '';
                  if (val !== (task.due_time || '')) {
                    handleCellUpdate(task.id, 'due_time', val || null);
                  }
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    py: 0.25,
                    px: 0.25,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9', color: 'text.primary' },
                  },
                }}
              />
            </Box>
          </TableCell>

          {/* 6. Duration (Inline Edit) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                type="number"
                size="small"
                variant="standard"
                defaultValue={task.duration_working_days || 0}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== (task.duration_working_days || 0)) {
                    handleCellUpdate(task.id, 'duration_working_days', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  width: 45,
                  '& .MuiInputBase-input': {
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                    py: 0.25,
                    px: 0.5,
                    textAlign: 'right',
                    borderRadius: '4px',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9' },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {task.is_parent ? 'CD' : 'WD'}
              </Typography>
            </Box>
          </TableCell>

          {/* 7. Status (Inline Edit Dropdown) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <FormControl size="small" variant="standard">
              <Select
                value={task.status_id || 1}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  handleCellUpdate(task.id, 'status_id', val);
                }}
                disableUnderline
                renderValue={(stId) => {
                  const st = activeStatuses.find((s) => s.id === stId);
                  return (
                    <Chip
                      label={st?.name || task.status_name || 'To Do'}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: st?.color || task.status_color || '#64748B',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    />
                  );
                }}
                sx={{
                  '& .MuiSelect-select': { p: 0 },
                }}
              >
                {activeStatuses.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: st.color }} />
                      <Typography variant="body2">{st.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </TableCell>

          {/* 8. Completion Date (Inline Edit) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <TextField
              type="date"
              size="small"
              variant="standard"
              defaultValue={task.completion_date || (task.completed_at ? task.completed_at.split('T')[0] : '')}
              onBlur={(e) => {
                const val = e.target.value;
                if (val !== (task.completion_date || '')) {
                  handleCellUpdate(task.id, 'completion_date', val || null);
                }
              }}
              InputProps={{ disableUnderline: true }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  py: 0.25,
                  px: 0.5,
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  '&:hover, &:focus': { bgcolor: '#F1F5F9', color: 'text.primary' },
                },
              }}
            />
          </TableCell>

          {/* 9. Estimated Cost (Inline Edit) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>₹</Typography>
              <TextField
                type="number"
                size="small"
                variant="standard"
                defaultValue={task.estimated_cost || 0}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== (task.estimated_cost || 0)) {
                    handleCellUpdate(task.id, 'estimated_cost', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  width: 80,
                  '& .MuiInputBase-input': {
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: '4px',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9' },
                  },
                }}
              />
            </Box>
          </TableCell>

          {/* 10. Actual Cost (Inline Edit) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>₹</Typography>
              <TextField
                type="number"
                size="small"
                variant="standard"
                defaultValue={task.actual_cost || 0}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== (task.actual_cost || 0)) {
                    handleCellUpdate(task.id, 'actual_cost', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  width: 80,
                  '& .MuiInputBase-input': {
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: '4px',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9' },
                  },
                }}
              />
            </Box>
          </TableCell>

          {/* Actions */}
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
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
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper', overflowX: 'auto' }}
    >
      <Table size="small" sx={{ minWidth: 1200 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            <TableCell
              padding="checkbox"
              sx={{
                position: 'sticky',
                left: 0,
                zIndex: 3,
                bgcolor: 'background.default',
                whiteSpace: 'nowrap',
              }}
            >
              <Checkbox
                size="small"
                checked={isAllSelected}
                onChange={() => onSelectAllTasks(isAllSelected ? [] : allTaskIds)}
                sx={{ color: '#64748B', '&.Mui-checked': { color: '#04552B' } }}
              />
            </TableCell>
            <ErpSortHeaderCell
              variant="mui"
              field="task_title"
              label="NAME"
              sortState={sortState}
              onSort={handleSort}
              sx={{
                position: 'sticky',
                left: 48,
                zIndex: 3,
                bgcolor: 'background.default',
                whiteSpace: 'nowrap',
                borderRight: '2px solid',
                borderColor: 'divider',
                minWidth: 360,
                width: 360,
                py: 1.5,
              }}
            />
            <ErpSortHeaderCell variant="mui" label="DEPENDENCIES" sortable={false} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" label="ASSIGNED TO" sortable={false} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" field="start_date" label="START DATE" sortState={sortState} onSort={handleSort} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" field="due_date" label="END DATE" sortState={sortState} onSort={handleSort} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" label="DURATION" sortable={false} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" field="status" label="STATUS" sortState={sortState} onSort={handleSort} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" field="completion_date" label="COMPLETION DATE" sortState={sortState} onSort={handleSort} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" field="estimated_cost" label="ESTIMATED COST" sortState={sortState} onSort={handleSort} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" field="actual_cost" label="ACTUAL COST" sortState={sortState} onSort={handleSort} sx={{ whiteSpace: 'nowrap' }} />
            <ErpSortHeaderCell variant="mui" label="ACTIONS" align="right" sortable={false} sx={{ whiteSpace: 'nowrap' }} />
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
