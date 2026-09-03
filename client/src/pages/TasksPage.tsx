import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Box,
  Button,
  Card,
  Chip,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
  Avatar,
  MenuItem,
  Select,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Plus,
  Search,
  Trash2,
  Clock,
  CheckSquare,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useToggleSubtaskMutation,
  useLogTimeMutation,
  useGetProjectsQuery,
  TaskItem,
} from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';

const COLUMNS: { id: number; label: string; color: string }[] = [
  { id: 1, label: 'To Do', color: '#64748B' },
  { id: 2, label: 'In Progress', color: '#2563EB' },
  { id: 3, label: 'In Review', color: '#D97706' },
  { id: 4, label: 'Done', color: '#16A34A' },
  { id: 5, label: 'Blocked', color: '#DC2626' },
];

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQ, setSearchQ] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [timeLogOpen, setTimeLogOpen] = useState(false);
  const [activeTaskForLog, setActiveTaskForLog] = useState<TaskItem | null>(null);
  
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const { showToast } = useToast();

  const { data: tasks = [], isLoading, isError, refetch } = useGetTasksQuery({
    project_id: selectedProjectId ? Number(selectedProjectId) : undefined,
    q: searchQ || undefined,
  });

  const { data: projects = [] } = useGetProjectsQuery();

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [toggleSubtask] = useToggleSubtaskMutation();
  const [logTime, { isLoading: isLogging }] = useLogTimeMutation();

  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('');

  // Time Log Form State
  const [loggedHours, setLoggedHours] = useState<number | ''>(1);
  const [logDesc, setLogDesc] = useState('');

  const handleCreateTask = async () => {
    if (!title.trim()) {
      showToast('Task title is required', 'error');
      return;
    }
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId ? Number(projectId) : undefined,
        priority,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours ? Number(estimatedHours) : 0,
        status_id: 1, // TODO
      }).unwrap();
      showToast('Task created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setProjectId('');
      setDueDate('');
      setEstimatedHours('');
    } catch {
      showToast('Could not create task', 'error');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = Number(draggableId);
    const newStatus = Number(destination.droppableId);

    try {
      await updateTask({ id: taskId, body: { status_id: newStatus } }).unwrap();
      showToast(`Task moved successfully`, 'success');
    } catch {
      showToast('Failed to update task status', 'error');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id).unwrap();
        showToast('Task deleted', 'success');
      } catch {
        showToast('Failed to delete task', 'error');
      }
    }
  };

  const handleToggleSubtask = async (subtaskId: number) => {
    try {
      await toggleSubtask(subtaskId).unwrap();
    } catch {
      showToast('Failed to update subtask', 'error');
    }
  };

  const handleLogTimeSubmit = async () => {
    if (!activeTaskForLog || !loggedHours || Number(loggedHours) <= 0) {
      showToast('Please enter valid hours', 'error');
      return;
    }
    try {
      await logTime({
        taskId: activeTaskForLog.id,
        hours: Number(loggedHours),
        log_date: new Date().toISOString().split('T')[0],
        description: logDesc || undefined,
      }).unwrap();
      showToast('Work hours logged successfully', 'success');
      setTimeLogOpen(false);
      setActiveTaskForLog(null);
      setLogDesc('');
    } catch {
      showToast('Failed to log work hours', 'error');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
            Task Board & Productivity
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Track project deliverables, drag-and-drop workflow status, checklists, and timesheets
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateOpen(true)}
            sx={{
              backgroundColor: '#04552B',
              '&:hover': { backgroundColor: '#034120' },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            New Task
          </Button>
        </Box>
      </Box>

      {/* Filter Controls */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: '12px', mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Filter by title or description..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          InputProps={{
            startAdornment: <Search size={16} style={{ marginRight: 8, color: '#64748B' }} />,
          }}
          sx={{ width: 280 }}
        />

        <Select
          size="small"
          displayEmpty
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value as number)}
          sx={{ width: 260 }}
        >
          <MenuItem value="">All Projects</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant={viewMode === 'board' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('board')}
            sx={viewMode === 'board' ? { backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' } } : { color: '#64748B' }}
          >
            Kanban Board
          </Button>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('list')}
            sx={viewMode === 'list' ? { backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' } } : { color: '#64748B' }}
          >
            List View
          </Button>
        </Box>
      </Paper>

      {/* Loading state */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#04552B' }} />
        </Box>
      ) : isError ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="error">Failed to load tasks</Typography>
          <Button onClick={() => refetch()} sx={{ mt: 1 }}>Retry</Button>
        </Box>
      ) : viewMode === 'board' ? (
        /* Drag-and-Drop Kanban Board */
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={2.5} alignItems="stretch">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status_id === col.id);
              return (
                <Grid item xs={12} sm={6} md={2.4} key={col.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      height: '100%',
                      minHeight: 500,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: col.color }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {col.label}
                        </Typography>
                      </Box>
                      <Chip label={colTasks.length} size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
                    </Box>

                    <Droppable droppableId={String(col.id)}>
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}
                        >
                          {colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(dragProvided) => (
                                <Card
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  elevation={0}
                                  sx={{
                                    p: 2,
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    backgroundColor: '#FFFFFF',
                                    cursor: 'pointer',
                                    '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.06)' },
                                  }}
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setPanelOpen(true);
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Chip
                                      label={task.priority}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        backgroundColor:
                                          task.priority === 'URGENT' ? '#FEE2E2' : task.priority === 'HIGH' ? '#FEF3C7' : '#E2E8F0',
                                        color:
                                          task.priority === 'URGENT' ? '#DC2626' : task.priority === 'HIGH' ? '#D97706' : '#475569',
                                      }}
                                    />
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} sx={{ color: '#94A3B8' }}>
                                      <Trash2 size={14} />
                                    </IconButton>
                                  </Box>

                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                                    {task.title}
                                  </Typography>

                                  {task.project_name && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                      <Briefcase size={12} style={{ color: '#64748B' }} />
                                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                                        {task.project_name}
                                      </Typography>
                                    </Box>
                                  )}

                                  {/* Subtasks Checklist */}
                                  {task.subtasks.length > 0 && (
                                    <Box sx={{ my: 1, pt: 1, borderTop: '1px border #F1F5F9' }}>
                                      {task.subtasks.map((st) => (
                                        <Box key={st.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Checkbox
                                            size="small"
                                            checked={st.is_completed}
                                            onChange={(e) => { e.stopPropagation(); handleToggleSubtask(st.id); }}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ p: 0.2 }}
                                          />
                                          <Typography
                                            variant="caption"
                                            sx={{ textDecoration: st.is_completed ? 'line-through' : 'none', color: st.is_completed ? '#94A3B8' : '#334155' }}
                                          >
                                            {st.title}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  )}

                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px solid #F8FAFC' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTaskForLog(task);
                                          setTimeLogOpen(true);
                                        }}
                                        title="Log hours"
                                        sx={{ color: '#04552B', p: 0.5 }}
                                      >
                                        <Clock size={14} />
                                      </IconButton>
                                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                                        {task.actual_hours}/{task.estimated_hours}h
                                      </Typography>
                                    </Box>
                                    <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: '#04552B' }}>
                                      {task.assignee_name ? task.assignee_name[0] : 'U'}
                                    </Avatar>
                                  </Box>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </DragDropContext>
      ) : (
        /* List View */
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', fontWeight: 700, color: '#475569' }}>
            <Box sx={{ flex: 3 }}>Task Title</Box>
            <Box sx={{ flex: 2 }}>Project</Box>
            <Box sx={{ flex: 1 }}>Status</Box>
            <Box sx={{ flex: 1 }}>Priority</Box>
            <Box sx={{ flex: 1 }}>Logged Hours</Box>
            <Box sx={{ width: 60, textAlign: 'right' }}>Actions</Box>
          </Box>

          {tasks.map((task) => (
            <Box 
              key={task.id} 
              sx={{ p: 2, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}
              onClick={() => {
                setSelectedTask(task);
                setPanelOpen(true);
              }}
            >
              <Box sx={{ flex: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                  {task.title}
                </Typography>
              </Box>
              <Box sx={{ flex: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  {task.project_name || 'General'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Chip label={`Status: ${task.status_id}`} size="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Chip label={task.priority} size="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {task.actual_hours} / {task.estimated_hours}h
                </Typography>
              </Box>
              <Box sx={{ width: 60, textAlign: 'right' }}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} sx={{ color: '#EF4444' }}>
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Paper>
      )}

      <TaskDetailPanel open={panelOpen} onClose={() => setPanelOpen(false)} task={selectedTask} />

      {/* New Task Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Task</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Task Title *"
              fullWidth
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inspect Vehicle Battery & Wiring"
            />

            <TextField
              label="Project"
              fullWidth
              size="small"
              select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">None (Standalone Task)</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Priority"
                  fullWidth
                  size="small"
                  select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <MenuItem value="URGENT">Urgent</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Estimated Hours"
                  type="number"
                  fullWidth
                  size="small"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : '')}
                />
              </Grid>
            </Grid>

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
              label="Description"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTask}
            disabled={isCreating}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' } }}
          >
            {isCreating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={timeLogOpen} onClose={() => setTimeLogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Timesheet Hours</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Task: <strong>{activeTaskForLog?.title}</strong>
            </Typography>
            <TextField
              label="Hours Worked *"
              type="number"
              fullWidth
              size="small"
              value={loggedHours}
              onChange={(e) => setLoggedHours(e.target.value ? Number(e.target.value) : '')}
            />
            <TextField
              label="Work Remarks / Log Note"
              fullWidth
              size="small"
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTimeLogOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleLogTimeSubmit}
            disabled={isLogging}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' } }}
          >
            {isLogging ? 'Logging...' : 'Save Log'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
