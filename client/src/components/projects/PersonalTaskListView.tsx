import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Trash2, Edit3, Calendar } from 'lucide-react';
import { TaskItem } from '@/api/projectsApi';
import { format } from 'date-fns';

interface PersonalTaskListViewProps {
  tasks: TaskItem[];
  selectedTaskIds: number[];
  onToggleSelectTask: (id: number) => void;
  onSelectAllTasks: (ids: number[]) => void;
  onOpenTaskDetail: (task: TaskItem) => void;
  onDeleteTask: (id: number) => void;
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

export default function PersonalTaskListView({
  tasks,
  selectedTaskIds,
  onToggleSelectTask,
  onSelectAllTasks,
  onOpenTaskDetail,
  onDeleteTask,
}: PersonalTaskListViewProps) {
  const allSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;
  const indeterminate = selectedTaskIds.length > 0 && selectedTaskIds.length < tasks.length;

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
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: '#f8fafc' }}>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={indeterminate}
                onChange={(e) => {
                  if (e.target.checked) onSelectAllTasks(tasks.map(t => t.id));
                  else onSelectAllTasks([]);
                }}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Task</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Priority</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Due Date</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => onToggleSelectTask(task.id)}
                />
              </TableCell>
              <TableCell>
                <Box
                  sx={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                  onClick={() => onOpenTaskDetail(task)}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', textDecoration: task.is_completed ? 'line-through' : 'none' }}>
                    {task.title}
                  </Typography>
                  {task.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {task.description}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={task.status_name || 'To Do'}
                  size="small"
                  sx={{
                    bgcolor: task.status_color || '#e2e8f0',
                    color: '#1e293b',
                    fontWeight: 600,
                    fontSize: 11,
                    height: 22,
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ fontWeight: 700, color: getPriorityColor(task.priority), px: 1, py: 0.5, bgcolor: getPriorityColor(task.priority) + '1A', borderRadius: 1 }}>
                  {task.priority}
                </Typography>
              </TableCell>
              <TableCell>
                {task.due_date ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                    <Calendar size={14} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {format(new Date(task.due_date), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.disabled">-</Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit Task">
                  <IconButton size="small" onClick={() => onOpenTaskDetail(task)} sx={{ color: '#64748b' }}>
                    <Edit3 size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Task">
                  <IconButton size="small" onClick={() => onDeleteTask(task.id)} sx={{ color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
