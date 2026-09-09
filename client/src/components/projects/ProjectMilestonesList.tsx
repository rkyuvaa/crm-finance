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
  Tooltip,
} from '@mui/material';
import { Plus, Flag, Calendar, Trash2, Info } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progressPct = 0; // Not tracking milestone is_completed locally anymore but can still compute if needed? Actually wait, the UI depends on it. 
  // Wait, I will just leave progress as 0 or remove complete toggle if there is no is_completed in ProjectMilestoneItem. The requirement says ProjectMilestoneItem has no is_completed. Let me remove it.

  // Milestone completion logic removed as milestones are just rollups now

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
                flexDirection: 'column',
                gap: 1.5,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {m.title}
                  </Typography>
                  {m.description && (
                    <Typography variant="body2" color="textSecondary">
                      {m.description}
                    </Typography>
                  )}
                </Box>
                <IconButton size="small" onClick={() => handleDeleteMilestone(m.id)} sx={{ color: '#EF4444' }}>
                  <Trash2 size={16} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', bgcolor: '#F8FAFC', p: 1.5, borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <Tooltip title="Rolled up from tasks">
                  <Info size={16} color="#64748B" />
                </Tooltip>
                
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Start Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.rollup_start_date || '—'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>End Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.rollup_end_date || '—'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Duration (CD)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.rollup_duration_days != null ? `${m.rollup_duration_days} CD` : '—'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Est. Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.rollup_estimated_cost != null ? `₹${m.rollup_estimated_cost.toLocaleString('en-IN')}` : '—'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Actual Cost</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.rollup_actual_cost != null ? `₹${m.rollup_actual_cost.toLocaleString('en-IN')}` : '—'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Variance</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: (m.cost_variance || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                    {m.cost_variance != null ? `₹${m.cost_variance.toLocaleString('en-IN')}` : '—'}
                  </Typography>
                </Box>
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

