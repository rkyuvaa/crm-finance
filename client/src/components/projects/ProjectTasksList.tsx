import React, { useState } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Tooltip,
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
  Paperclip,
  Lock,
  Zap,
} from 'lucide-react';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useGetStatusDefinitionsQuery,
  TaskItem,
} from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';

interface ProjectTasksListProps {
  projectId: string;
}

export default function ProjectTasksList({ projectId }: ProjectTasksListProps) {
  const toast = useToast();
  const numericProjectId = Number(projectId);

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQ, setSearchQ] = useState('');
  const [quickTaskInputs, setQuickTaskInputs] = useState<Record<number, string>>({});

  const { data: tasks = [], isLoading } = useGetTasksQuery({
    project_id: numericProjectId,
    q: searchQ || undefined,
  });

  const { data: statusDefs = [] } = useGetStatusDefinitionsQuery();
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

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
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(0);

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

  const openTask = (task: TaskItem) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const handleOpenCreateModal = (defaultStatusId: number = 1) => {
    setTitle('');
    setDescription('');
    setStatusId(defaultStatusId);
    setPriority('NORMAL');
    setDueDate('');
    setEstimatedHours(0);
    setCreateOpen(true);
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
      toast.showError(err?.data?.detail || 'Failed to create task');
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
      toast.showError('Failed to update task status');
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
        priority,
        due_date: dueDate || undefined,
        estimated_hours: Number(estimatedHours) || 0,
      }).unwrap();
      toast.showSuccess(`Task "${title}" created successfully!`);
      setCreateOpen(false);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create task');
    }
  };

  const getPriorityFlagColor = (p: string) => {
    switch (p) {
      case 'URGENT': return '#DC2626';
      case 'HIGH': return '#D97706';
      case 'NORMAL': return '#2563EB';
      case 'LOW': return '#64748B';
      default: return '#64748B';
    }
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
            <ToggleButton value="board">
              <LayoutGrid size={14} style={{ marginRight: 6 }} /> Board
            </ToggleButton>
            <ToggleButton value="list">
              <ListIcon size={14} style={{ marginRight: 6 }} /> List
            </ToggleButton>
          </ToggleButtonGroup>

          <Chip label="Group: Status" size="small" variant="outlined" sx={{ height: 26, fontSize: 11, fontWeight: 600 }} />
        </Box>

        {/* Right Search & Add Task Action */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            const statusTasks = tasks.filter((t) => (t.status_id || 1) === st.id);

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
                      const completedSubtasks = task.subtasks?.filter((s) => s.is_completed).length || 0;
                      const totalSubtasks = task.subtasks?.length || 0;

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
                              transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          {/* Task Title */}
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5, lineHeight: 1.4 }}>
                            {task.title}
                          </Typography>

                          {/* Subtasks / Dependencies Progress indicator if present */}
                          {totalSubtasks > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
                              <CheckSquare size={13} color="#64748B" />
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 11 }}>
                                {completedSubtasks}/{totalSubtasks} subtasks
                              </Typography>
                            </Box>
                          )}

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
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell width={40}></TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} width={150}>Assignee</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} width={150}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} width={120}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} width={140}>Tracked Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
              ) : (
                activeStatuses.map((status) => {
                  const statusTasks = tasks.filter((t) => (t.status_id || 1) === status.id);
                  if (statusTasks.length === 0) return null;
                  const isExpanded = expandedGroups[status.id];

                  return (
                    <React.Fragment key={status.id}>
                      {/* Group Header */}
                      <TableRow sx={{ bgcolor: 'background.default', cursor: 'pointer' }} onClick={() => toggleGroup(status.id)}>
                        <TableCell>
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell colSpan={5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={status.name} size="small" sx={{ bgcolor: status.color, color: 'white', fontWeight: 600, height: 20, fontSize: '0.7rem' }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{statusTasks.length} Tasks</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Tasks */}
                      {isExpanded && statusTasks.map((task) => (
                        <TableRow 
                          key={task.id} 
                          hover 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openTask(task)}
                        >
                          <TableCell align="center">
                            <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: `2px solid ${status.color}`, margin: 'auto' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{task.title}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: '#04552B', color: '#FFFFFF', fontWeight: 700 }}>
                                {task.assignee_name?.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2">{task.assignee_name || 'Unassigned'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: task.due_date ? 'text.primary' : 'text.secondary' }}>
                              <Calendar size={14} />
                              <Typography variant="body2">{task.due_date || 'None'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <Flag size={14} color={getPriorityFlagColor(task.priority)} fill={getPriorityFlagColor(task.priority)} />
                              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: getPriorityFlagColor(task.priority) }}>
                                {task.priority}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                              {task.actual_hours}h / {task.estimated_hours}h
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Task Drawer Panel */}
      <TaskDetailPanel open={panelOpen} onClose={() => setPanelOpen(false)} task={selectedTask} />

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Create New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Task Title"
            fullWidth
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design User Interface Mockups"
            autoFocus
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task requirements and details..."
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusId}
              label="Status"
              onChange={(e) => setStatusId(Number(e.target.value))}
            >
              {activeStatuses.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="NORMAL">Normal</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Due Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <TextField
            label="Estimated Hours"
            type="number"
            fullWidth
            size="small"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={isCreating} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTask}
            variant="contained"
            disabled={isCreating}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontWeight: 600 }}
          >
            {isCreating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
