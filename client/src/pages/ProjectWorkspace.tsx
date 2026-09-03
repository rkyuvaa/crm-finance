import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ArrowLeft,
  Settings,
  MoreVertical,
  Activity,
  Briefcase,
  Users,
  Clock,
  FileText,
  PieChart,
} from 'lucide-react';
import ProjectTasksList from '@/components/projects/ProjectTasksList';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  // Placeholder for real data fetch
  const project = {
    id,
    name: 'ERP Implementation',
    code: 'PRJ-1020',
    progress: 45,
    health: 'On Track', // On Track, At Risk, Critical
    budget: 50000,
    actualCost: 12500,
    totalTasks: 42,
    doneTasks: 18,
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      {/* Sticky Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              {project.name}
              <Chip size="small" label={project.code} variant="outlined" />
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<Settings size={18} />}>
            Settings
          </Button>
        </Box>

        {/* KPI Strip */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2">Health</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="h6">{project.health}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2">Progress</Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>{project.progress}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2">Tasks Completion</Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {project.doneTasks} / {project.totalTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="textSecondary" variant="subtitle2">Budget Usage</Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  ${project.actualCost.toLocaleString()} / ${project.budget.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Workspace Tabs */}
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
          <Tab label="Overview" value="overview" />
          <Tab label="Tasks" value="tasks" />
          <Tab label="Milestones" value="milestones" />
          <Tab label="Timeline (Gantt)" value="timeline" />
          <Tab label="Team" value="team" />
          <Tab label="Timesheets" value="timesheets" />
          <Tab label="Expenses" value="expenses" />
          <Tab label="Documents" value="documents" />
        </Tabs>
      </Box>

      {/* Tab Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tab === 'overview' && (
          <Typography color="textSecondary">Overview content goes here...</Typography>
        )}
        {tab === 'tasks' && (
          <ProjectTasksList projectId={id!} />
        )}
      </Box>
    </Box>
  );
}
