import React from 'react';
import { Box, Paper, Typography, Chip, Avatar } from '@mui/material';

interface TaskTimelineItem {
  id: number;
  title: string;
  startWeek: number; // 1 to 4
  durationWeeks: number; // 1 to 3
  status: string;
  color: string;
  assignee: string;
}

export default function ProjectTimelineView() {
  const tasks: TaskTimelineItem[] = [
    { id: 1, title: 'Requirements & Design Approval', startWeek: 1, durationWeeks: 1, status: 'Completed', color: '#16A34A', assignee: 'Alex' },
    { id: 2, title: 'Backend Schema Migration', startWeek: 1, durationWeeks: 2, status: 'In Progress', color: '#2563EB', assignee: 'John' },
    { id: 3, title: 'Workspace Navigation & Shell', startWeek: 2, durationWeeks: 1, status: 'In Progress', color: '#2563EB', assignee: 'Sarah' },
    { id: 4, title: 'Custom Fields Engine', startWeek: 3, durationWeeks: 1, status: 'Planning', color: '#D97706', assignee: 'John' },
    { id: 5, title: 'Gantt Timeline Integration', startWeek: 3, durationWeeks: 2, status: 'Planning', color: '#64748B', assignee: 'Alex' },
  ];

  const weeks = ['Week 1 (Sep 1-7)', 'Week 2 (Sep 8-14)', 'Week 3 (Sep 15-21)', 'Week 4 (Sep 22-28)'];

  return (
    <Box>
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Timeline Header Grid */}
        <Box sx={{ display: 'flex', bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', py: 1.5, px: 2 }}>
          <Box sx={{ width: 280, fontWeight: 700, color: '#475569' }}>Task / Deliverable</Box>
          <Box sx={{ flex: 1, display: 'flex' }}>
            {weeks.map((week, idx) => (
              <Box key={idx} sx={{ flex: 1, fontWeight: 600, color: '#64748B', textAlign: 'center', fontSize: '0.85rem' }}>
                {week}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Timeline Task Rows */}
        <Box sx={{ py: 1 }}>
          {tasks.map((t) => (
            <Box
              key={t.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 1.5,
                px: 2,
                borderBottom: '1px solid #F1F5F9',
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              {/* Left Title Column */}
              <Box sx={{ width: 280, pr: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                  {t.title}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Assigned to {t.assignee}
                </Typography>
              </Box>

              {/* Gantt Bar Grid Area */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', height: 36 }}>
                {/* Background Grid Lines */}
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
                  {weeks.map((_, idx) => (
                    <Box key={idx} sx={{ flex: 1, borderRight: '1px border #F1F5F9' }} />
                  ))}
                </Box>

                {/* Timeline Bar */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${((t.startWeek - 1) / 4) * 100}%`,
                    width: `${(t.durationWeeks / 4) * 100}%`,
                    height: 28,
                    bgcolor: t.color,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    color: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                    zIndex: 2,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.status}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
