import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  Card,
} from '@mui/material';
import { Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { TaskItem } from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';

interface TeamWorkloadViewProps {
  tasks: TaskItem[];
}

export default function TeamWorkloadView({ tasks }: TeamWorkloadViewProps) {
  const { data: users = [] } = useUsersQuery();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Users size={20} color="#04552B" />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Team Capacity & Workload Allocation
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {users.map((user) => {
            // Find tasks assigned to this user
            const userTasks = tasks.filter((t) =>
              t.assignees?.some((a) => a.user_id === user.id)
            );

            const totalEstimatedMins = userTasks.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0);
            const totalActualMins = userTasks.reduce((acc, t) => acc + (t.actual_minutes || 0), 0);
            const overdueCount = userTasks.filter(
              (t) => t.due_date && new Date(t.due_date) < new Date() && !t.is_completed
            ).length;

            const estHours = Math.round((totalEstimatedMins / 60) * 10) / 10;
            const actHours = Math.round((totalActualMins / 60) * 10) / 10;

            const isOverloaded = estHours > 40;

            return (
              <Grid item xs={12} sm={6} md={4} key={user.id}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: isOverloaded ? '#FCA5A5' : 'divider',
                    borderRadius: '12px',
                    bgcolor: isOverloaded ? '#FEF2F2' : 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: '#04552B', fontWeight: 700 }}>
                      {(user.full_name || '?').charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {user.role}
                      </Typography>
                    </Box>

                    {isOverloaded && (
                      <Chip
                        icon={<AlertTriangle size={12} />}
                        label="Overloaded"
                        size="small"
                        sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700, height: 22 }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Active Tasks:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{userTasks.length}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Estimated Effort:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{estHours}h</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">Tracked Effort:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{actHours}h</Typography>
                  </Box>

                  {overdueCount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="#DC2626" sx={{ fontWeight: 600 }}>Overdue Tasks:</Typography>
                      <Typography variant="body2" color="#DC2626" sx={{ fontWeight: 700 }}>{overdueCount}</Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                        Capacity Load (Max 40h)
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {Math.min(100, Math.round((estHours / 40) * 100))}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (estHours / 40) * 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'divider',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isOverloaded ? '#DC2626' : estHours > 30 ? '#F59E0B' : '#10B981',
                        },
                      }}
                    />
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}
