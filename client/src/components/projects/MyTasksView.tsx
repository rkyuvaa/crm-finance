import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import { CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';
import { TaskItem } from '@/api/projectsApi';

interface MyTasksViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
}

export default function MyTasksView({ tasks, onOpenTaskDetail }: MyTasksViewProps) {
  const now = new Date();

  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && !t.is_completed
  );

  const todayTasks = tasks.filter((t) => {
    if (!t.due_date || t.is_completed) return false;
    const d = new Date(t.due_date);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  const upcomingTasks = tasks.filter((t) => {
    if (!t.due_date || t.is_completed) return false;
    const d = new Date(t.due_date);
    return d > now;
  });

  const completedTasks = tasks.filter((t) => t.is_completed);

  const renderSection = (title: string, icon: React.ReactNode, list: TaskItem[], toneColor: string) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', color: toneColor }}>
          {title} ({list.length})
        </Typography>
      </Box>

      {list.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ ml: 3 }}>
          No tasks in this category.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {list.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card
                elevation={0}
                onClick={() => onOpenTaskDetail(task)}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  bgcolor: 'background.paper',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={task.task_number || `T-${task.id}`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }}
                  />
                  <Chip label={task.priority} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {task.title}
                </Typography>

                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                  {task.project_name || 'General Project'}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: toneColor }}>
                    Due: {task.due_date || 'No date'}
                  </Typography>

                  <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#04552B' }}>
                    {task.assignees?.[0]?.full_name?.charAt(0) || 'U'}
                  </Avatar>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box>
      {renderSection('Overdue Tasks', <AlertCircle size={20} color="#DC2626" />, overdueTasks, '#DC2626')}
      {renderSection("Due Today", <Clock size={20} color="#D97706" />, todayTasks, '#D97706')}
      {renderSection('Upcoming Tasks', <Calendar size={20} color="#2563EB" />, upcomingTasks, '#2563EB')}
      {renderSection('Recently Completed', <CheckCircle2 size={20} color="#16A34A" />, completedTasks, '#16A34A')}
    </Box>
  );
}
