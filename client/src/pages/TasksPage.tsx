import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  GanttChartSquare,
  UserCheck,
  Users,
  Filter,
} from 'lucide-react';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetProjectsQuery,
  useGetStatusDefinitionsQuery,
  TaskItem,
} from '@/api/projectsApi';
import { useCostCentersQuery, useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';

import TaskListView from '@/components/projects/TaskListView';
import TaskBoardView from '@/components/projects/TaskBoardView';
import TaskCalendarView from '@/components/projects/TaskCalendarView';
import TaskGanttView from '@/components/projects/TaskGanttView';
import MyTasksView from '@/components/projects/MyTasksView';
import TeamWorkloadView from '@/components/projects/TeamWorkloadView';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';
import TaskBulkActionBar from '@/components/projects/TaskBulkActionBar';

type ActiveView = 'list' | 'board' | 'calendar' | 'gantt' | 'mytasks' | 'workload';

export default function TasksPage() {
  const [activeView, setActiveView] = useState<ActiveView>('board');
  const [searchQ, setSearchQ] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedStatusId, setSelectedStatusId] = useState<number | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<number | ''>('');

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const { showToast } = useToast();

  const { data: tasks = [], isLoading, isError, refetch } = useGetTasksQuery({
    project_id: selectedProjectId ? Number(selectedProjectId) : undefined,
    status: selectedStatusId ? String(selectedStatusId) : undefined,
    priority: selectedPriority || undefined,
    q: searchQ || undefined,
  });

  const { data: projects = [] } = useGetProjectsQuery();
  const { data: costCenters = [] } = useCostCentersQuery();
  const { data: statuses = [] } = useGetStatusDefinitionsQuery();
  const { data: users = [] } = useUsersQuery();

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  // Create Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [costCenterId, setCostCenterId] = useState<number | ''>('');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');

  const handleCreateTask = async () => {
    if (!title.trim()) {
      showToast('Task title is mandatory', 'error');
      return;
    }
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId ? Number(projectId) : undefined,
        cost_center_id: costCenterId ? Number(costCenterId) : undefined,
        priority,
        due_date: dueDate || undefined,
        estimated_minutes: estimatedHours ? Number(estimatedHours) * 60 : 0,
        assignees: assigneeId ? [{ user_id: Number(assigneeId) } as any] : [],
      } as any).unwrap();
      showToast('Task created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setProjectId('');
      setCostCenterId('');
      setDueDate('');
      setEstimatedHours('');
      setAssigneeId('');
    } catch (err: any) {
      showToast(err?.data?.detail?.message || 'Could not create task', 'error');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id).unwrap();
        showToast('Task deleted', 'info');
      } catch {
        showToast('Failed to delete task', 'error');
      }
    }
  };

  const handleToggleSelectTask = (id: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTasks = (ids: number[]) => {
    setSelectedTaskIds(ids);
  };

  const handleOpenDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  // Filter tasks locally by Cost Center if selected
  const filteredTasks = selectedCostCenterId
    ? tasks.filter((t) => t.cost_center_id === Number(selectedCostCenterId))
    : tasks;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
            Enterprise Task Management & Workflows
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            ClickUp-inspired task execution module with multi-level subtasks, stopwatch timers, cost centers, & custom fields
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setCreateOpen(true)}
          sx={{
            bgcolor: '#04552B',
            '&:hover': { bgcolor: '#034120' },
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 700,
            px: 2.5,
            py: 1,
          }}
        >
          New Task
        </Button>
      </Box>

      {/* Navigation View Switcher Tabs & Filters */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, pt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Tabs
            value={activeView}
            onChange={(_, val) => setActiveView(val)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 14,
                minHeight: 48,
              },
              '& .Mui-selected': { color: '#04552B' },
              '& .MuiTabs-indicator': { bgcolor: '#04552B', height: 3 },
            }}
          >
            <Tab value="board" label="Board View" icon={<LayoutGrid size={16} />} iconPosition="start" />
            <Tab value="list" label="List View" icon={<List size={16} />} iconPosition="start" />
            <Tab value="calendar" label="Calendar" icon={<CalendarIcon size={16} />} iconPosition="start" />
            <Tab value="gantt" label="Gantt Chart" icon={<GanttChartSquare size={16} />} iconPosition="start" />
            <Tab value="mytasks" label="My Tasks" icon={<UserCheck size={16} />} iconPosition="start" />
            <Tab value="workload" label="Team Workload" icon={<Users size={16} />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Global Filter Bar */}
        <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.default' }}>
          <TextField
            size="small"
            placeholder="Search by ID, title, description..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.6 }} />,
            }}
            sx={{ width: 260, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', height: 36 } }}
          />

          <Select
            size="small"
            displayEmpty
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value as number)}
            sx={{ width: 220, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
          >
            <MenuItem value="">All Projects</MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            displayEmpty
            value={selectedCostCenterId}
            onChange={(e) => setSelectedCostCenterId(e.target.value as number)}
            sx={{ width: 220, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
          >
            <MenuItem value="">All Cost Centers</MenuItem>
            {costCenters.map((cc) => (
              <MenuItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            displayEmpty
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as string)}
            sx={{ width: 150, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
          >
            <MenuItem value="">All Priorities</MenuItem>
            <MenuItem value="URGENT">Urgent</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
          </Select>
        </Box>
      </Paper>

      {/* Main Content View Container */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={40} sx={{ color: '#04552B' }} />
        </Box>
      ) : isError ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="error">Failed to load tasks</Typography>
          <Button onClick={() => refetch()} sx={{ mt: 1 }}>Retry</Button>
        </Box>
      ) : (
        <>
          {activeView === 'board' && (
            <TaskBoardView
              tasks={filteredTasks}
              onOpenTaskDetail={handleOpenDetail}
              onDeleteTask={handleDeleteTask}
              onQuickCreateTask={() => setCreateOpen(true)}
            />
          )}

          {activeView === 'list' && (
            <TaskListView
              tasks={filteredTasks}
              selectedTaskIds={selectedTaskIds}
              onToggleSelectTask={handleToggleSelectTask}
              onSelectAllTasks={handleSelectAllTasks}
              onOpenTaskDetail={handleOpenDetail}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeView === 'calendar' && (
            <TaskCalendarView tasks={filteredTasks} onOpenTaskDetail={handleOpenDetail} />
          )}

          {activeView === 'gantt' && (
            <TaskGanttView tasks={filteredTasks} onOpenTaskDetail={handleOpenDetail} />
          )}

          {activeView === 'mytasks' && (
            <MyTasksView tasks={filteredTasks} onOpenTaskDetail={handleOpenDetail} />
          )}

          {activeView === 'workload' && (
            <TeamWorkloadView tasks={filteredTasks} />
          )}
        </>
      )}

      {/* Detail Drawer */}
      <TaskDetailPanel open={panelOpen} onClose={() => setPanelOpen(false)} task={selectedTask} />

      {/* Bulk Action Toolbar */}
      <TaskBulkActionBar
        selectedCount={selectedTaskIds.length}
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
      />

      {/* Create Task Dialog */}
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
              placeholder="e.g. Server Migration & DB Indexing"
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Project"
                  fullWidth
                  size="small"
                  select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">Standalone Task</MenuItem>
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Cost Center (Master Data)"
                  fullWidth
                  size="small"
                  select
                  value={costCenterId}
                  onChange={(e) => setCostCenterId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">None</MenuItem>
                  {costCenters.map((cc) => (
                    <MenuItem key={cc.id} value={cc.id}>{cc.code} ({cc.name})</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

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
                  label="Assignee"
                  fullWidth
                  size="small"
                  select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
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
              <Grid item xs={6}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Grid>
            </Grid>

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
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateTask}
            disabled={isCreating}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            {isCreating ? 'Creating...' : 'Save Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
