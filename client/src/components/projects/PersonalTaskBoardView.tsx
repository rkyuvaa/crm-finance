import React from 'react';
import { Box, Typography, Paper, IconButton, Chip } from '@mui/material';
import { Plus, Edit3, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { TaskItem } from '@/api/projectsApi';
import { format } from 'date-fns';

interface PersonalTaskBoardViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
  onDeleteTask: (id: number) => void;
  onQuickCreateTask: () => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'NORMAL': return '#3b82f6';
    case 'LOW': return '#64748b';
    default: return '#64748b';
  }
};

export default function PersonalTaskBoardView({
  tasks,
  onOpenTaskDetail,
  onDeleteTask,
  onQuickCreateTask,
}: PersonalTaskBoardViewProps) {
  
  // Group tasks by status category or name
  const columns = ['NOT_STARTED', 'ACTIVE', 'DONE', 'CLOSED'];
  const columnTitles: Record<string, string> = {
    'NOT_STARTED': 'To Do',
    'ACTIVE': 'In Progress',
    'DONE': 'Completed',
    'CLOSED': 'Closed',
  };

  const tasksByColumn = columns.reduce((acc, col) => {
    acc[col] = tasks.filter(t => (t.status_category || 'NOT_STARTED') === col);
    return acc;
  }, {} as Record<string, TaskItem[]>);

  if (tasks.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" color="text.secondary">No Personal Tasks Found</Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
          Create a new personal task to plan your day.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 400 }}>
      {columns.map(colId => (
        <Paper
          key={colId}
          elevation={0}
          sx={{
            width: 300,
            minWidth: 300,
            bgcolor: '#f8fafc',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
              {columnTitles[colId]} ({tasksByColumn[colId].length})
            </Typography>
            {colId === 'NOT_STARTED' && (
              <IconButton size="small" onClick={onQuickCreateTask}>
                <Plus size={16} />
              </IconButton>
            )}
          </Box>
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, overflowY: 'auto' }}>
            {tasksByColumn[colId].map(task => (
              <Paper
                key={task.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
                }}
                onClick={() => onOpenTaskDetail(task)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: '#0F172A', textDecoration: task.is_completed ? 'line-through' : 'none' }}
                  >
                    {task.title}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: getPriorityColor(task.priority), px: 0.75, py: 0.25, bgcolor: getPriorityColor(task.priority) + '1A', borderRadius: 1 }}>
                    {task.priority}
                  </Typography>
                  <Chip
                    label={task.status_name || 'To Do'}
                    size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: task.status_color || '#e2e8f0' }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: task.is_completed ? '#10b981' : '#64748b' }}>
                    {task.is_completed ? <CheckCircle2 size={14} /> : <Calendar size={14} />}
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {task.due_date ? format(new Date(task.due_date), 'MMM dd') : 'No Date'}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} sx={{ color: '#ef4444', p: 0.5 }}>
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
