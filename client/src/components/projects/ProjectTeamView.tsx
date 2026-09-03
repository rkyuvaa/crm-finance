import React from 'react';
import { Box, Paper, Typography, Grid, Avatar, Chip, Button, CircularProgress } from '@mui/material';
import { UserPlus, Users } from 'lucide-react';
import { useGetTasksQuery } from '@/api/projectsApi';

interface ProjectTeamViewProps {
  projectId?: string;
}

export default function ProjectTeamView({ projectId }: ProjectTeamViewProps) {
  const numericId = Number(projectId);
  const { data: tasks = [], isLoading } = useGetTasksQuery({ project_id: numericId }, { skip: !numericId });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Aggregate unique team members assigned to tasks in this project
  const memberMap: Record<string, { name: string; count: number }> = {};
  tasks.forEach((t) => {
    const name = t.assignee_name || 'Unassigned';
    if (!memberMap[name]) {
      memberMap[name] = { name, count: 0 };
    }
    memberMap[name].count += 1;
  });

  const members = Object.values(memberMap);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Project Team Members</Typography>
          <Typography variant="body2" color="textSecondary">Allocated personnel and active task distribution</Typography>
        </Box>
      </Box>

      {members.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
          <Users size={32} color="#04552B" style={{ marginBottom: 8 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>No Team Members Assigned Yet</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Assign personnel to tasks in this project workspace to see workload distribution here.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {members.map((m) => (
            <Grid item xs={12} sm={6} md={4} key={m.name}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', textAlign: 'center', bgcolor: 'background.paper' }}>
                <Avatar sx={{ width: 56, height: 56, margin: '0 auto 12px', bgcolor: '#04552B', fontSize: '1.2rem', fontWeight: 700 }}>
                  {m.name.charAt(0)}
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>{m.name}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>Project Team Member</Typography>
                <Chip label={`${m.count} Active Tasks`} size="small" sx={{ bgcolor: 'primary.light', color: '#FFFFFF', fontWeight: 600 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
