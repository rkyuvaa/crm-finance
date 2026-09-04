import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Calendar } from 'lucide-react';
import { useThemeMode } from '@/context/ThemeModeContext';
import { useGetTasksQuery } from '@/api/projectsApi';

interface ProjectTimelineViewProps {
  projectId?: string;
}

export default function ProjectTimelineView({ projectId }: ProjectTimelineViewProps) {
  const { mode } = useThemeMode();
  const numericId = Number(projectId);

  const { data: tasks = [], isLoading } = useGetTasksQuery({ project_id: numericId }, { skip: !numericId || isNaN(numericId) });

  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

  const getStatusColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#DC2626';
      case 'HIGH':
        return '#EA580C';
      case 'NORMAL':
        return '#2563EB';
      default:
        return '#16A34A';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Timeline Header Grid */}
        <Box sx={{ display: 'flex', bgcolor: mode === 'dark' ? '#161B22' : '#F8FAFC', borderBottom: '1px solid', borderColor: 'divider', py: 1.5, px: 2 }}>
          <Box sx={{ width: 280, fontWeight: 700, color: 'text.primary' }}>Task / Deliverable</Box>
          <Box sx={{ flex: 1, display: 'flex' }}>
            {weeks.map((week, idx) => (
              <Box key={idx} sx={{ flex: 1, fontWeight: 600, color: 'text.secondary', textAlign: 'center', fontSize: '0.85rem' }}>
                {week}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Timeline Task Rows / Empty State */}
        {tasks.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Calendar size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
              No Tasks Scheduled on Timeline
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Add tasks to this project workspace to visualize their schedule on the Gantt timeline.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            {tasks.map((t, idx) => {
              // Calculate horizontal position & width based on index/dates
              const startPos = (idx % 3) * 25; // distribute smoothly across weeks
              const widthPct = Math.min(50, 100 - startPos);

              return (
                <Box
                  key={t.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: mode === 'dark' ? '#21262D' : '#F8FAFC' },
                  }}
                >
                  {/* Left Title Column */}
                  <Box sx={{ width: 280, pr: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Assigned to {t.assignee_name || 'Unassigned'}
                    </Typography>
                  </Box>

                  {/* Gantt Bar Grid Area */}
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', height: 36 }}>
                    {/* Background Grid Lines */}
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      {weeks.map((_, weekIdx) => (
                        <Box key={weekIdx} sx={{ flex: 1, borderRight: '1px solid', borderColor: 'divider' }} />
                      ))}
                    </Box>

                    {/* Timeline Bar */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${startPos}%`,
                        width: `${widthPct}%`,
                        height: 28,
                        bgcolor: getStatusColor(t.priority),
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.5,
                        color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        zIndex: 2,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#FFFFFF' }}>
                        {t.priority} • {t.due_date || 'No due date'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

