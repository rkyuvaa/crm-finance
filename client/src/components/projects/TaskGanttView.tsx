import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import { GanttChartSquare, Lock } from 'lucide-react';
import { TaskItem } from '@/api/projectsApi';

interface TaskGanttViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
}

export default function TaskGanttView({ tasks, onOpenTaskDetail }: TaskGanttViewProps) {
  // Sort tasks by start/due dates
  const rootTasks = tasks.filter((t) => !t.parent_task_id);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <GanttChartSquare size={20} color="#04552B" />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Gantt & Project Timeline Visualization
        </Typography>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Timeline Header */}
        <Box sx={{ display: 'flex', bgcolor: 'background.default', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 700, fontSize: 13, color: 'text.secondary' }}>
          <Box sx={{ width: 280 }}>TASK</Box>
          <Box sx={{ width: 140 }}>DATES</Box>
          <Box sx={{ flex: 1, textAlign: 'center' }}>TIMELINE & DEPENDENCIES</Box>
        </Box>

        {/* Rows */}
        {rootTasks.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">No tasks to plot on Gantt chart.</Typography>
          </Box>
        ) : (
          rootTasks.map((t) => (
            <Box
              key={t.id}
              onClick={() => onOpenTaskDetail(t)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ width: 280, pr: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={t.task_number || `T-${t.id}`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {t.title}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ width: 140 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                  {t.start_date || 'Start'} → {t.due_date || 'Due'}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, pl: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <LinearProgress
                    variant="determinate"
                    value={t.progress_percentage || (t.is_completed ? 100 : 20)}
                    sx={{
                      height: 14,
                      borderRadius: 7,
                      bgcolor: '#E2E8F0',
                      '& .MuiLinearProgress-bar': { bgcolor: t.is_completed ? '#10B981' : '#2563EB' },
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 40 }}>
                  {t.progress_percentage || 0}%
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}
