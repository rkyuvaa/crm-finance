import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  LinearProgress,
} from '@mui/material';
import { Plus, Flag, Trash2, Edit2, ChevronDown, ChevronRight, CheckCircle2, Circle, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';
import {
  useGetProjectMilestonesQuery,
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
  useDeleteProjectMilestoneMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,
  TaskItem,
} from '@/api/projectsApi';

interface ProjectMilestonesListProps {
  projectId: string;
}

export default function ProjectMilestonesList({ projectId }: ProjectMilestonesListProps) {
  const { showToast } = useToast();
  const numericProjectId = Number(projectId);

  const { data: milestones = [], isLoading } = useGetProjectMilestonesQuery(numericProjectId, {
    skip: !numericProjectId || isNaN(numericProjectId),
  });

  const { data: tasks = [] } = useGetTasksQuery({ project_id: numericProjectId }, {
    skip: !numericProjectId || isNaN(numericProjectId),
  });

  const [createMilestone] = useCreateProjectMilestoneMutation();
  const [updateMilestone] = useUpdateProjectMilestoneMutation();
  const [deleteMilestoneMutation] = useDeleteProjectMilestoneMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [createTask] = useCreateTaskMutation();

  // Create Milestone State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Milestone State
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Expandable Tasks state
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});

  // Quick Task Creation under milestone
  const [quickTaskTitles, setQuickTaskTitles] = useState<Record<number, string>>({});

  const toggleExpand = (id: number) => {
    setExpandedMilestones((prev) => ({ ...prev, [id]: prev[id] === undefined ? true : !prev[id] }));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showToast('Milestone title is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createMilestone({
        projectId: numericProjectId,
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
        },
      }).unwrap();
      showToast('Milestone created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
    } catch {
      showToast('Failed to create milestone', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (m: any) => {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDescription(m.description || '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await updateMilestone({
        id: editingId,
        body: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
        },
      }).unwrap();
      showToast('Milestone updated', 'success');
      setEditOpen(false);
    } catch {
      showToast('Failed to update milestone', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMilestone = async (id: number) => {
    if (confirm('Are you sure you want to delete this milestone? Associated tasks will be unassigned.')) {
      try {
        await deleteMilestoneMutation(id).unwrap();
        showToast('Milestone deleted', 'info');
      } catch {
        showToast('Failed to delete milestone', 'error');
      }
    }
  };

  const handleAssignTaskToMilestone = async (taskId: number, milestoneId: number | null) => {
    try {
      await updateTask({ id: taskId, body: { milestone_id: milestoneId as any } }).unwrap();
      showToast(milestoneId ? 'Task assigned to milestone' : 'Task unassigned from milestone', 'success');
    } catch {
      showToast('Failed to update task milestone', 'error');
    }
  };

  const handleQuickCreateMilestoneTask = async (milestoneId: number) => {
    const taskTitle = quickTaskTitles[milestoneId]?.trim();
    if (!taskTitle) return;
    try {
      await createTask({
        title: taskTitle,
        project_id: numericProjectId,
        milestone_id: milestoneId,
        status_id: 1,
        priority: 'NORMAL',
      }).unwrap();
      setQuickTaskTitles((prev) => ({ ...prev, [milestoneId]: '' }));
      showToast(`Task "${taskTitle}" created under milestone!`, 'success');
    } catch {
      showToast('Failed to create task', 'error');
    }
  };

  const unassignedTasks = tasks.filter((t) => !t.parent_task_id && !t.milestone_id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Overall Milestone Summary */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Project Milestones ({milestones.length})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Configure as many deliverables and release targets as required for this project
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', fontWeight: 600 }}
          >
            Add Milestone
          </Button>
        </Box>
      </Paper>

      {/* Milestones List / Empty State / Loading */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : milestones.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper',
          }}
        >
          <Flag size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
            No Milestones Configured Yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2.5 }}>
            Create custom milestones to group project tasks, track target dates, and aggregate costs.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            sx={{ color: '#04552B', borderColor: '#04552B', textTransform: 'none', fontWeight: 600 }}
          >
            Create First Milestone
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {milestones.map((m) => {
            const milestoneTasks = tasks.filter((t) => t.milestone_id === m.id);
            const isExpanded = expandedMilestones[m.id] !== false; // default open
            const completedTaskCount = milestoneTasks.filter((t) => t.is_completed).length;
            const progressPct = milestoneTasks.length > 0 ? Math.round((completedTaskCount / milestoneTasks.length) * 100) : 0;

            return (
              <Paper
                key={m.id}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                }}
              >
                {/* Milestone Card Header */}
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: '#F8FAFC',
                    borderBottom: isExpanded ? '1px solid' : 'none',
                    borderColor: 'divider',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '1 1 240px' }}>
                    <IconButton size="small" onClick={() => toggleExpand(m.id)}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </IconButton>
                    <Flag size={20} color="#04552B" fill="#04552B" />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {m.title}
                        </Typography>
                        <Chip
                          label={`${completedTaskCount}/${milestoneTasks.length} Tasks`}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#E2E8F0', color: '#334155' }}
                        />
                      </Box>
                      {m.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: 13 }}>
                          {m.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Progress Bar (0 to 100%) */}
                    <Box sx={{ minWidth: 160, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                          Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#04552B', fontSize: '0.75rem' }}>
                          {progressPct}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressPct}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#E2E8F0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#04552B',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>

                    <IconButton size="small" onClick={() => handleOpenEdit(m)} sx={{ color: '#475569' }}>
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteMilestone(m.id)} sx={{ color: '#EF4444' }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Collapsible Configured Tasks Section */}
                <Collapse in={isExpanded} timeout="auto">
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Configured Tasks under this Milestone ({milestoneTasks.length})
                    </Typography>

                    {milestoneTasks.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', py: 1 }}>
                        No tasks assigned to this milestone yet. Use the dropdown below to assign existing tasks or quick-add a new task.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {milestoneTasks.map((t) => (
                          <Paper
                            key={t.id}
                            variant="outlined"
                            sx={{
                              p: 1.25,
                              px: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justify: 'space-between',
                              borderRadius: '6px',
                              bgcolor: t.is_completed ? '#F8FAFC' : 'background.paper',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {t.is_completed ? (
                                <CheckCircle2 size={16} color="#16A34A" />
                              ) : (
                                <Circle size={16} color="#64748B" />
                              )}
                              <Chip
                                label={t.task_number ? t.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${t.id}`}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}
                              />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: t.is_completed ? 'text.secondary' : 'text.primary', textDecoration: t.is_completed ? 'line-through' : 'none' }}>
                                {t.title}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {t.status_name && (
                                <Chip label={t.status_name} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: t.status_color || '#64748B', color: '#FFF' }} />
                              )}
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                {t.start_date || '—'} → {t.due_date || '—'}
                              </Typography>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleAssignTaskToMilestone(t.id, null)}
                                sx={{ textTransform: 'none', fontSize: 11 }}
                              >
                                Unassign
                              </Button>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    )}

                    {/* Controls to assign or create task under this milestone */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Attach Unassigned Task */}
                      {unassignedTasks.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 240 }}>
                          <InputLabel id={`attach-task-${m.id}-label`}>+ Attach Existing Task</InputLabel>
                          <Select
                            labelId={`attach-task-${m.id}-label`}
                            value=""
                            label="+ Attach Existing Task"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignTaskToMilestone(Number(e.target.value), m.id);
                              }
                            }}
                            sx={{ height: 32, fontSize: 12 }}
                          >
                            <MenuItem value=""><em>Select Unassigned Task</em></MenuItem>
                            {unassignedTasks.map((ut) => (
                              <MenuItem key={ut.id} value={ut.id}>
                                {ut.task_number ? ut.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${ut.id}`}: {ut.title}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Quick Add Task input */}
                      <TextField
                        placeholder="+ Add Task to Milestone (Press Enter)"
                        size="small"
                        value={quickTaskTitles[m.id] || ''}
                        onChange={(e) => setQuickTaskTitles((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickCreateMilestoneTask(m.id);
                        }}
                        sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { height: 32, fontSize: 12 } }}
                      />
                    </Box>
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Milestone</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Milestone Title *"
              fullWidth
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={isSubmitting} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Milestone</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Milestone Title *"
              fullWidth
              size="small"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={isSubmitting} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
