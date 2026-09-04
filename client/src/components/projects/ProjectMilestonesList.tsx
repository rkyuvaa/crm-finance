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
} from '@mui/material';
import { Plus, Flag, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

interface Milestone {
  id: number;
  title: string;
  due_date: string;
  is_completed: boolean;
  description?: string;
}

interface ProjectMilestonesListProps {
  projectId: string;
}

export default function ProjectMilestonesList({ projectId }: ProjectMilestonesListProps) {
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: 1, title: 'Phase 1 Architecture Approval', due_date: '2026-09-10', is_completed: true, description: 'Finalize overall architecture and specs' },
    { id: 2, title: 'Backend Schema & Migration', due_date: '2026-09-15', is_completed: true, description: 'Complete database models and migrations' },
    { id: 3, title: 'Frontend Workspace Shell', due_date: '2026-09-20', is_completed: false, description: 'Build workspace layout and navigation tabs' },
    { id: 4, title: 'UAT & Production Release', due_date: '2026-10-01', is_completed: false, description: 'Final user acceptance testing' },
  ]);

  const completedCount = milestones.filter((m) => m.is_completed).length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const toggleMilestone = (id: number) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_completed: !m.is_completed } : m))
    );
    showToast('Milestone status updated', 'success');
  };

  const handleCreate = () => {
    if (!title.trim()) {
      showToast('Milestone title is required', 'error');
      return;
    }
    const newM: Milestone = {
      id: Date.now(),
      title: title.trim(),
      due_date: dueDate || '2026-10-15',
      is_completed: false,
    };
    setMilestones([...milestones, newM]);
    showToast('Milestone created', 'success');
    setCreateOpen(false);
    setTitle('');
    setDueDate('');
  };

  const deleteMilestone = (id: number) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    showToast('Milestone deleted', 'info');
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
              Key deliverable checkpoints and release targets
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

      {/* Milestones List */}
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
                onChange={() => toggleMilestone(m.id)}
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
              <Chip
                icon={<Calendar size={14} />}
                label={m.due_date}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', fontWeight: 600 }}
              />
              <IconButton size="small" onClick={() => deleteMilestone(m.id)} sx={{ color: '#EF4444' }}>
                <Trash2 size={16} />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>

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
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" sx={{ bgcolor: '#04552B' }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
