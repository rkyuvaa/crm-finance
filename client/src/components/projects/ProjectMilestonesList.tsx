import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Checkbox,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Plus, Flag, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';
import {
  useGetProjectMilestonesQuery,
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
  useDeleteProjectMilestoneMutation,
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

  const [createMilestone] = useCreateProjectMilestoneMutation();
  const [updateMilestone] = useUpdateProjectMilestoneMutation();
  const [deleteMilestoneMutation] = useDeleteProjectMilestoneMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedCount = milestones.filter((m) => m.is_completed).length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const handleToggleMilestone = async (id: number, currentStatus: boolean) => {
    try {
      await updateMilestone({
        id,
        body: { is_completed: !currentStatus },
      }).unwrap();
      showToast(!currentStatus ? 'Milestone marked as complete' : 'Milestone marked as pending', 'success');
    } catch {
      showToast('Failed to update milestone status', 'error');
    }
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
          due_date: dueDate || undefined,
          is_completed: false,
        },
      }).unwrap();
      showToast('Milestone created successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch {
      showToast('Failed to create milestone', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMilestone = async (id: number) => {
    try {
      await deleteMilestoneMutation(id).unwrap();
      showToast('Milestone deleted', 'info');
    } catch {
      showToast('Failed to delete milestone', 'error');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Overall Milestone Progress */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Project Milestones
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Key deliverable checkpoints and release targets for this project
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            Add Milestone
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: '#04552B' } }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 45, color: 'text.primary' }}>
            {progressPct}%
          </Typography>
        </Box>
        <Typography variant="caption" color="textSecondary">
          {completedCount} of {milestones.length} Milestones Reached
        </Typography>
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
            No Milestones Yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2.5 }}>
            Create key milestone goals to track major phase completions for this project.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            sx={{ color: '#04552B', borderColor: '#04552B' }}
          >
            Create First Milestone
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {milestones.map((m) => (
            <Paper
              key={m.id}
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Checkbox
                  checked={m.is_completed}
                  onChange={() => handleToggleMilestone(m.id, m.is_completed)}
                  color="success"
                />
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: m.is_completed ? 'text.secondary' : 'text.primary',
                      textDecoration: m.is_completed ? 'line-through' : 'none',
                    }}
                  >
                    {m.title}
                  </Typography>
                  {m.description && (
                    <Typography variant="body2" color="textSecondary">
                      {m.description}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {m.due_date && (
                  <Chip
                    icon={<Calendar size={14} />}
                    label={m.due_date}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                  />
                )}
                <IconButton size="small" onClick={() => handleDeleteMilestone(m.id)} sx={{ color: '#EF4444' }}>
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            </Paper>
          ))}
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
            <TextField
              label="Target Due Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={isSubmitting} sx={{ bgcolor: '#04552B' }}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

