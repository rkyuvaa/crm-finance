import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  Avatar,
  AvatarGroup,
  LinearProgress,
  MenuItem,
  Select,
} from '@mui/material';
import {
  Plus,
  Search,
  MoreVertical,
  X,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastHost';

// ── Types ──
interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Blocked';
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  assignees: string[];
  dueDate: string;
  subtasks: { title: string; done: boolean }[];
  tags: string[];
  estimatedHours: number;
  actualHours: number;
}

interface Project {
  id: string;
  name: string;
}

// ── Mock Data ──
const PROJECTS: Project[] = [
  { id: 'PRJ-101', name: 'KIM Electric Scooter V2 Customization' },
  { id: 'PRJ-102', name: 'Commercial Fleet Battery Upgrade - Batch 4' },
  { id: 'PRJ-103', name: 'Pre-Delivery Inspection & GPS Telematics Fitment' },
  { id: 'PRJ-104', name: 'Custom Loan Subsidy Documentation Setup' },
];

const TEAM_MEMBERS = [
  'Vijay K.',
  'Anish R.',
  'Pooja S.',
  'Rahul M.',
  'Tharun I.',
  'Deepak J.',
  'Meena D.',
  'Kavya V.',
];

const INITIAL_TASKS: Task[] = [
  {
    id: 'TSK-1001',
    title: 'Finalize RTO Registration documents for APP-1251',
    description: 'Complete all RTO registration paperwork and get approvals from legal team.',
    projectId: 'PRJ-101',
    projectName: 'KIM Electric Scooter V2 Customization',
    status: 'In Progress',
    priority: 'Urgent',
    assignees: ['Vijay K.', 'Anish R.'],
    dueDate: '02 Sep 2026',
    subtasks: [
      { title: 'Prepare RTO forms', done: true },
      { title: 'Get signatures', done: true },
      { title: 'Submit to authorities', done: false },
      { title: 'Track approval', done: false },
    ],
    tags: ['Compliance', 'Urgent'],
    estimatedHours: 12,
    actualHours: 8,
  },
  {
    id: 'TSK-1002',
    title: 'Verify Financier Subsidy Approval Certificate',
    description: 'Cross-check subsidy certificate against original documents.',
    projectId: 'PRJ-101',
    projectName: 'KIM Electric Scooter V2 Customization',
    status: 'In Review',
    priority: 'High',
    assignees: ['Anish R.'],
    dueDate: '04 Sep 2026',
    subtasks: [
      { title: 'Verify against original', done: true },
      { title: 'Create verification report', done: true },
      { title: 'Send to financier', done: false },
    ],
    tags: ['Finance', 'Review'],
    estimatedHours: 6,
    actualHours: 5,
  },
  {
    id: 'TSK-1003',
    title: 'Install Dual-Battery Connector Harness',
    description: 'Install and test the dual-battery connector for fleet vehicles.',
    projectId: 'PRJ-102',
    projectName: 'Commercial Fleet Battery Upgrade - Batch 4',
    status: 'To Do',
    priority: 'High',
    assignees: ['Rahul M.'],
    dueDate: '10 Sep 2026',
    subtasks: [
      { title: 'Prepare harness kit', done: false },
      { title: 'Install connectors', done: false },
      { title: 'Test connections', done: false },
    ],
    tags: ['Technical', 'Installation'],
    estimatedHours: 16,
    actualHours: 0,
  },
  {
    id: 'TSK-1004',
    title: 'Perform 50-point Quality PDI Check',
    description: 'Complete pre-delivery inspection checklist for all vehicles.',
    projectId: 'PRJ-103',
    projectName: 'Pre-Delivery Inspection & GPS Telematics Fitment',
    status: 'Done',
    priority: 'Normal',
    assignees: ['Deepak J.', 'Vijay K.'],
    dueDate: '29 Aug 2026',
    subtasks: [
      { title: 'Mechanical checks', done: true },
      { title: 'Electrical checks', done: true },
      { title: 'Document findings', done: true },
    ],
    tags: ['QA', 'Completed'],
    estimatedHours: 10,
    actualHours: 10,
  },
  {
    id: 'TSK-1005',
    title: 'Setup GPS Telematics Dashboard Integration',
    description: 'Integrate GPS tracking system with main dashboard and test live feeds.',
    projectId: 'PRJ-103',
    projectName: 'Pre-Delivery Inspection & GPS Telematics Fitment',
    status: 'In Progress',
    priority: 'High',
    assignees: ['Rahul M.', 'Tharun I.'],
    dueDate: '05 Sep 2026',
    subtasks: [
      { title: 'API integration', done: true },
      { title: 'Dashboard updates', done: false },
      { title: 'Live testing', done: false },
    ],
    tags: ['Backend', 'Integration'],
    estimatedHours: 20,
    actualHours: 12,
  },
  {
    id: 'TSK-1006',
    title: 'Create Loan Subsidy Documentation Template',
    description: 'Design reusable documentation template for loan subsidy programs.',
    projectId: 'PRJ-104',
    projectName: 'Custom Loan Subsidy Documentation Setup',
    status: 'Blocked',
    priority: 'Normal',
    assignees: ['Meena D.'],
    dueDate: '08 Sep 2026',
    subtasks: [
      { title: 'Gather requirements', done: true },
      { title: 'Design template', done: false },
    ],
    tags: ['Documentation', 'Blocked'],
    estimatedHours: 8,
    actualHours: 2,
  },
];

