import { Box, Drawer, IconButton, Typography, Divider, Grid, Chip, Avatar, TextField, Button, LinearProgress } from '@mui/material';
import { X, Clock, Calendar, CheckSquare, MessageSquare, AlertCircle } from 'lucide-react';
import { TaskItem, useToggleSubtaskMutation } from '@/api/projectsApi';
import { useState } from 'react';
import { useToast } from '@/components/ui/ToastHost';

interface TaskDetailPanelProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

export default function TaskDetailPanel({ open, onClose, task }: TaskDetailPanelProps) {
  const [comment, setComment] = useState('');
  const [toggleSubtask] = useToggleSubtaskMutation();
  const { showToast } = useToast();

  if (!task) return null;

  const handleToggle = async (subtaskId: number) => {
    try {
      await toggleSubtask(subtaskId).unwrap();
    } catch {
      showToast('Failed to update subtask', 'error');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 600, md: 800 }, p: 0, bgcolor: '#F8FAFC' },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white', borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            label={task.status_id ? `Status: ${task.status_id}` : 'To Do'} 
            size="small" 
            sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 600 }} 
          />
          <Typography variant="body2" color="textSecondary">
            {task.project_name || 'No Project'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small"><AlertCircle size={18} /></IconButton>
          <IconButton size="small" onClick={onClose}><X size={20} /></IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: 'calc(100vh - 65px)' }}>
        {/* Main Body (Left side of panel) */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', bgcolor: 'white' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
            {task.title}
          </Typography>
          
          <Typography variant="body1" sx={{ color: '#475569', mb: 4, whiteSpace: 'pre-wrap' }}>
            {task.description || 'No description provided.'}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Checklists Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckSquare size={20} color="#64748B" />
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Checklists</Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                {task.subtasks?.length > 0 
                  ? `${Math.round((task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100)}%` 
                  : '0%'}
              </Typography>
            </Box>
            
            {task.subtasks?.length > 0 && (
              <LinearProgress 
                variant="determinate" 
                value={(task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100}
                sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#04552B' } }}
              />
            )}
            
            {task.subtasks?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {task.subtasks.map((sub) => (
                  <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input 
                      type="checkbox" 
                      checked={sub.is_completed} 
                      onChange={() => handleToggle(sub.id)} 
                      style={{ cursor: 'pointer' }}
                    />
                    <Typography sx={{ textDecoration: sub.is_completed ? 'line-through' : 'none', color: sub.is_completed ? '#94A3B8' : '#334155' }}>
                      {sub.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">No checklist items.</Typography>
            )}
            <Button variant="text" size="small" startIcon={<Plus size={16} />} sx={{ mt: 1 }}>Add Item</Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Activity / Comments */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MessageSquare size={20} color="#64748B" />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Activity & Comments</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#04552B', fontSize: '0.875rem' }}>Me</Avatar>
              <TextField 
                fullWidth 
                size="small" 
                placeholder="Write a comment..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                multiline
                rows={2}
              />
            </Box>
          </Box>
        </Box>

        {/* Meta Column (Right side of panel) */}
        <Box sx={{ width: { xs: '100%', md: 280 }, p: 3, borderLeft: { md: '1px solid #E2E8F0' }, bgcolor: '#F8FAFC' }}>
          <Typography variant="subtitle2" sx={{ color: '#64748B', mb: 2, textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>
            Properties
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Assignee</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{task.assignee_name?.charAt(0) || '?'}</Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.assignee_name || 'Unassigned'}</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Priority</Typography>
              <Chip size="small" label={task.priority} sx={{ height: 24 }} />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Due Date</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={16} color="#64748B" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.due_date || 'None'}</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Time Tracked</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock size={16} color="#64748B" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.actual_hours}h / {task.estimated_hours}h</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
