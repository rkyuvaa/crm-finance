import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Calendar as BigCalendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, eachDayOfInterval } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Box,
  Button,
  Card,
  Chip,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
  Avatar,
  AvatarGroup,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import {
  Plus,
  Search,
  MoreVertical,
  X,
  ChevronDown,
  GripVertical,
  ChevronLeft,
  ChevronRight,
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
  const [view, setView] = useState<'list' | 'board' | 'calendar' | 'gantt' | 'workload'>('board');
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'assignee'>('status');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openDetailPanel, setOpenDetailPanel] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<Task['status'] | ''>('');

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks-app-data');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
        showToast('Tasks loaded from storage', 'info');
      } catch (e) {
        showToast('Failed to load saved tasks', 'error');
      }
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks-app-data', JSON.stringify(tasks));
  }, [tasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search tasks..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
      // Escape: Close detail panel
      if (e.key === 'Escape' && openDetailPanel) {
        setOpenDetailPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openDetailPanel]);

  // Filtered Tasks with Enhanced Filtering
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesAssignee = filterAssignee === 'All' || t.assignees.includes(filterAssignee);
    const matchesProject = filterProject === 'All' || t.projectId === filterProject;
    return matchesSearch && matchesPriority && matchesStatus && matchesAssignee && matchesProject;
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

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStatus = destination.droppableId as Task['status'];
    const taskId = draggableId;

    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    showToast(`Task moved to ${newStatus}`, 'success');
  };

  // Handle task status update
  const handleTaskStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    showToast('Task status updated', 'info');
  };

  // Bulk Operations
  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleBulkStatusUpdate = (newStatus: Task['status']) => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks first', 'warning');
      return;
    }
    setTasks(
      tasks.map((t) =>
        selectedTasks.has(t.id) ? { ...t, status: newStatus } : t
      )
    );
    setSelectedTasks(new Set());
    showToast(`Updated ${selectedTasks.size} tasks`, 'success');
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks first', 'warning');
      return;
    }
    setTasks(tasks.filter((t) => !selectedTasks.has(t.id)));
    setSelectedTasks(new Set());
    showToast(`Deleted ${selectedTasks.size} tasks`, 'success');
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

  // ── Render Board View with Drag-Drop ──
  const renderBoardView = () => {
    const statuses: (keyof typeof STATUS_CONFIG)[] = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {statuses.map((status) => {
            const statusTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <Droppable key={status} droppableId={status} type="TASK">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minWidth: 300,
                      bgcolor: snapshot.isDraggingOver ? '#F0F9FF' : '#F9FAFB',
                      borderRadius: '12px',
                      p: 1.5,
                      border: snapshot.isDraggingOver ? '2px solid #087A3D' : '1px solid #E5E7EB',
                      transition: 'all 0.2s ease',
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
                      {statusTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => {
                                setSelectedTask(task);
                                setOpenDetailPanel(true);
                              }}
                              sx={{
                                p: 1.5,
                                borderRadius: '10px',
                                border: '1px solid #E5E7EB',
                                cursor: 'grab',
                                backgroundColor: snapshot.isDragging ? '#FFF' : 'inherit',
                                boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
                                transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                              }}
                            >
                              <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                                <GripVertical size={14} color="#999" style={{ marginTop: 2, flexShrink: 0 }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontWeight: 600, fontSize: '13px', mb: 0.5 }}>
                                    {task.id}
                                  </Typography>
                                  <Typography sx={{ fontWeight: 600, fontSize: '13px', mb: 0.5 }}>
                                    {task.title}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                                {task.tags.slice(0, 2).map((tag) => (
                                  <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '10px' }}
                                  />
                                ))}
                                {task.tags.length > 2 && (
                                  <Chip
                                    label={`+${task.tags.length - 2}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '10px' }}
                                  />
                                )}
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <AvatarGroup max={2} sx={{ width: 'auto' }}>
                                  {task.assignees.map((a) => (
                                    <Avatar key={a} sx={{ width: 20, height: 20, fontSize: '8px' }}>
                                      {a.split(' ').map((n) => n[0]).join('')}
                                    </Avatar>
                                  ))}
                                </AvatarGroup>
                                <Chip
                                  label={PRIORITY_CONFIG[task.priority].label}
                                  size="small"
                                  sx={{
                                    bgcolor: PRIORITY_CONFIG[task.priority].bg,
                                    color: PRIORITY_CONFIG[task.priority].color,
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    height: 22,
                                  }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                                  {task.actualHours}h/{task.estimatedHours}h
                                </Typography>
                                <Typography sx={{ fontSize: '10px', color: '#9CA3AF' }}>
                                  {task.dueDate}
                                </Typography>
                              </Box>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<Plus size={14} />}
                      sx={{ textTransform: 'none', mt: 1, fontSize: '12px' }}
                    >
                      Add task
                    </Button>
                  </Box>
                )}
              </Droppable>
            );
          })}
        </Box>
      </DragDropContext>
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

  // ── Render Calendar View ──
  const renderCalendarView = () => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get tasks by date
    const tasksByDate = daysInMonth.map((date) => {
      const dateStr = format(date, 'dd MMM yyyy');
      return {
        date,
        dateStr,
        tasks: filteredTasks.filter((t) => t.dueDate === dateStr),
      };
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Calendar Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '18px' }}>
            {format(calendarMonth, 'MMMM yyyy')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={() => setCalendarMonth(addDays(calendarMonth, -30))}
              startIcon={<ChevronLeft size={16} />}
            >
              Prev
            </Button>
            <Button
              size="small"
              onClick={() => setCalendarMonth(new Date())}
              variant="outlined"
            >
              Today
            </Button>
            <Button
              size="small"
              onClick={() => setCalendarMonth(addDays(calendarMonth, 30))}
              endIcon={<ChevronRight size={16} />}
            >
              Next
            </Button>
          </Box>
        </Box>

        {/* Weekday Headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Box key={day} sx={{ textAlign: 'center', fontWeight: 700, color: '#6B7280', py: 1 }}>
              {day}
            </Box>
          ))}
        </Box>

        {/* Calendar Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {tasksByDate.map(({ date, dateStr, tasks }) => (
            <Card
              key={dateStr}
              sx={{
                p: 1,
                minHeight: 100,
                bgcolor: date.getDate() === new Date().getDate() ? '#F0F9FF' : '#F9FAFB',
                border: date.getDate() === new Date().getDate() ? '2px solid #087A3D' : '1px solid #E5E7EB',
                cursor: 'pointer',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '12px' }}>
                  {format(date, 'd')}
                </Typography>
                {tasks.length > 0 && (
                  <Chip label={tasks.length} size="small" sx={{ height: 20, fontSize: '10px' }} />
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {tasks.slice(0, 3).map((task) => (
                  <Box
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setOpenDetailPanel(true);
                    }}
                    sx={{
                      p: 0.5,
                      bgcolor: PRIORITY_CONFIG[task.priority].bg,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 },
                    }}
                  >
                    <Typography sx={{ fontSize: '9px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </Typography>
                  </Box>
                ))}
                {tasks.length > 3 && (
                  <Typography sx={{ fontSize: '9px', color: '#6B7280', fontStyle: 'italic' }}>
                    +{tasks.length - 3} more
                  </Typography>
                )}
              </Box>
            </Card>
          ))}
        </Box>
      </Box>
    );
  };

  // ── Render Gantt Chart View ──
  const renderGanttView = () => {
    const today = new Date();
    const ganttStart = addDays(today, -7);
    const ganttEnd = addDays(today, 60);
    const ganttDays = eachDayOfInterval({ start: ganttStart, end: ganttEnd });
    const pixelsPerDay = 40;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowX: 'auto' }}>
        {/* Timeline Header */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ width: 200, flexShrink: 0 }} />
          <Box sx={{ display: 'flex', gap: 0 }}>
            {ganttDays.map((day, idx) => (
              <Box
                key={idx}
                sx={{
                  width: pixelsPerDay,
                  textAlign: 'center',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: day.toDateString() === today.toDateString() ? '#087A3D' : '#6B7280',
                  py: 0.5,
                  borderRight: day.toDateString() === today.toDateString() ? '2px solid #087A3D' : '1px solid #E5E7EB',
                }}
              >
                {format(day, 'd')}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Gantt Rows */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredTasks.map((task) => {
            const taskStart = new Date(task.dueDate.split(' ').reverse().join('-'));
            const taskEnd = addDays(taskStart, 3); // Assume 3-day duration
            
            // Find positions
            const startIdx = Math.max(0, Math.floor((taskStart.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)));
            const endIdx = Math.min(ganttDays.length, Math.floor((taskEnd.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)));
            const duration = endIdx - startIdx;

            return (
              <Box key={task.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 200,
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    '&:hover': { fontWeight: 700 },
                  }}
                  onClick={() => {
                    setSelectedTask(task);
                    setOpenDetailPanel(true);
                  }}
                >
                  <Typography sx={{ fontSize: '12px', fontWeight: 500 }}>
                    {task.id}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                    {task.title}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 0, flex: 1 }}>
                  {ganttDays.map((day, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: pixelsPerDay,
                        height: 40,
                        borderRight: '1px solid #E5E7EB',
                        bgcolor: idx === startIdx ? 'transparent' : 'transparent',
                        position: 'relative',
                      }}
                    >
                      {idx >= startIdx && idx < endIdx && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: idx === startIdx ? 2 : 0,
                            top: 4,
                            right: idx === endIdx - 1 ? 2 : 0,
                            height: 32,
                            bgcolor: STATUS_CONFIG[task.status].bg,
                            border: `2px solid ${STATUS_CONFIG[task.status].color}`,
                            borderRadius: idx === startIdx ? '6px 0 0 6px' : idx === endIdx - 1 ? '0 6px 6px 0' : '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8 },
                          }}
                          onClick={() => {
                            setSelectedTask(task);
                            setOpenDetailPanel(true);
                          }}
                        >
                          {idx === startIdx && (
                            <Typography sx={{ fontSize: '9px', fontWeight: 600, color: STATUS_CONFIG[task.status].color }}>
                              {PRIORITY_CONFIG[task.priority].label}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Legend */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 3 }}>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: config.bg, border: `2px solid ${config.color}`, borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>{status}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // ── Task Detail Panel ──
  // ── Task Detail Panel with Subtask Management ──
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskIdx, setEditingSubtaskIdx] = useState<number | null>(null);

  const handleToggleSubtask = (subtaskIdx: number) => {
    if (!selectedTask) return;
    const updated = {
      ...selectedTask,
      subtasks: selectedTask.subtasks.map((sub, idx) => 
        idx === subtaskIdx ? { ...sub, done: !sub.done } : sub
      ),
    };
    setTasks(tasks.map((t) => (t.id === selectedTask.id ? updated : t)));
    setSelectedTask(updated);
    showToast('Subtask toggled', 'info');
  };

  const handleAddSubtask = () => {
    if (!selectedTask || !newSubtaskTitle.trim()) return;
    const updated = {
      ...selectedTask,
      subtasks: [...selectedTask.subtasks, { title: newSubtaskTitle, done: false }],
    };
    setTasks(tasks.map((t) => (t.id === selectedTask.id ? updated : t)));
    setSelectedTask(updated);
    setNewSubtaskTitle('');
    showToast('Subtask added', 'success');
  };

  const handleDeleteSubtask = (subtaskIdx: number) => {
    if (!selectedTask) return;
    const updated = {
      ...selectedTask,
      subtasks: selectedTask.subtasks.filter((_, idx) => idx !== subtaskIdx),
    };
    setTasks(tasks.map((t) => (t.id === selectedTask.id ? updated : t)));
    setSelectedTask(updated);
    showToast('Subtask deleted', 'info');
  };

  const handleUpdateTimeTracking = (estimated: number, actual: number) => {
    if (!selectedTask) return;
    const updated = {
      ...selectedTask,
      estimatedHours: estimated,
      actualHours: actual,
    };
    setTasks(tasks.map((t) => (t.id === selectedTask.id ? updated : t)));
    setSelectedTask(updated);
    showToast('Time tracking updated', 'success');
  };

  const renderDetailPanel = () => {
    if (!selectedTask) return null;

    const completedSubtasks = selectedTask.subtasks.filter((s) => s.done).length;
    const totalSubtasks = selectedTask.subtasks.length;

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
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '70vh', overflowY: 'auto' }}>
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

          {/* Enhanced Subtasks Section */}
          <Box sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>
                Subtasks ({completedSubtasks}/{totalSubtasks})
              </Typography>
              {totalSubtasks > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={(completedSubtasks / totalSubtasks) * 100}
                  sx={{ width: 60, height: 4, borderRadius: '2px' }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
              {selectedTask.subtasks.map((sub, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.75,
                    bgcolor: '#FFF',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sub.done}
                    onChange={() => handleToggleSubtask(idx)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: '12px',
                      textDecoration: sub.done ? 'line-through' : 'none',
                      color: sub.done ? '#9CA3AF' : '#1F2937',
                    }}
                  >
                    {sub.title}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSubtask(idx)}
                    sx={{ color: '#EF4444' }}
                  >
                    <X size={14} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {/* Add New Subtask */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <TextField
                size="small"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                sx={{ flex: 1, fontSize: '12px' }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleAddSubtask}
                sx={{ textTransform: 'none' }}
              >
                Add
              </Button>
            </Box>
          </Box>

          {/* Enhanced Time Tracking Section */}
          <Box sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: '10px' }}>
            <Typography sx={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, mb: 1 }}>
              Time Tracking
            </Typography>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={6}>
                <TextField
                  label="Estimated (h)"
                  type="number"
                  size="small"
                  value={selectedTask.estimatedHours}
                  onChange={(e) =>
                    handleUpdateTimeTracking(
                      parseInt(e.target.value) || 0,
                      selectedTask.actualHours
                    )
                  }
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Actual (h)"
                  type="number"
                  size="small"
                  value={selectedTask.actualHours}
                  onChange={(e) =>
                    handleUpdateTimeTracking(
                      selectedTask.estimatedHours,
                      parseInt(e.target.value) || 0
                    )
                  }
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>
            </Grid>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>Progress</Typography>
                <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>
                  {selectedTask.estimatedHours > 0
                    ? Math.round((selectedTask.actualHours / selectedTask.estimatedHours) * 100)
                    : 0}
                  %
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  selectedTask.estimatedHours > 0
                    ? (selectedTask.actualHours / selectedTask.estimatedHours) * 100
                    : 0,
                  100
                )}
                sx={{
                  height: 8,
                  borderRadius: '4px',
                  bgcolor: '#E5E7EB',
                  '& .MuiLinearProgress-bar': {
                    bgcolor:
                      selectedTask.actualHours > selectedTask.estimatedHours
                        ? '#EF4444'
                        : selectedTask.actualHours >= selectedTask.estimatedHours * 0.8
                        ? '#FBBF24'
                        : '#10B981',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Assignees */}
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

          {/* Due Date */}
          <Box>
            <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
              Due Date
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>
              {selectedTask.dueDate}
            </Typography>
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
          <Select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="All">All Assignees</MenuItem>
            {TEAM_MEMBERS.map((member) => (
              <MenuItem key={member} value={member}>
                {member}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="All">All Projects</MenuItem>
            {PROJECTS.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            New Task (Coming Soon)
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

      {/* Bulk Operations Toolbar */}
      {selectedTasks.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#F0F9FF', border: '1px solid #087A3D', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Checkbox
            checked={selectedTasks.size === filteredTasks.length}
            indeterminate={selectedTasks.size > 0 && selectedTasks.size < filteredTasks.length}
            onChange={handleSelectAll}
          />
          <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>
            {selectedTasks.size} selected
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Select
              size="small"
              value={bulkStatusUpdate}
              onChange={(e) => {
                const newStatus = e.target.value as Task['status'];
                handleBulkStatusUpdate(newStatus);
                setBulkStatusUpdate('');
              }}
              sx={{ minWidth: 130 }}
              displayEmpty
            >
              <MenuItem value="">Change Status</MenuItem>
              <MenuItem value="To Do">To Do</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="In Review">In Review</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
            </Select>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleBulkDelete}
              sx={{ textTransform: 'none' }}
            >
              Delete ({selectedTasks.size})
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedTasks(new Set())}
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
          </Box>
        </Paper>
      )}

      {/* View Content */}
      <Paper sx={{ p: 2, borderRadius: '14px', border: '1px solid #E4EBE1' }}>
        {view === 'list' && renderListView()}
        {view === 'board' && renderBoardView()}
        {view === 'calendar' && renderCalendarView()}
        {view === 'gantt' && renderGanttView()}
        {view === 'workload' && renderWorkloadView()}
      </Paper>

      {/* Task Detail Panel */}
      {renderDetailPanel()}
    </Box>
  );
}
