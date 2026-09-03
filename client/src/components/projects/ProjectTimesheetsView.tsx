import React from 'react';
import { Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Avatar, Chip, CircularProgress } from '@mui/material';
import { Clock } from 'lucide-react';
import { useGetTasksQuery } from '@/api/projectsApi';

interface ProjectTimesheetsViewProps {
  projectId?: string;
}

export default function ProjectTimesheetsView({ projectId }: ProjectTimesheetsViewProps) {
  const numericId = Number(projectId);
  const { data: tasks = [], isLoading } = useGetTasksQuery({ project_id: numericId }, { skip: !numericId });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Filter tasks that have actual logged hours
  const loggedTasks = tasks.filter((t) => (t.actual_hours || 0) > 0);
  const totalHours = tasks.reduce((acc, t) => acc + (t.actual_hours || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Timesheets & Logged Hours</Typography>
            <Typography variant="body2" color="textSecondary">Live labor allocation and tracked time for this project</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#04552B' }}>{totalHours} hrs</Typography>
            <Typography variant="caption" color="textSecondary">Total Hours Logged</Typography>
          </Box>
        </Box>
      </Paper>

      <Table elevation={0} component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
        <TableHead sx={{ bgcolor: 'background.default' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Team Member / Assignee</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Task Title</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Estimated Time</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">Hours Logged</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loggedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Clock size={24} color="#94A3B8" style={{ marginBottom: 4 }} />
                <Typography variant="body2" color="textSecondary">
                  No logged hours recorded for this project yet. Use the Live Timer inside task details to log work time.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            loggedTasks.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', bgcolor: '#04552B' }}>
                      {t.assignee_name?.charAt(0) || '?'}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t.assignee_name || 'Unassigned'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={t.title} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">{t.estimated_hours}h estimated</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>
                    {t.actual_hours} h
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
