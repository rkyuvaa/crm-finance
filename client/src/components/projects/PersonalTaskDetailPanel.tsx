import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, Select, MenuItem, Button, Divider, CircularProgress
} from '@mui/material';
import { X, CheckCircle2, Clock } from 'lucide-react';
import { TaskItem, useUpdatePersonalTaskMutation, useGetStatusDefinitionsQuery, useGetTaskTagsQuery } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';
import Autocomplete from '@mui/material/Autocomplete';

interface PersonalTaskDetailPanelProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem;
}

export default function PersonalTaskDetailPanel({ open, onClose, task }: PersonalTaskDetailPanelProps) {
  const [updateTask, { isLoading }] = useUpdatePersonalTaskMutation();
  const { data: statuses = [] } = useGetStatusDefinitionsQuery();
  const { data: taskTags = [] } = useGetTaskTagsQuery();
  const { showToast } = useToast();

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'NORMAL');
  const [statusId, setStatusId] = useState<number | ''>(task.status_id || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(task.estimated_hours || '');
  const [isCompleted, setIsCompleted] = useState(task.is_completed || false);
  const [tags, setTags] = useState<string[]>(task.tags_list?.map(t => t.name) || []);
  
  const [reminderAt, setReminderAt] = useState(task.reminder_at ? task.reminder_at.substring(0,16) : '');
  const [recurrenceType, setRecurrenceType] = useState(task.recurrence_rule?.type || 'None');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(task.recurrence_end_date || '');
  const [editSeries, setEditSeries] = useState(false);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'NORMAL');
      setStatusId(task.status_id || '');
      setDueDate(task.due_date || '');
      setEstimatedHours(task.estimated_hours || '');
      setIsCompleted(task.is_completed || false);
      setTags(task.tags_list?.map(t => t.name) || []);
      setReminderAt(task.reminder_at ? task.reminder_at.substring(0,16) : '');
      setRecurrenceType(task.recurrence_rule?.type || 'None');
      setRecurrenceEndDate(task.recurrence_end_date || '');
      setEditSeries(false);
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
          tag_names: tags,
          reminder_at: reminderAt ? new Date(reminderAt).toISOString() : undefined,
          recurrence_rule: recurrenceType !== 'None' ? { type: recurrenceType } : null,
          recurrence_end_date: recurrenceEndDate || undefined,
          edit_series: editSeries,
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

          <Autocomplete
            multiple
            freeSolo
            options={taskTags.map(t => t.name)}
            value={tags}
            onChange={(_, newValue) => setTags(newValue)}
            renderInput={(params) => <TextField {...params} label="Tags" size="small" />}
            size="small"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Reminder Date & Time"
              type="datetime-local"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={reminderAt}
              onChange={e => setReminderAt(e.target.value)}
            />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>Recurrence</Typography>
              <Select
                size="small"
                fullWidth
                value={recurrenceType}
                onChange={e => setRecurrenceType(e.target.value)}
              >
                <MenuItem value="None">None</MenuItem>
                <MenuItem value="Daily">Daily</MenuItem>
                <MenuItem value="Weekly">Weekly</MenuItem>
                <MenuItem value="Monthly">Monthly</MenuItem>
                <MenuItem value="Yearly">Yearly</MenuItem>
              </Select>
            </Box>
          </Box>
          
          {recurrenceType !== 'None' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                label="Recurrence End Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={recurrenceEndDate}
                onChange={e => setRecurrenceEndDate(e.target.value)}
              />
              {(task.recurring_task_id || task.recurrence_rule) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input 
                    type="checkbox" 
                    id="editSeries" 
                    checked={editSeries} 
                    onChange={e => setEditSeries(e.target.checked)} 
                  />
                  <Typography variant="body2" component="label" htmlFor="editSeries">
                    Apply updates to entire future series
                  </Typography>
                </Box>
              )}
            </Box>
          )}

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

          {task.created_by_name && (
            <Typography variant="caption" color="text.secondary">
              Created by {task.created_by_name} on {new Date(task.created_at).toLocaleString()}
            </Typography>
          )}
          {task.completion_date && (
            <Typography variant="caption" color="text.secondary">
              Completed on {task.completion_date} {task.completion_time || ''}
            </Typography>
          )}

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
