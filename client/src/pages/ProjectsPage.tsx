import { useState } from 'react';
import {
  Avatar,
  AvatarGroup,
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
} from '@mui/material';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FolderPlus,
  ListTodo,
  Plus,
  Search,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

interface Project {
  id: string;
  name: string;
  leadRef: string;
  category: string;
  status: 'In Progress' | 'Planning' | 'On Hold' | 'Completed';
  progress: number;
  dueDate: string;
  budget: string;
  tasksCount: { total: number; done: number };
  team: { name: string; avatar?: string }[];
}

interface TaskItem {
  id: string;
  title: string;
  projectName: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  dueDate: string;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ-101',
    name: 'KIM Electric Scooter V2 Customization',
    leadRef: 'APP-1251',
    category: 'EV Customization',
    status: 'In Progress',
    progress: 68,
    dueDate: '15 Sep 2026',
    budget: '₹4.5L',
    tasksCount: { total: 12, done: 8 },
    team: [{ name: 'Vijay K.' }, { name: 'Anish R.' }, { name: 'Pooja S.' }],
  },
  {
    id: 'PRJ-102',
    name: 'Commercial Fleet Battery Upgrade - Batch 4',
    leadRef: 'APP-1252',
    category: 'Fleet Modification',
    status: 'Planning',
    progress: 25,
    dueDate: '30 Sep 2026',
    budget: '₹12.0L',
    tasksCount: { total: 8, done: 2 },
    team: [{ name: 'Rahul M.' }, { name: 'Tharun I.' }],
  },
  {
    id: 'PRJ-103',
    name: 'Pre-Delivery Inspection & GPS Telematics Fitment',
    leadRef: 'APP-1248',
    category: 'Fitment',
    status: 'In Progress',
    progress: 90,
    dueDate: '05 Sep 2026',
    budget: '₹85,000',
    tasksCount: { total: 10, done: 9 },
    team: [{ name: 'Deepak J.' }, { name: 'Vijay K.' }],
  },
  {
    id: 'PRJ-104',
    name: 'Custom Loan Subsidy Documentation Setup',
    leadRef: 'APP-1245',
    category: 'Compliance & Audit',
    status: 'Completed',
    progress: 100,
    dueDate: '28 Aug 2026',
    budget: '₹30,000',
    tasksCount: { total: 6, done: 6 },
    team: [{ name: 'Meena D.' }],
  },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'TSK-201',
    title: 'Finalize RTO Registration documents for APP-1251',
    projectName: 'KIM Electric Scooter V2 Customization',
    assignee: 'Vijay K.',
    priority: 'High',
    status: 'In Progress',
    dueDate: '02 Sep 2026',
  },
  {
    id: 'TSK-202',
    title: 'Verify Financier Subsidy Approval Certificate',
    projectName: 'KIM Electric Scooter V2 Customization',
    assignee: 'Anish R.',
    priority: 'High',
    status: 'In Review',
    dueDate: '04 Sep 2026',
  },
  {
    id: 'TSK-203',
    title: 'Install Dual-Battery Connector Harness',
    projectName: 'Commercial Fleet Battery Upgrade - Batch 4',
    assignee: 'Rahul M.',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '10 Sep 2026',
  },
  {
    id: 'TSK-204',
    title: 'Perform 50-point Quality PDI Check',
    projectName: 'Pre-Delivery Inspection & GPS Telematics Fitment',
    assignee: 'Deepak J.',
    priority: 'High',
    status: 'Done',
    dueDate: '29 Aug 2026',
  },
];