// ── Status & Priority Colors ──
const STATUS_CONFIG = {
  'To Do': { bg: '#F3F4F6', color: '#6B7280' },
  'In Progress': { bg: '#FEF3C7', color: '#D97706' },
  'In Review': { bg: '#E0E7FF', color: '#4F46E5' },
  Done: { bg: '#D1FAE5', color: '#059669' },
  Blocked: { bg: '#FEE2E2', color: '#DC2626' },
};

const PRIORITY_CONFIG = {
  Urgent: { bg: '#FEE2E2', color: '#DC2626', label: '🔴' },
  High: { bg: '#FED7AA', color: '#D97706', label: '🟠' },
  Normal: { bg: '#BFDBFE', color: '#2563EB', label: '🔵' },
  Low: { bg: '#E5E7EB', color: '#6B7280', label: '⚪' },
};

// ── Main Component ──
export default function TasksPage() {
  const { showToast } = useToast();
  const [view, setView] = useState<'list' | 'board' | 'calendar' | 'gantt' | 'workload'>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'assignee'>('status');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openDetailPanel, setOpenDetailPanel] = useState(false);

  // New Task Form
  const [newTask, setNewTask] = useState({
    title: '',
    projectId: PROJECTS[0].id,
    priority: 'Normal' as const,
    assignees: [] as string[],
    dueDate: '',
    description: '',
  });

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Group Tasks
  const groupedTasks = filteredTasks.reduce(
    (acc, task) => {
      let key = '';
      if (groupBy === 'status') key = task.status;
      else if (groupBy === 'priority') key = task.priority;
      else if (groupBy === 'assignee') key = task.assignees[0] || 'Unassigned';

      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      showToast('Please enter task title', 'error');
      return;
    }
    const created: Task = {
      id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newTask.title,
      description: newTask.description,
      projectId: newTask.projectId,
      projectName: PROJECTS.find((p) => p.id === newTask.projectId)?.name || '',
      status: 'To Do',
      priority: newTask.priority,
      assignees: newTask.assignees,
      dueDate: newTask.dueDate,
      subtasks: [],
      tags: [],
      estimatedHours: 0,
      actualHours: 0,
    };
    setTasks([created, ...tasks]);
    setOpenTaskDialog(false);
    setNewTask({
      title: '',
      projectId: PROJECTS[0].id,
      priority: 'Normal',
      assignees: [],
      dueDate: '',
      description: '',
    });
    showToast('Task created successfully!', 'success');
  };

  const handleTaskStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    showToast('Task status updated', 'info');
  };

  // ── Render List View ──
  const renderListView = () => (
    <Box>
      {Object.entries(groupedTasks).map(([group, groupTasks]) => {
        const statusConfig = STATUS_CONFIG[group as keyof typeof STATUS_CONFIG];
        return (
          <Box key={group} sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                bgcolor: '#F9FAFB',
                borderRadius: '10px',
              }}
            >
              <ChevronDown size={16} />
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: statusConfig?.color || '#999',
                }}
              />
              <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>
                {group}
              </Typography>
              <Chip
                label={groupTasks.length}
                size="small"
                sx={{ ml: 'auto', fontWeight: 700, fontSize: '11px' }}
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              {groupTasks.map((task) => (
                <Card
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setOpenDetailPanel(true);
                  }}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr 100px 80px 100px 60px 40px',
                    alignItems: 'center',
                    gap: 1.5,
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                  }}
                >
                  <input
                    type="checkbox"
                    onChange={() => handleTaskStatusChange(task.id, 'Done')}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>
                      {task.title}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                      {task.projectName}
                    </Typography>
                  </Box>
                  <Chip
                    label={task.status}
                    size="small"
                    sx={{
                      bgcolor: STATUS_CONFIG[task.status].bg,
                      color: STATUS_CONFIG[task.status].color,
                      fontWeight: 600,
                      fontSize: '11px',
                      height: 24,
                    }}
                  />
                  <Chip
                    label={PRIORITY_CONFIG[task.priority].label + ' ' + task.priority}
                    size="small"
                    sx={{
                      bgcolor: PRIORITY_CONFIG[task.priority].bg,
                      color: PRIORITY_CONFIG[task.priority].color,
                      fontWeight: 600,
                      fontSize: '11px',
                      height: 24,
                    }}
                  />
                  <AvatarGroup max={2} sx={{ justifyContent: 'flex-start' }}>
                    {task.assignees.map((a) => (
                      <Avatar key={a} sx={{ width: 24, height: 24, fontSize: '10px' }}>
                        {a.split(' ').map((n) => n[0]).join('')}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    {task.dueDate}
                  </Typography>
                  <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical size={16} />
                  </IconButton>
                </Card>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  // ── Render Board View ──
  const renderBoardView = () => {
    const statuses: (keyof typeof STATUS_CONFIG)[] = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
    return (
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {statuses.map((status) => {
          const statusTasks = filteredTasks.filter((t) => t.status === status);
          return (
            <Box
              key={status}
              sx={{
                minWidth: 280,
                bgcolor: '#F9FAFB',
                borderRadius: '12px',
                p: 1.5,
                border: '1px solid #E5E7EB',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: STATUS_CONFIG[status].color,
                    }}
                  />
                  <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>
                    {status}
                  </Typography>
                </Box>
                <Chip label={statusTasks.length} size="small" variant="outlined" />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {statusTasks.map((task) => (
                  <Card
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setOpenDetailPanel(true);
                    }}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: '13px', mb: 0.5 }}>
                      {task.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                      {task.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '10px' }}
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AvatarGroup max={2} sx={{ width: 'auto' }}>
                        {task.assignees.map((a) => (
                          <Avatar key={a} sx={{ width: 20, height: 20, fontSize: '8px' }}>
                            {a.split(' ').map((n) => n[0]).join('')}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                        {task.actualHours}h/{task.estimatedHours}h
                      </Typography>
                    </Box>
                  </Card>
                ))}
                <Button variant="outlined" size="small" fullWidth sx={{ textTransform: 'none', mt: 1 }}>
                  + Add task
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  // ── Render Workload View ──
  const renderWorkloadView = () => {
    const teamWorkload = TEAM_MEMBERS.map((member) => {
      const memberTasks = filteredTasks.filter((t) => t.assignees.includes(member));
      const totalHours = memberTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      const actualHours = memberTasks.reduce((sum, t) => sum + t.actualHours, 0);
      const capacity = 40;
      return { member, memberTasks, totalHours, actualHours, capacity };
    });

    return (
      <Grid container spacing={2}>
        {teamWorkload.map((item) => (
          <Grid item xs={12} key={item.member}>
            <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 40, height: 40 }}>
                {item.member
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '14px' }}>
                  {item.member}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    {item.memberTasks.length} tasks
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    {item.actualHours}h / {item.totalHours}h
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((item.totalHours / item.capacity) * 100, 100)}
                sx={{
                  width: 120,
                  height: 8,
                  borderRadius: '4px',
                  bgcolor: '#E5E7EB',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: item.totalHours > item.capacity ? '#DC2626' : '#059669',
                  },
                }}
              />
              <Typography sx={{ fontSize: '12px', fontWeight: 600, minWidth: 50 }}>
                {Math.round((item.totalHours / item.capacity) * 100)}%
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // ── Task Detail Panel ──
  const renderDetailPanel = () => {
    if (!selectedTask) return null;

    return (
      <Dialog open={openDetailPanel} onClose={() => setOpenDetailPanel(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '16px', pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selectedTask.id}</span>
            <IconButton size="small" onClick={() => setOpenDetailPanel(false)}>
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '15px' }}>
            {selectedTask.title}
          </Typography>
          <Box>
            <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
              Project
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>
              {selectedTask.projectName}
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                Status
              </Typography>
              <Chip
                label={selectedTask.status}
                sx={{
                  bgcolor: STATUS_CONFIG[selectedTask.status].bg,
                  color: STATUS_CONFIG[selectedTask.status].color,
                  fontWeight: 600,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                Priority
              </Typography>
              <Chip
                label={PRIORITY_CONFIG[selectedTask.priority].label + ' ' + selectedTask.priority}
                sx={{
                  bgcolor: PRIORITY_CONFIG[selectedTask.priority].bg,
                  color: PRIORITY_CONFIG[selectedTask.priority].color,
                  fontWeight: 600,
                }}
              />
            </Grid>
          </Grid>
          {selectedTask.subtasks.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                Subtasks ({selectedTask.subtasks.filter((s) => s.done).length}/
                {selectedTask.subtasks.length})
              </Typography>
              {selectedTask.subtasks.map((sub, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5 }}>
                  <input type="checkbox" checked={sub.done} readOnly />
                  <span style={{ textDecoration: sub.done ? 'line-through' : 'none' }}>
                    {sub.title}
                  </span>
                </Box>
              ))}
            </Box>
          )}
          <Box>
            <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
              Time Tracking
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min((selectedTask.actualHours / selectedTask.estimatedHours) * 100, 100)}
              sx={{ height: 6, borderRadius: '3px', mb: 0.5 }}
            />
            <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
              {selectedTask.actualHours}h logged / {selectedTask.estimatedHours}h estimated
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
              Assignees
            </Typography>
            <AvatarGroup>
              {selectedTask.assignees.map((a) => (
                <Avatar key={a} title={a}>
                  {a
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </Avatar>
              ))}
            </AvatarGroup>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#023020' }}>
          Task Management
        </Typography>
        <Typography variant="body2" sx={{ color: '#7A8B80', mt: 0.5 }}>
          Manage, track, and collaborate on project tasks with multiple views and real-time insights.
        </Typography>
      </Box>

      {/* Top Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2.5,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: 300 }}>
          <Search size={16} color="#999" />
          <TextField
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ flex: 1, fontSize: '13px' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="All">All Priorities</MenuItem>
            <MenuItem value="Urgent">Urgent</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Normal">Normal</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </Select>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="To Do">To Do</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="In Review">In Review</MenuItem>
            <MenuItem value="Done">Done</MenuItem>
            <MenuItem value="Blocked">Blocked</MenuItem>
          </Select>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setOpenTaskDialog(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            New Task
          </Button>
        </Box>
      </Box>

      {/* View Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, borderBottom: '1px solid #E5E7EB', pb: 1 }}>
        {[
          { id: 'list', label: '☰ List' },
          { id: 'board', label: '▦ Board' },
          { id: 'calendar', label: '📅 Calendar' },
          { id: 'gantt', label: '📊 Gantt' },
          { id: 'workload', label: '📈 Workload' },
        ].map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            sx={{
              textTransform: 'none',
              fontWeight: view === tab.id ? 700 : 500,
              color: view === tab.id ? '#087A3D' : '#6B7280',
              borderBottom: view === tab.id ? '2px solid #087A3D' : 'none',
              pb: 1,
              '&:hover': { color: '#087A3D' },
            }}
          >
            {tab.label}
          </Button>
        ))}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            size="small"
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="status">Group by Status</MenuItem>
            <MenuItem value="priority">Group by Priority</MenuItem>
            <MenuItem value="assignee">Group by Assignee</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* View Content */}
      <Paper sx={{ p: 2, borderRadius: '14px', border: '1px solid #E4EBE1' }}>
        {view === 'list' && renderListView()}
        {view === 'board' && renderBoardView()}
        {view === 'workload' && renderWorkloadView()}
        {(view === 'calendar' || view === 'gantt') && (
          <Typography sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
            {view === 'calendar' ? 'Calendar View' : 'Gantt Chart View'} — Coming soon
          </Typography>
        )}
      </Paper>

      {/* New Task Dialog */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Task Title"
            fullWidth
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <Select
            value={newTask.projectId}
            onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
          >
            {PROJECTS.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
          >
            <MenuItem value="Urgent">Urgent</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Normal">Normal</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </Select>
          <TextField
            label="Due Date"
            type="date"
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTask}>
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Panel */}
      {renderDetailPanel()}
    </Box>
  );
}
