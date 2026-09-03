import React from 'react';
import { Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Avatar, Chip } from '@mui/material';
import { Clock } from 'lucide-react';

export default function ProjectTimesheetsView() {
  const timeLogs = [
    { id: 1, user: 'John Doe', date: '2026-09-03', hours: 4.5, task: 'Database Schema & Migration', description: 'Updated models for custom fields' },
    { id: 2, user: 'Sarah Jenkins', date: '2026-09-02', hours: 6.0, task: 'Workspace Navigation', description: 'Built header KPI bar' },
    { id: 3, user: 'Alex Smith', date: '2026-09-01', hours: 3.5, task: 'Task Side Panel', description: 'Added checklist toggle component' },
  ];

  const totalHours = timeLogs.reduce((acc, l) => acc + l.hours, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>Timesheets & Logged Hours</Typography>
            <Typography variant="body2" color="textSecondary">Detailed labor allocation for this project</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#04552B' }}>{totalHours} hrs</Typography>
            <Typography variant="caption" color="textSecondary">Total Hours Logged</Typography>
          </Box>
        </Box>
      </Paper>

      <Table elevation={0} component={Paper} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <TableHead sx={{ bgcolor: '#F8FAFC' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Team Member</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">Hours Logged</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {timeLogs.map((log) => (
            <TableRow key={log.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', bgcolor: '#04552B' }}>{log.user.charAt(0)}</Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.user}</Typography>
                </Box>
              </TableCell>
              <TableCell>{log.date}</TableCell>
              <TableCell><Chip label={log.task} size="small" variant="outlined" /></TableCell>
              <TableCell><Typography variant="body2" color="textSecondary">{log.description}</Typography></TableCell>
              <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 700 }}>{log.hours} h</Typography></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
