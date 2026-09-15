import React, { useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { Plus, Search, Upload } from 'lucide-react';
import UniversalImportModal from '@/components/ui/UniversalImportModal';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useGetProjectsQuery,
  TaskItem,
} from '@/api/projectsApi';
import { useCostCentersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import { useAppSelector } from '@/app/hooks';

import MyTasksView from '@/components/projects/MyTasksView';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';

export default function MyTasksPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [searchQ, setSearchQ] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<number | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const { showToast } = useToast();

  const { data: tasks = [], isLoading, isError, refetch } = useGetTasksQuery({
    project_id: selectedProjectId ? Number(selectedProjectId) : undefined,
    priority: selectedPriority || undefined,
    q: searchQ || undefined,
  });

  const { data: projects = [] } = useGetProjectsQuery();
  const { data: costCenters = [] } = useCostCentersQuery();

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();

  // Create Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [costCenterId, setCostCenterId] = useState<number | ''>('');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('');

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
        assignees: currentUser ? [{ user_id: currentUser.id }] : [],
      } as any).unwrap();
      showToast('Task created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setProjectId('');
      setCostCenterId('');
      setDueDate('');
      setEstimatedHours('');
    } catch (err: any) {
      showToast(err?.data?.detail?.message || 'Could not create task', 'error');
    }
  };

  const handleOpenDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCostCenters = Array.isArray(costCenters) ? costCenters : [];

  // Filter tasks specifically for current user
  const myFilteredTasks = (selectedCostCenterId
    ? safeTasks.filter((t) => t && t.cost_center_id === Number(selectedCostCenterId))
    : safeTasks
  ).filter((t) => {
    if (!t) return false;
    if (!currentUser) return true;
    const isAssignee = Array.isArray(t.assignees) && t.assignees.some((a) => a && a.user_id === currentUser.id);
    const isDirectAssignee = (t as any).assignee_id === currentUser.id;
    const isCreator = t.created_by_id === currentUser.id;
    return isAssignee || isDirectAssignee || isCreator;
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', minWidth: 0, px: 0, py: 0.5, boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
          My Tasks
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

      {/* Filter Bar */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 3, p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
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
            {safeProjects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            displayEmpty
            value={selectedCostCenterId}
            onChange={(e) => setSelectedCostCenterId(e.target.value as number)}
            sx={{ width: 200, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
          >
            <MenuItem value="">All Cost Centers</MenuItem>
            {safeCostCenters.map((cc) => (
              <MenuItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</MenuItem>
            ))}
          </Select>

          <Select
            size="small"
            displayEmpty
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as string)}
            sx={{ width: 160, height: 36, bgcolor: 'background.paper', fontSize: 13 }}
          >
            <MenuItem value="">All Priorities</MenuItem>
            <MenuItem value="URGENT">Urgent</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
          </Select>
        </Box>
      </Paper>

      {/* Main View */}
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
        <MyTasksView tasks={myFilteredTasks} onOpenTaskDetail={handleOpenDetail} />
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanel open={panelOpen} onClose={() => setPanelOpen(false)} task={selectedTask} />

      {/* Universal Import Modal */}
      <UniversalImportModal
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        entityType="tasks"
        entityDisplayName="Tasks"
        onImportSuccess={() => refetch()}
      />

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Task</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Task Title"
              required
              fullWidth
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Select
              size="small"
              displayEmpty
              value={projectId}
              onChange={(e) => setProjectId(e.target.value as number)}
              fullWidth
            >
              <MenuItem value="">Select Project</MenuItem>
              {safeProjects.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              displayEmpty
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value as number)}
              fullWidth
            >
              <MenuItem value="">Select Cost Center</MenuItem>
              {safeCostCenters.map((cc) => (
                <MenuItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              fullWidth
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
              fullWidth
            />
            <TextField
              label="Estimated Hours"
              type="number"
              size="small"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : '')}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleCreateTask}
              disabled={isCreating}
              sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, mt: 1, py: 1 }}
            >
              {isCreating ? <CircularProgress size={24} color="inherit" /> : 'Create Task'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
