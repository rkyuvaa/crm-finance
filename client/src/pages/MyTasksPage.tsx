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
} from 'lucide-react';

import {
  useGetPersonalTasksQuery,
  useCreatePersonalTaskMutation,
  useDeletePersonalTaskMutation,
  TaskItem,
} from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

import PersonalTaskListView from '@/components/projects/PersonalTaskListView';
import PersonalTaskBoardView from '@/components/projects/PersonalTaskBoardView';
import PersonalTaskDetailPanel from '@/components/projects/PersonalTaskDetailPanel';

type ActiveView = 'list' | 'board';

export default function MyTasksPage() {
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [searchQ, setSearchQ] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const { showToast } = useToast();

  const { data: tasks = [], isLoading, isError } = useGetPersonalTasksQuery();
  const [createTask, { isLoading: isCreating }] = useCreatePersonalTaskMutation();
  const [deleteTask] = useDeletePersonalTaskMutation();

  // Create Personal Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>('');

  const handleCreatePersonalTask = async () => {
    if (!title.trim()) {
      showToast('Task title is mandatory', 'error');
      return;
    }
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours ? Number(estimatedHours) : 0,
      }).unwrap();

      showToast('Personal task created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setEstimatedHours('');
      setPriority('NORMAL');
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
    setPanelOpen(true);
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = safeTasks.filter((t) => {
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      const titleMatch = t.title?.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }
    if (selectedPriority && t.priority !== selectedPriority) return false;
    return true;
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 'none', minWidth: 0, px: 0, py: 0.5, boxSizing: 'border-box' }}>
      {/* Top Header & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
            My Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your personal daily planner. These tasks are strictly private to you.
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

      {/* View Switcher & Filters */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Tabs
            value={activeView}
            onChange={(_, val) => setActiveView(val)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 14, minHeight: 40 },
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
            placeholder="Search tasks..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.6 }} /> }}
            sx={{ width: 280, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', height: 36 } }}
          />
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
        <Paper sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
          Error loading personal tasks. Please refresh.
        </Paper>
      ) : activeView === 'list' ? (
        <PersonalTaskListView
          tasks={filteredTasks}
          selectedTaskIds={selectedTaskIds}
          onToggleSelectTask={handleToggleSelectTask}
          onSelectAllTasks={handleSelectAllTasks}
          onOpenTaskDetail={handleOpenDetail}
          onDeleteTask={handleDeleteTask}
        />
      ) : (
        <PersonalTaskBoardView
          tasks={filteredTasks}
          onOpenTaskDetail={handleOpenDetail}
          onDeleteTask={handleDeleteTask}
          onQuickCreateTask={() => setCreateOpen(true)}
        />
      )}

      {/* Task Detail Slide-over Panel */}
      {selectedTask && (
        <PersonalTaskDetailPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          task={selectedTask}
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
    </Box>
  );
}
