import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FolderPlus,
  ListTodo,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  ProjectItem,
} from '@/api/projectsApi';
import { useApplicationsQuery } from '@/api/applicationsApi';
import { useToast } from '@/components/ui/ToastHost';

export default function ProjectsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { showToast } = useToast();

  const { data: projects = [], isLoading, isError, refetch } = useGetProjectsQuery({ q: searchQ || undefined });
  const { data: leadsData } = useApplicationsQuery({ page: 1, page_size: 100 });
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Vehicle Customization');
  const [leadId, setLeadId] = useState<number | ''>('');
  const [budget, setBudget] = useState<number | ''>('');
  const [targetStartDate, setTargetStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('Project name is required', 'error');
      return;
    }
    try {
      await createProject({
        name: name.trim(),
        category,
        lead_id: leadId ? Number(leadId) : undefined,
        budget: budget ? Number(budget) : 0,
        target_start_date: targetStartDate || undefined,
        target_end_date: targetEndDate || undefined,
        status: 'PLANNING',
      }).unwrap();
      showToast('Project created successfully', 'success');
      setCreateOpen(false);
      setName('');
      setLeadId('');
      setBudget('');
    } catch {
      showToast('Failed to create project', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id).unwrap();
        showToast('Project deleted', 'success');
      } catch {
        showToast('Could not delete project', 'error');
      }
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (tabValue === 1) return p.status === 'IN_PROGRESS';
    if (tabValue === 2) return p.status === 'PLANNING';
    if (tabValue === 3) return p.status === 'ON_HOLD';
    if (tabValue === 4) return p.status === 'COMPLETED';
    return true;
  });

  const totalBudget = projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const totalCompleted = projects.filter((p) => p.status === 'COMPLETED').length;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
            Projects & Workspaces
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Manage vehicle customization projects, delivery milestones, and team tasks
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateOpen(true)}
            sx={{
              backgroundColor: '#04552B',
              '&:hover': { backgroundColor: '#034120' },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            New Project
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                <Briefcase size={20} />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                Total Projects
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {projects.length}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                <Clock size={20} />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                In Progress
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {projects.filter((p) => p.status === 'IN_PROGRESS').length}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#FDF2F8', color: '#DB2777' }}>
                <CheckCircle2 size={20} />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                Completed
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {totalCompleted}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706' }}>
                <ListTodo size={20} />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                Total Budget
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A' }}>
              ₹{totalBudget.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Tabs & Search */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
            <Tab label={`All (${projects.length})`} />
            <Tab label="In Progress" />
            <Tab label="Planning" />
            <Tab label="On Hold" />
            <Tab label="Completed" />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search projects..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: <Search size={16} style={{ marginRight: 8, color: '#64748B' }} />,
            }}
            sx={{ width: 260, my: 1 }}
          />
        </Box>

        {/* Project Cards Grid */}
        <Box sx={{ p: 3 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#04552B' }} />
            </Box>
          ) : isError ? (
            <Box sx={{ textAlignment: 'center', py: 6 }}>
              <Typography color="error">Failed to load projects</Typography>
              <Button onClick={() => refetch()} sx={{ mt: 1 }}>Retry</Button>
            </Box>
          ) : filteredProjects.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" sx={{ color: '#64748B' }}>
                No projects found matching the selected criteria.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredProjects.map((project) => (
                <Grid item xs={12} md={6} lg={4} key={project.id}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: '#CBD5E1' },
                    }}
                  >
                    <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Chip
                          label={project.category}
                          size="small"
                          sx={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label={project.status.replace('_', ' ')}
                            size="small"
                            sx={{
                              backgroundColor:
                                project.status === 'COMPLETED' ? '#DCFCE7' : project.status === 'IN_PROGRESS' ? '#DBEAFE' : '#FEF3C7',
                              color:
                                project.status === 'COMPLETED' ? '#15803D' : project.status === 'IN_PROGRESS' ? '#1D4ED8' : '#B45309',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                          <IconButton size="small" onClick={() => handleDelete(project.id)} sx={{ color: '#EF4444' }}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Box>
                      </Box>

                      <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                        {project.name}
                      </Typography>

                      {project.lead_app_no && (
                        <Typography variant="caption" sx={{ color: '#04552B', fontWeight: 600, mb: 1, display: 'block' }}>
                          Ref CRM: {project.lead_app_no} ({project.lead_customer_name || 'Customer'})
                        </Typography>
                      )}

                      <Box sx={{ mt: 'auto', pt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                            Progress
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {project.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={project.progress}
                          sx={{ height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', '& .MuiLinearProgress-bar': { backgroundColor: '#04552B' } }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid #F1F5F9' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Budget: <strong>₹{project.budget.toLocaleString()}</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Tasks: <strong>{project.tasks_count?.done || 0}/{project.tasks_count?.total || 0}</strong>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>

      {/* New Project Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Project</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Project Name *"
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. KIM Electric Scooter Customization"
            />

            <TextField
              label="Category"
              fullWidth
              size="small"
              select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="Vehicle Customization">Vehicle Customization</MenuItem>
              <MenuItem value="Delivery & Payout">Delivery & Payout</MenuItem>
              <MenuItem value="Document Operations">Document Operations</MenuItem>
              <MenuItem value="General ERP Task">General ERP Task</MenuItem>
            </TextField>

            <TextField
              label="Link CRM Lead / Opportunity"
              fullWidth
              size="small"
              select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">None</MenuItem>
              {(leadsData?.items ?? []).map((lead) => (
                <MenuItem key={lead.id} value={lead.id}>
                  {lead.app_no} - {lead.customer_name} ({lead.vehicle || 'Vehicle'})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Budget (INR)"
              type="number"
              fullWidth
              size="small"
              value={budget}
              onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Target Start Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={targetStartDate}
                  onChange={(e) => setTargetStartDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Target End Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={isCreating}
            sx={{ backgroundColor: '#04552B', '&:hover': { backgroundColor: '#034120' } }}
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
