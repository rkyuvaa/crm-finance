import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Avatar,
  Collapse,
  Button,
} from '@mui/material';
import { ChevronDown, ChevronRight, Plus, Calendar } from 'lucide-react';
import { useGetTasksQuery, TaskItem } from '@/api/projectsApi';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';

interface ProjectTasksListProps {
  projectId: string;
}

export default function ProjectTasksList({ projectId }: ProjectTasksListProps) {
  const { data: tasks = [], isLoading } = useGetTasksQuery({ project_id: Number(projectId) });
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    1: true, // TODO
    2: true, // IN_PROGRESS
    3: true,
    4: true,
    5: true,
  });

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const toggleGroup = (statusId: number) => {
    setExpandedGroups((prev) => ({ ...prev, [statusId]: !prev[statusId] }));
  };

  const openTask = (task: TaskItem) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const statuses = [
    { id: 1, label: 'To Do', color: '#64748B', bg: '#F1F5F9' },
    { id: 2, label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
    { id: 3, label: 'In Review', color: '#D97706', bg: '#FEF3C7' },
    { id: 4, label: 'Done', color: '#16A34A', bg: '#F0FDF4' },
    { id: 5, label: 'Blocked', color: '#DC2626', bg: '#FEF2F2' },
  ];

  if (isLoading) {
    return <Typography color="textSecondary">Loading tasks...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Tasks</Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' } }}>
          Add Task
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={150}>Assignee</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={150}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={120}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#475569' }} width={120}>Tracked Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statuses.map((status) => {
              const statusTasks = tasks.filter((t) => t.status_id === status.id);
              if (statusTasks.length === 0) return null;
              const isExpanded = expandedGroups[status.id];

              return (
                <React.Fragment key={status.id}>
                  {/* Group Header */}
                  <TableRow sx={{ bgcolor: status.bg, cursor: 'pointer', '&:hover': { bgcolor: status.bg } }} onClick={() => toggleGroup(status.id)}>
                    <TableCell>
                      <IconButton size="small">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </IconButton>
                    </TableCell>
                    <TableCell colSpan={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={status.label} size="small" sx={{ bgcolor: status.color, color: 'white', fontWeight: 600, height: 20, fontSize: '0.7rem' }} />
                        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>{statusTasks.length} Tasks</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Tasks */}
                  {isExpanded && statusTasks.map((task) => (
                    <TableRow 
                      key={task.id} 
                      hover 
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}
                      onClick={() => openTask(task)}
                    >
                      <TableCell align="center">
                        <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: `2px solid ${status.color}`, margin: 'auto' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#0F172A' }}>{task.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: '#E2E8F0', color: '#475569' }}>
                            {task.assignee_name?.charAt(0) || '?'}
                          </Avatar>
                          <Typography variant="body2">{task.assignee_name || 'Unassigned'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: task.due_date ? '#475569' : '#94A3B8' }}>
                          <Calendar size={14} />
                          <Typography variant="body2">{task.due_date || 'None'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.priority} 
                          size="small" 
                          sx={{ 
                            height: 20, fontSize: '0.7rem', fontWeight: 600,
                            bgcolor: task.priority === 'URGENT' ? '#FEE2E2' : task.priority === 'HIGH' ? '#FEF3C7' : '#F1F5F9',
                            color: task.priority === 'URGENT' ? '#DC2626' : task.priority === 'HIGH' ? '#D97706' : '#64748B'
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#64748B' }}>
                          {task.actual_hours}h / {task.estimated_hours}h
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TaskDetailPanel open={panelOpen} onClose={() => setPanelOpen(false)} task={selectedTask} />
    </Box>
  );
}
