import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Avatar,
  AvatarGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Tooltip,
  Collapse,
  Checkbox,
  InputLabel,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  Search,
  Flag,
  CheckSquare,
  Clock,
  Trash2,
  Lock,
  RefreshCw,
  Link2,
} from 'lucide-react';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useAddSubtaskMutation,
  useDeleteTaskMutation,
  useGetStatusDefinitionsQuery,
  useGetProjectMilestonesQuery,
  TaskItem,
} from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import { time24To12, time12To24, formatDateTime12h } from '@/utils/format';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';

interface ProjectTasksListProps {
  projectId: string;
}

export default function ProjectTasksList({ projectId }: ProjectTasksListProps) {
  const toast = useToast();
  const numericProjectId = Number(projectId);
  const { data: users = [] } = useUsersQuery();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [searchQ, setSearchQ] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [quickTaskInputs, setQuickTaskInputs] = useState<Record<number, string>>({});
  const [groupBy, setGroupBy] = useState<'status' | 'milestone'>('milestone');

  const { data: milestones = [] } = useGetProjectMilestonesQuery(numericProjectId);

  const isRecalculating = useSelector((state: any) => {
    if (!state.projectsApi || !state.projectsApi.mutations) return false;
    return Object.values(state.projectsApi.mutations).some((m: any) => 
      (m.endpointName === 'updateTask' || m.endpointName === 'createTask' || m.endpointName === 'deleteTask') && m.status === 'pending'
    );
  });

  // Subtask Collapsible & Creation State
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<number, boolean>>({});
  const [addingSubtaskId, setAddingSubtaskId] = useState<number | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const { data: tasks = [], isLoading } = useGetTasksQuery({
    project_id: numericProjectId,
    q: searchQ || undefined,
  });

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = safeTasks.filter((t) => {
    if (!t) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  const { data: statusDefs = [] } = useGetStatusDefinitionsQuery();
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [addSubtask] = useAddSubtaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Task Creation Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState<number>(1);
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('05:00 PM');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(0);
  const [milestoneId, setMilestoneId] = useState<number | ''>('');

  const defaultStatuses = [
    { id: 1, name: 'To Do', color: '#64748B', is_terminal: false },
    { id: 2, name: 'In Progress', color: '#2563EB', is_terminal: false },
    { id: 3, name: 'In Review', color: '#D97706', is_terminal: false },
    { id: 4, name: 'Done', color: '#16A34A', is_terminal: true },
    { id: 5, name: 'Blocked', color: '#DC2626', is_terminal: false },
  ];

  const activeStatuses = statusDefs.length > 0 ? statusDefs : defaultStatuses;

  const toggleGroup = (statusIdVal: number) => {
    setExpandedGroups((prev) => ({ ...prev, [statusIdVal]: !prev[statusIdVal] }));
  };

  const toggleSubtasksExpand = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCreateSubtask = async (parentId: number) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await addSubtask({ taskId: parentId, body: { title: newSubtaskTitle.trim() } }).unwrap();
      toast.showSuccess('Subtask created successfully');
      setNewSubtaskTitle('');
      setAddingSubtaskId(null);
      setExpandedTaskIds((prev) => ({ ...prev, [parentId]: true }));
    } catch {
      toast.showError('Failed to create subtask');
    }
  };

  const handleToggleSubtaskCompleted = async (subtask: TaskItem, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    try {
      await updateTask({ id: subtask.id, body: { is_completed: !subtask.is_completed } }).unwrap();
    } catch {
      toast.showError('Failed to update subtask status');
    }
  };

  const handleDeleteTaskItem = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id).unwrap();
        toast.showSuccess('Task deleted');
      } catch {
        toast.showError('Failed to delete task');
      }
    }
  };

  const openTask = (task: TaskItem) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const handleOpenCreateModal = (defaultStatusId: number = 1, defaultMilestoneId?: number) => {
    setTitle('');
    setDescription('');
    setStatusId(defaultStatusId);
    setMilestoneId(defaultMilestoneId || '');
    setPriority('NORMAL');
    setAssigneeIds([]);
    setStartDate('');
    setStartTime('09:00 AM');
    setDueDate('');
    setDueTime('05:00 PM');
    setEstimatedHours(0);
    setCreateOpen(true);
  };

  const handleCellUpdate = async (taskId: number, field: string, value: any) => {
    try {
      await updateTask({ id: taskId, body: { [field]: value } }).unwrap();
      toast.showSuccess('Task updated');
    } catch (err: any) {
      const msg = typeof err?.data?.detail === 'string'
        ? err.data.detail
        : err?.data?.detail?.message || err?.message || 'Failed to update task';
      toast.showError(msg);
    }
  };

  // Inline Quick Task Creation ("Type & Enter")
  const handleQuickCreateTask = async (targetStatusId: number) => {
    const taskTitle = quickTaskInputs[targetStatusId]?.trim();
    if (!taskTitle) return;

    try {
      await createTask({
        title: taskTitle,
        project_id: numericProjectId,
        status_id: targetStatusId,
        priority: 'NORMAL',
      }).unwrap();
      setQuickTaskInputs((prev) => ({ ...prev, [targetStatusId]: '' }));
      toast.showSuccess(`Task "${taskTitle}" created!`);
    } catch (err: any) {
      const msg = typeof err?.data?.detail === 'string'
        ? err.data.detail
        : err?.data?.detail?.message || err?.message || 'Failed to create task';
      toast.showError(msg);
    }
  };

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: number) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);
    try {
      await updateTask({ id: taskId, body: { status_id: targetStatusId } }).unwrap();
      toast.showSuccess('Task status updated!');
    } catch (err: any) {
      const msg = typeof err?.data?.detail === 'string'
        ? err.data.detail
        : err?.data?.detail?.message || err?.message || 'Failed to update task status';
      toast.showError(msg);
    }
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      toast.showError('Task title is required');
      return;
    }
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: numericProjectId,
        status_id: statusId,
        milestone_id: milestoneId ? Number(milestoneId) : undefined,
        priority,
        assignee_id: assigneeIds.length > 0 ? assigneeIds[0] : undefined,
        assignee_ids: assigneeIds,
        start_date: startDate || undefined,
        start_time: startTime || undefined,
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
        estimated_hours: Number(estimatedHours) || 0,
      } as any).unwrap();
      toast.showSuccess(`Task "${title}" created successfully!`);
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setAssigneeIds([]);
      setStartDate('');
      setStartTime('09:00 AM');
      setDueDate('');
      setDueTime('05:00 PM');
      setEstimatedHours(0);
      setMilestoneId('');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create task');
    }
  };

  const getPriorityFlagColor = (p: string) => {
    switch (p) {
      case 'URGENT':
        return '#DC2626';
      case 'HIGH':
        return '#D97706';
      case 'NORMAL':
        return '#2563EB';
      case 'LOW':
        return '#64748B';
      default:
        return '#64748B';
    }
  };

  // Recursive subtask card renderer supporting multi-level hierarchy (Task -> Subtask -> Sub-subtask)
  const renderSubtaskCards = (subtaskList: TaskItem[], depth = 1) => {
    if (!subtaskList || subtaskList.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, pl: depth * 1.5 }}>
        {subtaskList.map((sub) => {
          const subChildren = sub.nested_subtasks || sub.subtasks || [];
          const isSubExpanded = !!expandedTaskIds[sub.id];
          const isSubCompleted = sub.is_completed;
          const isSubOverdue = sub.due_date && new Date(sub.due_date) < new Date() && !isSubCompleted;

          return (
            <Box key={sub.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.25,
                  border: '1px solid',
                  borderColor: isSubCompleted ? 'divider' : '#CBD5E1',
                  borderLeft: '3px solid #04552B',
                  borderRadius: '8px',
                  bgcolor: isSubCompleted ? 'action.hover' : '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderColor: '#04552B',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  openTask(sub);
                }}
              >
                {/* Subtask Header Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                    <Checkbox
                      size="small"
                      checked={!!isSubCompleted}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleSubtaskCompleted(sub, e)}
                      sx={{ p: 0.2, color: '#64748B', '&.Mui-checked': { color: '#04552B' } }}
                    />
                    <Chip
                      label={sub.task_number ? sub.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${sub.id}`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        bgcolor: '#E2E8F0',
                        color: '#334155',
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: isSubCompleted ? 'text.secondary' : 'text.primary',
                        textDecoration: isSubCompleted ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sub.title}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {sub.priority && (
                      <Flag
                        size={13}
                        color={getPriorityFlagColor(sub.priority)}
                        fill={getPriorityFlagColor(sub.priority)}
                      />
                    )}

                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteTaskItem(sub.id, e)}
                      sx={{ color: '#94A3B8', p: 0.2, '&:hover': { color: '#DC2626' } }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Subtask Meta Row */}
                {(sub.due_date || (sub.assignees && sub.assignees.length > 0)) && (
                  <Box
                    sx={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      mt: 0.75,
                      pt: 0.5,
                      borderTop: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    {sub.due_date ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={11} color={isSubOverdue ? '#DC2626' : '#64748B'} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 10,
                            color: isSubOverdue ? '#DC2626' : 'text.secondary',
                            fontWeight: isSubOverdue ? 700 : 500,
                          }}
                        >
                          {sub.due_date}
                        </Typography>
                      </Box>
                    ) : (
                      <div />
                    )}

                    {sub.assignees && sub.assignees.length > 0 && (
                      <AvatarGroup max={2} sx={{ '& .MuiAvatar-root': { width: 18, height: 18, fontSize: 9, bgcolor: '#04552B' } }}>
                        {sub.assignees.map((a) => (
                          <Avatar key={a.id} title={a.full_name}>
                            {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    )}
                  </Box>
                )}

                {/* Sub-subtask Collapsible Toggle */}
                {subChildren.length > 0 && (
                  <Box
                    onClick={(e) => toggleSubtasksExpand(sub.id, e)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.75,
                      pt: 0.5,
                      cursor: 'pointer',
                      color: '#04552B',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {isSubExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>
                      {isSubExpanded ? '▼' : '▶'} {subChildren.length} {subChildren.length === 1 ? 'subtask' : 'subtasks'}
                    </span>
                  </Box>
                )}
              </Paper>

              {/* Recursive child subtasks */}
              {subChildren.length > 0 && (
                <Collapse in={isSubExpanded} timeout="auto" unmountOnExit={false}>
                  {renderSubtaskCards(subChildren, depth + 1)}
                </Collapse>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render Table Row for List View
  const renderListTableRow = (task: TaskItem, depth = 0) => {
    const subtaskList = task.nested_subtasks || task.subtasks || [];
    const hasChildren = subtaskList.length > 0;
    const isExpanded = !!expandedTaskIds[task.id];

    return (
      <React.Fragment key={task.id}>
        <TableRow
          hover
          sx={{
            cursor: 'pointer',
            '&:hover .sticky-cell': { bgcolor: '#F8FAFC' },
          }}
          onClick={() => openTask(task)}
        >
          {/* Expander Cell (Sticky) */}
          <TableCell
            className="sticky-cell"
            align="center"
            width={40}
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: depth * 2 }}>
              {hasChildren ? (
                <IconButton size="small" onClick={(e) => toggleSubtasksExpand(task.id, e)} sx={{ p: 0.2 }}>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </IconButton>
              ) : (
                <Box sx={{ width: 18 }} />
              )}
            </Box>
          </TableCell>

          {/* 1. Name Cell (Sticky & Inline Editable) */}
          <TableCell
            className="sticky-cell"
            sx={{
              position: 'sticky',
              left: 40,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {task.task_number && (
                <Chip
                  label={task.task_number.replace(/0+([1-9]\d*)$/, '$1')}
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
              )}
              {task.dependency_conflict?.has_conflict && (
                <Tooltip title={task.dependency_conflict.conflict_message}>
                  <Chip
                    label="⚠️ Conflict"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      bgcolor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              )}
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
                    fontWeight: depth === 0 ? 600 : 500,
                    fontSize: '0.875rem',
                    color: 'text.primary',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: '4px',
                    '&:hover, &:focus': { bgcolor: '#F1F5F9' },
                  },
                }}
              />

              {hasChildren && (
                <Chip
                  label={`${task.completed_subtask_count || 0}/${task.subtask_count || subtaskList.length} subtasks`}
                  size="small"
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569', flexShrink: 0 }}
                />
              )}
            </Box>
          </TableCell>

          {/* 2. Dependencies (Click to edit/add) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {task.dependencies && task.dependencies.length > 0 ? (
                task.dependencies.slice(0, 2).map((dep) => {
                  const dt = dep.dep_type || 'FS';
                  const num = dep.predecessor_task_number || dep.depends_on_task_number || `TASK-${dep.depends_on_task_id}`;
                  return (
                    <Tooltip key={dep.id} title={`${dep.predecessor_task_title || dep.depends_on_task_title || 'Task'} (${dt})`}>
                      <Chip
                        icon={<Link2 size={10} color="#065F46" />}
                        label={`${num.replace(/0+([1-9]\d*)$/, '$1')} (${dt})`}
                        size="small"
                        onClick={() => openTask(task)}
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: '#D1FAE5',
                          color: '#065F46',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                        }}
                      />
                    </Tooltip>
                  );
                })
              ) : (
                <Typography
                  variant="body2"
                  onClick={() => openTask(task)}
                  sx={{ color: 'text.disabled', cursor: 'pointer', fontSize: '0.75rem', '&:hover': { color: '#04552B', textDecoration: 'underline' } }}
                >
                  —
                </Typography>
              )}
            </Box>
          </TableCell>

          {/* 3. Assigned To (Inline Select Dropdown) */}
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
                  if (selectedIds.length === 0) return <Typography variant="body2" color="textSecondary">Unassigned</Typography>;
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

          {/* 6. Duration (Inline Numeric Edit) */}
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

          {/* 7. Status (Inline Status Selector) */}
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

          {/* 8. Completion Date (Inline Date Picker) */}
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

          {/* 9. Estimated Cost (Inline Numeric Input) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>₹</Typography>
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

          {/* 10. Actual Cost (Inline Numeric Input) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>₹</Typography>
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
        </TableRow>

        {/* List View Recursive Subtasks */}
        {hasChildren && isExpanded && subtaskList.map((subtask) => renderListTableRow(subtask, depth + 1))}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── CLICKUP STYLE TOOLBAR (Top Bar) ────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
        }}
      >
        {/* View Toggle Buttons (Board vs List) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{
              height: 32,
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12,
                px: 1.5,
                '&.Mui-selected': { bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700 },
              },
            }}
          >
            <ToggleButton value="list">
              <ListIcon size={14} style={{ marginRight: 6 }} /> List
            </ToggleButton>
            <ToggleButton value="board">
              <LayoutGrid size={14} style={{ marginRight: 6 }} /> Board
            </ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small">
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'status' | 'milestone')}
              sx={{ height: 32, fontSize: 12, bgcolor: 'background.paper' }}
            >
              <MenuItem value="status">Group: Status</MenuItem>
              <MenuItem value="milestone">Group: Milestone</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Right Search & Add Task Action */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isRecalculating && (
            <Chip
              icon={<RefreshCw size={12} className="animate-spin" />}
              label="Recalculating..."
              size="small"
              sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600, fontSize: 11, border: '1px solid #FDE68A' }}
            />
          )}

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              displayEmpty
              sx={{ height: 32, fontSize: 12, bgcolor: 'background.paper' }}
            >
              <MenuItem value="ALL">All Priorities</MenuItem>
              <MenuItem value="URGENT">Urgent 🚩</MenuItem>
              <MenuItem value="HIGH">High 🚩</MenuItem>
              <MenuItem value="NORMAL">Normal 🚩</MenuItem>
              <MenuItem value="LOW">Low 🚩</MenuItem>
            </Select>
          </FormControl>

          <TextField
            placeholder="Search tasks..."
            size="small"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} color="#94A3B8" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220, '& .MuiOutlinedInput-root': { height: 32, fontSize: 12 } }}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={() => handleOpenCreateModal(1)}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 32, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
          >
            Add Task
          </Button>
        </Box>
      </Box>

      {/* ── CLICKUP KANBAN BOARD VIEW ──────────────────────────────────── */}
      {viewMode === 'board' && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            minHeight: '520px',
            alignItems: 'flex-start',
          }}
        >
          {activeStatuses.map((st) => {
            // Filter top-level tasks only (exclude standalone subtasks)
            const statusTasks = filteredTasks.filter((t) => !t.parent_task_id && (t.status_id || 1) === st.id);

            return (
              <Box
                key={st.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, st.id)}
                sx={{
                  width: 300,
                  minWidth: 300,
                  bgcolor: 'background.default',
                  borderRadius: '10px',
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 280px)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Column Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={st.name.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: st.color,
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        height: 22,
                        px: 0.5,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {statusTasks.length}
                    </Typography>
                  </Box>

                  <Tooltip title="Add Task in this status">
                    <IconButton size="small" onClick={() => handleOpenCreateModal(st.id)} sx={{ p: 0.5 }}>
                      <Plus size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Cards Container */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    overflowY: 'auto',
                    pr: 0.5,
                    flex: 1,
                  }}
                >
                  {statusTasks.length === 0 ? (
                    <Box
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: '8px',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                        No tasks in {st.name}
                      </Typography>
                    </Box>
                  ) : (
                    statusTasks.map((task) => {
                      const subtaskList = task.nested_subtasks || task.subtasks || [];
                      const subtaskCount = task.subtask_count ?? subtaskList.length;
                      const completedCount =
                        task.completed_subtask_count ?? subtaskList.filter((s) => s.is_completed).length;
                      const isExpanded = !!expandedTaskIds[task.id];

                      return (
                        <Paper
                          key={task.id}
                          elevation={0}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => openTask(task)}
                          sx={{
                            p: 2,
                            borderRadius: '8px',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'grab',
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            },
                          }}
                        >
                          {/* Task Title */}
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5, lineHeight: 1.4 }}>
                            {task.title}
                          </Typography>

                          {/* Footer Meta Row */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* Assignee Avatar */}
                              <Tooltip title={task.assignee_name || 'Unassigned'}>
                                <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#04552B', color: '#FFFFFF', fontWeight: 700 }}>
                                  {task.assignee_name?.charAt(0) || '?'}
                                </Avatar>
                              </Tooltip>

                              {/* Priority Flag */}
                              <Tooltip title={`Priority: ${task.priority}`}>
                                <Flag size={14} color={getPriorityFlagColor(task.priority)} fill={getPriorityFlagColor(task.priority)} />
                              </Tooltip>
                            </Box>

                            {/* Due Date or Tracked Hours */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {task.due_date && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: 'text.secondary' }}>
                                  <Calendar size={12} />
                                  <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 500 }}>
                                    {task.due_date}
                                  </Typography>
                                </Box>
                              )}
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, fontFamily: 'monospace' }}>
                                {task.actual_hours}h/{task.estimated_hours}h
                              </Typography>
                            </Box>
                          </Box>

                          {/* ClickUp-style Collapsible Subtask Row */}
                          {(subtaskCount > 0 || addingSubtaskId === task.id) && (
                            <Box
                              onClick={(e) => toggleSubtasksExpand(task.id, e)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mt: 1.25,
                                pt: 0.75,
                                pb: 0.75,
                                px: 1,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                bgcolor: isExpanded ? 'action.selected' : '#F8FAFC',
                                '&:hover': { bgcolor: 'action.selected' },
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {isExpanded ? (
                                  <ChevronDown size={15} color="#04552B" />
                                ) : (
                                  <ChevronRight size={15} color="#04552B" />
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: '#04552B',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                  }}
                                >
                                  <span>{isExpanded ? '▼' : '▶'}</span>
                                  <span>
                                    {subtaskCount === 1
                                      ? '1 subtask'
                                      : `${completedCount > 0 ? `${completedCount}/${subtaskCount}` : subtaskCount} subtasks`}
                                  </span>
                                </Typography>
                              </Box>

                              <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }}>
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </Typography>
                            </Box>
                          )}

                          {/* Collapsible Child Task Container */}
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit={false}>
                            <Box onClick={(e) => e.stopPropagation()} sx={{ pt: 0.5 }}>
                              {renderSubtaskCards(subtaskList, 1)}

                              {/* Inline Add Subtask Input */}
                              <Box sx={{ mt: 1, pl: 1, display: 'flex', gap: 0.75, alignItems: 'center' }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  placeholder="+ Add a subtask (press Enter)..."
                                  value={addingSubtaskId === task.id ? newSubtaskTitle : ''}
                                  onFocus={() => setAddingSubtaskId(task.id)}
                                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleCreateSubtask(task.id);
                                    }
                                  }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      height: 30,
                                      fontSize: '0.75rem',
                                      bgcolor: 'background.paper',
                                      borderRadius: '6px',
                                    },
                                  }}
                                />
                                {addingSubtaskId === task.id && newSubtaskTitle.trim() && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleCreateSubtask(task.id)}
                                    sx={{
                                      height: 30,
                                      fontSize: '0.7rem',
                                      minWidth: 50,
                                      px: 1.5,
                                      bgcolor: '#04552B',
                                      '&:hover': { bgcolor: '#033B1E' },
                                    }}
                                  >
                                    Add
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </Paper>
                      );
                    })
                  )}
                </Box>

                {/* Inline Fast Task Creation ("Type & Enter") */}
                <Box sx={{ mt: 1.5 }}>
                  <TextField
                    placeholder="+ Add Task (Press Enter)"
                    size="small"
                    fullWidth
                    value={quickTaskInputs[st.id] || ''}
                    onChange={(e) => setQuickTaskInputs((prev) => ({ ...prev, [st.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleQuickCreateTask(st.id);
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 32,
                        fontSize: 12,
                        bgcolor: 'background.paper',
                      },
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── CLICKUP GROUPED LIST VIEW ───────────────────────────────────── */}
      {viewMode === 'list' && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell
                  width={40}
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    bgcolor: 'background.default',
                    whiteSpace: 'nowrap',
                  }}
                ></TableCell>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 40,
                    zIndex: 3,
                    bgcolor: 'background.default',
                    fontWeight: 600,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    borderRight: '2px solid',
                    borderColor: 'divider',
                    minWidth: 360,
                    width: 360,
                  }}
                >
                  Name
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Dependencies</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Completion Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Estimated Cost</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Actual Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                    <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>
                      No tasks found in this project yet.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Plus size={15} />}
                      onClick={() => handleOpenCreateModal(1)}
                      sx={{ textTransform: 'none', color: '#04552B', borderColor: '#04552B' }}
                    >
                      Create First Task
                    </Button>
                  </TableCell>
                </TableRow>
              ) : groupBy === 'status' ? (
                activeStatuses.map((status) => {
                  const statusTasks = filteredTasks.filter((t) => !t.parent_task_id && (t.status_id || 1) === status.id);
                  if (statusTasks.length === 0) return null;
                  const isExpanded = expandedGroups[status.id] !== false; // default true

                  return (
                    <React.Fragment key={`status-${status.id}`}>
                      {/* Group Header */}
                      <TableRow sx={{ bgcolor: 'background.default', cursor: 'pointer' }} onClick={() => toggleGroup(status.id)}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            bgcolor: 'background.default',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          colSpan={10}
                          sx={{
                            position: 'sticky',
                            left: 40,
                            zIndex: 2,
                            bgcolor: 'background.default',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={status.name} size="small" sx={{ bgcolor: status.color, color: 'white', fontWeight: 600, height: 20, fontSize: '0.7rem' }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{statusTasks.length} Tasks</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Tasks */}
                      {isExpanded && statusTasks.map((task) => renderListTableRow(task, 0))}
                    </React.Fragment>
                  );
                })
              ) : (
                [
                  ...milestones.map((m) => ({ id: m.id, name: m.title })),
                  { id: null, name: 'Unassigned Milestone' }
                ].map((milestone) => {
                  const mTasks = filteredTasks.filter((t) => !t.parent_task_id && (t.milestone_id || null) === milestone.id);
                  if (mTasks.length === 0) return null;
                  const groupId = milestone.id || -1;
                  const isExpanded = expandedGroups[groupId] !== false; // default true

                  return (
                    <React.Fragment key={`milestone-${groupId}`}>
                      <TableRow sx={{ bgcolor: 'background.default', cursor: 'pointer' }} onClick={() => toggleGroup(groupId)}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            bgcolor: 'background.default',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          colSpan={10}
                          sx={{
                            position: 'sticky',
                            left: 40,
                            zIndex: 2,
                            bgcolor: 'background.default',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                              {milestone.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              {mTasks.length} Tasks
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                      {isExpanded && mTasks.map((task) => renderListTableRow(task, 0))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Task Creation Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Create New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Task Title"
            size="small"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Description"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="create-task-status-label">Status</InputLabel>
            <Select
              labelId="create-task-status-label"
              value={statusId}
              onChange={(e) => setStatusId(Number(e.target.value))}
              input={<OutlinedInput label="Status" />}
            >
              {activeStatuses.map((st) => (
                <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="create-task-milestone-label">Milestone (Optional)</InputLabel>
            <Select
              labelId="create-task-milestone-label"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value ? Number(e.target.value) : '')}
              input={<OutlinedInput label="Milestone (Optional)" />}
            >
              <MenuItem value=""><em>No Milestone (Unassigned)</em></MenuItem>
              {milestones.map((m) => (
                <MenuItem key={m.id} value={m.id}>🚩 {m.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              renderValue={(val) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Flag size={14} color={getPriorityFlagColor(val)} fill={getPriorityFlagColor(val)} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: getPriorityFlagColor(val) }}>
                    {val} Priority
                  </Typography>
                </Box>
              )}
            >
              <MenuItem value="URGENT">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#DC2626', fontWeight: 600 }}>
                  <Flag size={14} color="#DC2626" fill="#DC2626" /> Urgent
                </Box>
              </MenuItem>
              <MenuItem value="HIGH">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#EA580C', fontWeight: 600 }}>
                  <Flag size={14} color="#EA580C" fill="#EA580C" /> High
                </Box>
              </MenuItem>
              <MenuItem value="NORMAL">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#2563EB', fontWeight: 600 }}>
                  <Flag size={14} color="#2563EB" fill="#2563EB" /> Normal
                </Box>
              </MenuItem>
              <MenuItem value="LOW">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', fontWeight: 600 }}>
                  <Flag size={14} color="#64748B" fill="#64748B" /> Low
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="create-task-assignees-label">Task Assignees (Multiple)</InputLabel>
            <Select
              labelId="create-task-assignees-label"
              multiple
              value={assigneeIds}
              onChange={(e) => {
                const val = e.target.value;
                setAssigneeIds(typeof val === 'string' ? val.split(',').map(Number) : val);
              }}
              input={<OutlinedInput label="Task Assignees (Multiple)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => {
                    const u = users.find((usr) => usr.id === id);
                    return <Chip key={id} label={u?.full_name || `User #${id}`} size="small" />;
                  })}
                </Box>
              )}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox checked={assigneeIds.includes(u.id)} />
                  <ListItemText primary={u.full_name} secondary={u.role_name || u.email || 'User'} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="Start Time"
              type="time"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={time12To24(startTime)}
              onChange={(e) => setStartTime(e.target.value ? time24To12(e.target.value) : '')}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Due Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <TextField
              label="Due Time"
              type="time"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={time12To24(dueTime)}
              onChange={(e) => setDueTime(e.target.value ? time24To12(e.target.value) : '')}
            />
          </Box>
          <TextField
            label="Estimated Hours"
            type="number"
            size="small"
            fullWidth
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTask} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Slide-over Panel */}
      <TaskDetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        task={selectedTask}
      />
    </Box>
  );
}
