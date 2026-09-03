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
} from '@mui/material';
import { ChevronDown, ChevronRight, Plus, Calendar } from 'lucide-react';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
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
  const { data: tasks = [], isLoading } = useGetTasksQuery({ project_id: numericProjectId });
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    1: true, // TODO
    2: true, // IN_PROGRESS
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

  const toggleGroup = (statusIdVal: number) => {
    setExpandedGroups((prev) => ({ ...prev, [statusIdVal]: !prev[statusIdVal] }));
  };

  const openTask = (task: TaskItem) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const handleOpenCreateModal = () => {
    setTitle('');
    setDescription('');
    setStatusId(1);
    setPriority('NORMAL');
    setDueDate('');
    setEstimatedHours(0);
    setCreateOpen(true);
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

  const statuses = [
    { id: 1, label: 'To Do', color: '#64748B', bg: '#F1F5F9' },
    { id: 2, label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
    { id: 3, label: 'In Review', color: '#D97706', bg: '#FEF3C7' },
    { id: 4, label: 'Done', color: '#16A34A', bg: '#F0FDF4' },
    { id: 5, label: 'Blocked', color: '#DC2626', bg: '#FEF2F2' },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#0F172A' }}>Tasks</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={handleOpenCreateModal}
          sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 32, textTransform: 'none', fontWeight: 600 }}
        >
          Add Task
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={150}>Assignee</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={150}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={120}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={120}>Tracked Time</TableCell>
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
                    onClick={handleOpenCreateModal}
                    sx={{ textTransform: 'none', color: '#04552B', borderColor: '#04552B' }}
                  >
                    Create First Task
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              statuses.map((status) => {
                const statusTasks = tasks.filter((t) => t.status_id === status.id);
                if (statusTasks.length === 0) return null;
                const isExpanded = expandedGroups[status.id];

                return (
                  <React.Fragment key={status.id}>
                    {/* Group Header */}
                    <TableRow sx={{ bgcolor: status.bg, cursor: 'pointer', '&:hover': { bgcolor: status.bg } }} onClick={() => toggleGroup(status.id)}>
                      <TableCell>
                        <IconButton size="small">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </IconButton>
                      </TableCell>
                      <TableCell colSpan={5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={status.label} size="small" sx={{ bgcolor: status.color, color: 'white', fontWeight: 600, height: 20, fontSize: '0.7rem' }} />
                          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>{statusTasks.length} Tasks</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Tasks */}
                    {isExpanded && statusTasks.map((task) => (
                      <TableRow 
                        key={task.id} 
                        hover 
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}
                        onClick={() => openTask(task)}
                      >
                        <TableCell align="center">
                          <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: `2px solid ${status.color}`, margin: 'auto' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#0F172A' }}>{task.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: '#E2E8F0', color: '#475569' }}>
                              {task.assignee_name?.charAt(0) || '?'}
                            </Avatar>
                            <Typography variant="body2">{task.assignee_name || 'Unassigned'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: task.due_date ? '#475569' : '#94A3B8' }}>
                            <Calendar size={14} />
                            <Typography variant="body2">{task.due_date || 'None'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={task.priority} 
                            size="small" 
                            sx={{ 
                              height: 20, fontSize: '0.7rem', fontWeight: 600,
                              bgcolor: task.priority === 'URGENT' ? '#FEE2E2' : task.priority === 'HIGH' ? '#FEF3C7' : '#F1F5F9',
                              color: task.priority === 'URGENT' ? '#DC2626' : task.priority === 'HIGH' ? '#D97706' : '#64748B'
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748B' }}>
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
              {statuses.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
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