export default function ProjectsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialog States
  const [openNewProject, setOpenNewProject] = useState(false);
  const [openNewTask, setOpenNewTask] = useState(false);

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('EV Customization');
  const [newProjectLeadRef, setNewProjectLeadRef] = useState('APP-1252');
  const [newProjectBudget, setNewProjectBudget] = useState('₹2.5L');
  const [newProjectDueDate, setNewProjectDueDate] = useState('20 Sep 2026');

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState(INITIAL_PROJECTS[0].name);
  const [newTaskAssignee, setNewTaskAssignee] = useState('Vijay K.');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [newTaskDueDate, setNewTaskDueDate] = useState('08 Sep 2026');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      showToast('Please enter project name', 'error');
      return;
    }
    const newProj: Project = {
      id: `PRJ-${Math.floor(100 + Math.random() * 900)}`,
      name: newProjectName.trim(),
      leadRef: newProjectLeadRef,
      category: newProjectCategory,
      status: 'In Progress',
      progress: 10,
      dueDate: newProjectDueDate,
      budget: newProjectBudget,
      tasksCount: { total: 1, done: 0 },
      team: [{ name: 'Admin' }],
    };
    setProjects([newProj, ...projects]);
    setOpenNewProject(false);
    setNewProjectName('');
    showToast('New project created successfully!', 'success');
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      showToast('Please enter task title', 'error');
      return;
    }
    const newTask: TaskItem = {
      id: `TSK-${Math.floor(200 + Math.random() * 800)}`,
      title: newTaskTitle.trim(),
      projectName: newTaskProject,
      assignee: newTaskAssignee,
      priority: newTaskPriority,
      status: 'To Do',
      dueDate: newTaskDueDate,
    };
    setTasks([newTask, ...tasks]);
    setOpenNewTask(false);
    setNewTaskTitle('');
    showToast('Task added successfully!', 'success');
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus: TaskItem['status'] =
            t.status === 'To Do'
              ? 'In Progress'
              : t.status === 'In Progress'
              ? 'In Review'
              : t.status === 'In Review'
              ? 'Done'
              : 'To Do';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
    showToast('Task status updated', 'info');
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.leadRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<Project['status'], { bg: string; color: string }> = {
    'In Progress': { bg: '#EAF6E8', color: '#087A3D' },
    Planning: { bg: '#EFF6FF', color: '#2563EB' },
    'On Hold': { bg: '#FEF3C7', color: '#D97706' },
    Completed: { bg: '#ECFDF5', color: '#059669' },
  };

  const priorityColors: Record<TaskItem['priority'], { bg: string; color: string }> = {
    High: { bg: '#FFE4E6', color: '#E11D48' },
    Medium: { bg: '#FEF3C7', color: '#D97706' },
    Low: { bg: '#EFF6FF', color: '#2563EB' },
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* 1. Header & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#023020' }}>
            Project & Task Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#7A8B80' }}>
            Track lead delivery projects, custom vehicle fitments, and operational team tasks.
          </Typography>
        </div>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={() => setOpenNewTask(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: '#087A3D', color: '#087A3D' }}
          >
            New Task
          </Button>
          <Button
            variant="contained"
            startIcon={<FolderPlus size={16} />}
            onClick={() => setOpenNewProject(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, backgroundColor: '#087A3D', '&:hover': { backgroundColor: '#023020' } }}
          >
            New Project
          </Button>
        </Box>
      </Box>

      {/* 2. KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #E4EBE1', background: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#7A8B80', textTransform: 'uppercase' }}>
                Active Projects
              </Typography>
              <Briefcase size={20} color="#087A3D" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#023020' }}>
              {projects.filter((p) => p.status !== 'Completed').length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#087A3D', fontWeight: 600 }}>
              +2 created this week
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #E4EBE1', background: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#7A8B80', textTransform: 'uppercase' }}>
                Tasks Completed
              </Typography>
              <CheckCircle2 size={20} color="#2563EB" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#023020' }}>
              {tasks.filter((t) => t.status === 'Done').length} / {tasks.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 600 }}>
              75% completion rate
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #E4EBE1', background: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#7A8B80', textTransform: 'uppercase' }}>
                Pending Review
              </Typography>
              <Clock size={20} color="#D97706" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#023020' }}>
              {tasks.filter((t) => t.status === 'In Review').length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>
              Awaiting QC approval
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #E4EBE1', background: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#7A8B80', textTransform: 'uppercase' }}>
                Active Team
              </Typography>
              <UserCheck size={20} color="#7C3AED" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#023020' }}>
              8 Members
            </Typography>
            <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 600 }}>
              Across 3 departments
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Search & Tabs Toolbar */}
      <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} sx={{ minHeight: 40 }}>
            <Tab label={`All Projects (${projects.length})`} icon={<Briefcase size={16} />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 700 }} />
            <Tab label={`Task Board (${tasks.length})`} icon={<ListTodo size={16} />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 700 }} />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search projects or tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search size={16} style={{ marginRight: 8, color: '#7A8B80' }} />,
            }}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Box>
      </Paper>

      {/* 4. Tab 0: Projects Grid */}
      {activeTab === 0 && (
        <Grid container spacing={2.5}>
          {filteredProjects.map((proj) => {
            const stTheme = statusColors[proj.status];
            return (
              <Grid item xs={12} md={6} key={proj.id}>
                <Card sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', boxShadow: 'none', transition: 'all 0.2s', '&:hover': { borderColor: '#087A3D', boxShadow: '0 4px 14px rgba(8,122,61,0.08)' } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <div>
                        <Chip label={proj.leadRef} size="small" sx={{ fontWeight: 700, fontSize: 11, background: '#EAF6E8', color: '#087A3D', mb: 0.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#023020', fontSize: 16 }}>
                          {proj.name}
                        </Typography>
                      </div>
                      <Chip label={proj.status} size="small" sx={{ fontWeight: 700, background: stTheme.bg, color: stTheme.color }} />
                    </Box>

                    <Typography variant="body2" sx={{ color: '#7A8B80', mb: 2, fontSize: 13 }}>
                      Category: <strong>{proj.category}</strong> • Budget: <strong>{proj.budget}</strong>
                    </Typography>

                    {/* Progress Bar */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#44584C' }}>
                          Progress
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#087A3D' }}>
                          {proj.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={proj.progress}
                        sx={{ height: 7, borderRadius: 4, backgroundColor: '#E4EBE1', '& .MuiLinearProgress-bar': { backgroundColor: '#087A3D' } }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #F0F4EF' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Calendar size={14} color="#7A8B80" />
                        <Typography variant="caption" sx={{ color: '#7A8B80', fontWeight: 600 }}>
                          Due: {proj.dueDate}
                        </Typography>
                      </Box>
                      <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: 11, bgcolor: '#087A3D' } }}>
                        {proj.team.map((m, idx) => (
                          <Avatar key={idx}>{m.name.charAt(0)}</Avatar>
                        ))}
                      </AvatarGroup>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 5. Tab 1: Task Board */}
      {activeTab === 1 && (
        <Paper sx={{ border: '1px solid #E4EBE1', borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 700, p: 2 }}>
              {filteredTasks.map((t) => {
                const prTheme = priorityColors[t.priority];
                return (
                  <Paper
                    key={t.id}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      borderRadius: '10px',
                      border: '1px solid #E4EBE1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      '&:hover': { background: '#F8FAF8' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <IconButton size="small" onClick={() => handleToggleTaskStatus(t.id)}>
                        {t.status === 'Done' ? <CheckCircle2 color="#087A3D" size={22} /> : <Clock color="#7A8B80" size={22} />}
                      </IconButton>
                      <div>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 700,
                            color: '#16231B',
                            textDecoration: t.status === 'Done' ? 'line-through' : 'none',
                          }}
                        >
                          {t.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7A8B80' }}>
                          Project: {t.projectName} • Assignee: <strong>{t.assignee}</strong>
                        </Typography>
                      </div>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip label={t.priority} size="small" sx={{ fontWeight: 700, background: prTheme.bg, color: prTheme.color, fontSize: 11 }} />
                      <Chip label={t.status} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                      <Typography variant="caption" sx={{ color: '#7A8B80', minWidth: 80, textAlign: 'right' }}>
                        {t.dueDate}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        </Paper>
      )}

      {/* New Project Dialog */}
      <Dialog open={openNewProject} onClose={() => setOpenNewProject(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020' }}>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Title"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            margin="dense"
            placeholder="e.g. Battery Swapping Station Setup"
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={newProjectCategory}
                onChange={(e) => setNewProjectCategory(e.target.value)}
                margin="dense"
              >
                <MenuItem value="EV Customization">EV Customization</MenuItem>
                <MenuItem value="Fleet Modification">Fleet Modification</MenuItem>
                <MenuItem value="Fitment">Fitment</MenuItem>
                <MenuItem value="Compliance & Audit">Compliance & Audit</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Lead Reference"
                value={newProjectLeadRef}
                onChange={(e) => setNewProjectLeadRef(e.target.value)}
                margin="dense"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Estimated Budget"
                value={newProjectBudget}
                onChange={(e) => setNewProjectBudget(e.target.value)}
                margin="dense"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Target Completion Date"
                value={newProjectDueDate}
                onChange={(e) => setNewProjectDueDate(e.target.value)}
                margin="dense"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenNewProject(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateProject} sx={{ backgroundColor: '#087A3D', '&:hover': { backgroundColor: '#023020' } }}>
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={openNewTask} onClose={() => setOpenNewTask(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#023020' }}>Add New Task</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            margin="dense"
            placeholder="e.g. Inspect high-voltage wiring harness"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            select
            label="Select Project"
            value={newTaskProject}
            onChange={(e) => setNewTaskProject(e.target.value)}
            margin="dense"
            sx={{ mb: 2 }}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.name}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Assignee"
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                margin="dense"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                select
                label="Priority"
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                margin="dense"
              >
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Due Date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                margin="dense"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenNewTask(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTask} sx={{ backgroundColor: '#087A3D', '&:hover': { backgroundColor: '#023020' } }}>
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
