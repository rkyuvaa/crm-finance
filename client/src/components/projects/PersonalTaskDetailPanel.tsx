import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, Select, MenuItem, Button, Divider, CircularProgress
} from '@mui/material';
import { X, CheckCircle2, Clock } from 'lucide-react';
import { TaskItem, useUpdatePersonalTaskMutation, useGetStatusDefinitionsQuery } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

interface PersonalTaskDetailPanelProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem;
}

export default function PersonalTaskDetailPanel({ open, onClose, task }: PersonalTaskDetailPanelProps) {
  const [updateTask, { isLoading }] = useUpdatePersonalTaskMutation();
  const { data: statuses = [] } = useGetStatusDefinitionsQuery();
  const { showToast } = useToast();

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'NORMAL');
  const [statusId, setStatusId] = useState<number | ''>(task.status_id || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(task.estimated_hours || '');
  const [isCompleted, setIsCompleted] = useState(task.is_completed || false);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'NORMAL');
      setStatusId(task.status_id || '');
      setDueDate(task.due_date || '');
      setEstimatedHours(task.estimated_hours || '');
      setIsCompleted(task.is_completed || false);
    }
  }, [open, task]);

  const handleSave = async () => {
    try {
      await updateTask({
        id: task.id,
        body: {
          title,
          description,
          priority: priority as any,
          status_id: statusId ? Number(statusId) : undefined,
          due_date: dueDate || undefined,
          estimated_hours: estimatedHours ? Number(estimatedHours) : 0,
          is_completed: isCompleted,
        }
      }).unwrap();
      showToast('Task updated successfully', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to update task', 'error');
    }
  };

  const toggleComplete = async () => {
    const newStatus = !isCompleted;
    setIsCompleted(newStatus);
    try {
      await updateTask({
        id: task.id,
        body: { is_completed: newStatus }
      }).unwrap();
      showToast(newStatus ? 'Task completed!' : 'Task reopened', 'success');
    } catch (err) {
      setIsCompleted(!newStatus);
      showToast('Failed to update task status', 'error');
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={toggleComplete} color={isCompleted ? 'success' : 'default'}>
              <CheckCircle2 size={24} />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, color: isCompleted ? 'text.secondary' : '#0F172A', textDecoration: isCompleted ? 'line-through' : 'none' }}>
              {task.task_number}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><X size={20} /></IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Task Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
            size="small"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>Status</Typography>
              <Select
                size="small"
                fullWidth
                value={statusId}
                onChange={e => setStatusId(e.target.value as number)}
                displayEmpty
              >
                {statuses.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>Priority</Typography>
              <Select
                size="small"
                fullWidth
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <MenuItem value="URGENT">Urgent</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </Select>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Due Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <TextField
              label="Estimated Hours"
              type="number"
              size="small"
              fullWidth
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value ? Number(e.target.value) : '')}
            />
          </Box>

          <Divider />

          <TextField
            label="Description & Notes"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={6}
            size="small"
            placeholder="Add personal notes, checklists, or details here..."
          />

        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1, bgcolor: '#f8fafc' }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
            sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}
          >
            {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
