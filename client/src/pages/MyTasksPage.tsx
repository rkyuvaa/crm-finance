import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Stack,
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
  UserCheck,
  Briefcase,
  Upload,
} from 'lucide-react';

import UniversalImportModal from '@/components/ui/UniversalImportModal';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetProjectsQuery,
  useGetStatusDefinitionsQuery,
  TaskItem,
  TaskDependencyInfo,
} from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import { useAppSelector } from '@/app/hooks';

import TaskListView from '@/components/projects/TaskListView';
import TaskBoardView from '@/components/projects/TaskBoardView';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';
import TaskBulkActionBar from '@/components/projects/TaskBulkActionBar';

type ActiveView = 'list' | 'board';
type TaskScope = 'personal' | 'project';

export default function MyTasksPage() {
  const currentUser = useAppSelector((state) => state.auth.user);

  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [taskScope, setTaskScope] = useState<TaskScope>('personal');

  const [searchQ, setSearchQ] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedDep, setSelectedDep] = useState<TaskDependencyInfo | null>(null);

  const { showToast } = useToast();

  const { data: tasks = [], isLoading, isError, refetch } = useGetTasksQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: statuses = [] } = useGetStatusDefinitionsQuery();
  const { data: users = [] } = useUsersQuery();

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  // Create Personal Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');

  const handleCreatePersonalTask = async () => {
    if (!title.trim()) {
      showToast('Task title is mandatory', 'error');
      return;
    }
    try {
      // Personal task is NOT linked to any project (project_id = undefined)
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: undefined,
        priority,
        due_date: dueDate || undefined,
        estimated_minutes: estimatedHours ? Number(estimatedHours) * 60 : 0,
        assignees: assigneeId
          ? [{ user_id: Number(assigneeId) } as any]
          : currentUser
          ? [{ user_id: currentUser.id } as any]
          : [],
      } as any).unwrap();

      showToast('Personal task created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setEstimatedHours('');
      setAssigneeId('');
    } catch (err: any) {
      showToast(err?.data?.detail?.message || 'Could not create personal task', 'error');
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
    setSelectedDep(null);
    setPanelOpen(true);
  };

  const handleOpenDetailWithDep = (task: TaskItem, dep: TaskDependencyInfo) => {
    setSelectedTask(task);
    setSelectedDep(dep);
    setPanelOpen(true);
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  // Filter tasks based on Scope (Personal Tasks vs Project Tasks)
  const filteredTasks = safeTasks.filter((t) => {
    if (!t) return false;

    // Search Query Filter
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      const titleMatch = t.title?.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      const numMatch = t.task_number?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !numMatch) return false;
    }

    // Priority Filter
    if (selectedPriority && t.priority !== selectedPriority) return false;

    // User Assignment / Relation Check
    const isAssignee = Array.isArray(t.assignees) && t.assignees.some((a) => a && a.user_id === currentUser?.id);
    const isDirectAssignee = (t as any).assignee_id === currentUser?.id;
    const isCreator = (t as any).created_by_id === currentUser?.id || t.created_by === currentUser?.id;
    const isRelatedToUser = isAssignee || isDirectAssignee || isCreator;

    if (taskScope === 'personal') {
      // Personal Task: NOT linked to a project (project_id is null / undefined / 0) AND related to current user
      const isPersonal = !t.project_id || t.project_id === 0;
      return isPersonal && isRelatedToUser;
    } else {
      // Project Task: MUST be linked to a project (project_id != null && > 0) AND assigned/related to current user ONLY
      const isProjectTask = Boolean(t.project_id && t.project_id > 0);
      if (!isProjectTask || !isRelatedToUser) return false;

      // Project filter dropdown selection
      if (selectedProjectId && t.project_id !== Number(selectedProjectId)) {
        return false;
      }
      return true;
    }
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', minWidth: 0, px: 0, py: 0.5, boxSizing: 'border-box' }}>
      {/* Top Header & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
          Tasks
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Upload size={18} />}
            onClick={() => setImportDialogOpen(true)}
            sx={{
              borderColor: '#cbd5e1',
              color: '#334155',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              py: 1,
            }}
          >
            Import
          </Button>
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
      </Box>

      {/* Scope Toggle, View Switcher & Filters */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          {/* Scope Toggle: My Tasks (Personal) vs Projects Tasks */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, mr: 0.5 }}>
              SCOPE:
            </Typography>
            <Button
              variant={taskScope === 'personal' ? 'contained' : 'outlined'}
              onClick={() => setTaskScope('personal')}
              startIcon={<UserCheck size={16} />}
              sx={{
                bgcolor: taskScope === 'personal' ? '#04552B' : 'transparent',
                borderColor: '#04552B',
                color: taskScope === 'personal' ? '#fff' : '#04552B',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                height: 36,
                '&:hover': { bgcolor: taskScope === 'personal' ? '#034120' : 'rgba(4,85,43,0.08)' },
              }}
            >
              My Tasks
            </Button>
            <Button
              variant={taskScope === 'project' ? 'contained' : 'outlined'}
              onClick={() => setTaskScope('project')}
              startIcon={<Briefcase size={16} />}
              sx={{
                bgcolor: taskScope === 'project' ? '#04552B' : 'transparent',
                borderColor: '#04552B',
                color: taskScope === 'project' ? '#fff' : '#04552B',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                height: 36,
                '&:hover': { bgcolor: taskScope === 'project' ? '#034120' : 'rgba(4,85,43,0.08)' },
              }}
            >
              Projects Tasks
            </Button>
          </Stack>

          {/* View Switcher: List View & Kanban View */}
          <Tabs
            value={activeView}
            onChange={(_, val) => setActiveView(val)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 14,
                minHeight: 40,
              },
              '& .Mui-selected': { color: '#04552B' },
              '& .MuiTabs-indicator': { bgcolor: '#04552B', height: 3 },
            }}
          >
            <Tab value="list" label="List View" icon={<List size={16} />} iconPosition="start" />
            <Tab value="board" label="Kanban View" icon={<LayoutGrid size={16} />} iconPosition="start" />
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
            sx={{ width: 280, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', height: 36 } }}
          />

          {/* Project Filter (only shown in Projects Tasks scope) */}
          {taskScope === 'project' && (
            <Select
              size="small"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value as any)}
              displayEmpty
              sx={{ minWidth: 180, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
            >
              <MenuItem value="">All Projects</MenuItem>
              {safeProjects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          )}

          {/* Priority Filter */}
          <Select
            size="small"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            displayEmpty
            sx={{ minWidth: 150, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
          >
            <MenuItem value="">All Priorities</MenuItem>
            <MenuItem value="URGENT">Urgent</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
          </Select>
        </Box>
      </Paper>

      {/* Main View Area */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="success" size={32} />
        </Box>
      ) : isError ? (
        <Paper sx={{ p: 4, textStyle: 'center', color: 'error.main' }}>
          Error loading tasks. Please refresh.
        </Paper>
      ) : activeView === 'list' ? (
        <TaskListView
          tasks={filteredTasks}
          selectedTaskIds={selectedTaskIds}
          onToggleSelectTask={handleToggleSelectTask}
          onSelectAllTasks={handleSelectAllTasks}
          onOpenTaskDetail={handleOpenDetail}
          onOpenTaskDetailWithDep={handleOpenDetailWithDep}
          onDeleteTask={handleDeleteTask}
        />
      ) : (
        <TaskBoardView
          tasks={filteredTasks}
          onOpenTaskDetail={handleOpenDetail}
          onDeleteTask={handleDeleteTask}
          onQuickCreateTask={() => setCreateOpen(true)}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedTaskIds.length > 0 && (
        <TaskBulkActionBar
          selectedIds={selectedTaskIds}
          onClearSelection={() => setSelectedTaskIds([])}
          onSuccess={() => {
            setSelectedTaskIds([]);
            refetch();
          }}
        />
      )}

      {/* Task Detail Slide-over Panel */}
      {selectedTask && (
        <TaskDetailPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          task={selectedTask}
          highlightDependency={selectedDep}
        />
      )}

      {/* Create Personal Task Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0F172A' }}>
          Create Personal Task
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Task Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
              required
              autoFocus
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Select
                size="small"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                displayEmpty
              >
                <MenuItem value="URGENT">Urgent</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </Select>

              <TextField
                label="Due Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Estimated Hours"
                type="number"
                size="small"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : '')}
              />

              <Select
                size="small"
                value={assigneeId || (currentUser ? currentUser.id : '')}
                onChange={(e) => setAssigneeId(e.target.value as any)}
                displayEmpty
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.full_name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isCreating}
            onClick={handleCreatePersonalTask}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            {isCreating ? <CircularProgress size={20} color="inherit" /> : 'Create Personal Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Universal Import Modal */}
      <UniversalImportModal
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        entityType="TASK"
        title="Import Personal / Project Tasks"
        sampleHeaders={['title', 'description', 'priority', 'due_date', 'estimated_minutes']}
        onSuccess={() => refetch()}
      />
    </Box>
  );
}
