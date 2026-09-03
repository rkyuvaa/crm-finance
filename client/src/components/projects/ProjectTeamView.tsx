import React from 'react';
import { Box, Paper, Typography, Grid, Avatar, Chip, Button } from '@mui/material';
import { UserPlus, Mail } from 'lucide-react';

export default function ProjectTeamView() {
  const members = [
    { id: 1, name: 'John Doe', role: 'Project Owner & Lead Developer', email: 'john@example.com', assignedTasks: 12 },
    { id: 2, name: 'Sarah Jenkins', role: 'Frontend Engineer', email: 'sarah@example.com', assignedTasks: 8 },
    { id: 3, name: 'Alex Smith', role: 'QA & Product Specialist', email: 'alex@example.com', assignedTasks: 5 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>Project Team Members</Typography>
          <Typography variant="body2" color="textSecondary">Allocated personnel and workload distribution</Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<UserPlus size={16} />} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
          Assign Member
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {members.map((m) => (
          <Grid item xs={12} sm={6} md={4} key={m.id}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: '12px', textAlign: 'center' }}>
              <Avatar sx={{ width: 56, height: 56, margin: '0 auto 12px', bgcolor: '#04552B', fontSize: '1.2rem', fontWeight: 700 }}>
                {m.name.charAt(0)}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>{m.name}</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>{m.role}</Typography>
              <Chip label={`${m.assignedTasks} Active Tasks`} size="small" sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 600 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
