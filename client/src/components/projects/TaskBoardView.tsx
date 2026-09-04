import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Chip,
  Card,
  Avatar,
  AvatarGroup,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Clock,
  Briefcase,
  Trash2,
  Lock,
  ListTree,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { TaskItem, useUpdateTaskMutation, useGetStatusDefinitionsQuery } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

interface TaskBoardViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
  onDeleteTask: (id: number) => void;
  onQuickCreateTask: (statusId: number) => void;
}

export default function TaskBoardView({
  tasks,
  onOpenTaskDetail,
  onDeleteTask,
  onQuickCreateTask,
}: TaskBoardViewProps) {
  const { data: statusDefs = [] } = useGetStatusDefinitionsQuery();
  const [updateTask] = useUpdateTaskMutation();
  const { showToast } = useToast();

  const columns = statusDefs.length > 0
    ? statusDefs.map((s) => ({ id: s.id, label: s.name, color: s.color || '#64748B' }))
    : [
        { id: 1, label: 'Not Started', color: '#94A3B8' },
        { id: 2, label: 'Open', color: '#3B82F6' },
        { id: 3, label: 'In Progress', color: '#6366F1' },
        { id: 4, label: 'On Hold', color: '#F59E0B' },
        { id: 5, label: 'Review', color: '#8B5CF6' },
        { id: 6, label: 'Completed', color: '#10B981' },
      ];

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = Number(draggableId);
    const newStatusId = Number(destination.droppableId);

    try {
      await updateTask({ id: taskId, body: { status_id: newStatusId } }).unwrap();
      showToast('Task moved successfully', 'success');
    } catch {
      showToast('Failed to update task status', 'error');
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Grid container spacing={2} alignItems="stretch">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => (t.status_id || 1) === col.id);
          return (
            <Grid item xs={12} sm={6} md={12 / Math.min(columns.length, 6)} key={col.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '12px',
                  height: '100%',
                  minHeight: 550,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Column Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>
                      {col.label}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label={colTasks.length} size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
                    <IconButton size="small" onClick={() => onQuickCreateTask(col.id)} title="Add Task">
                      <Plus size={16} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Droppable Container */}
                <Droppable droppableId={String(col.id)}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}
                    >
                      {colTasks.map((task, index) => {
                        const isOverdue =
                          task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;

                        return (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(dragProvided) => (
                              <Card
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                elevation={0}
                                sx={{
                                  p: 2,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: '10px',
                                  bgcolor: 'background.paper',
                                  cursor: 'pointer',
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                  '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.1)' },
                                }}
                                onClick={() => onOpenTaskDetail(task)}
                              >
                                {/* Header badges */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Chip
                                      label={task.task_number || `TASK-${task.id}`}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        bgcolor: '#F1F5F9',
                                        color: '#475569',
                                      }}
                                    />
                                    <Chip
                                      label={task.priority}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        bgcolor:
                                          task.priority === 'URGENT'
                                            ? '#FEE2E2'
                                            : task.priority === 'HIGH'
                                            ? '#FEF3C7'
                                            : '#F1F5F9',
                                        color:
                                          task.priority === 'URGENT'
                                            ? '#DC2626'
                                            : task.priority === 'HIGH'
                                            ? '#D97706'
                                            : '#475569',
                                      }}
                                    />
                                  </Box>

                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTask(task.id);
                                    }}
                                    sx={{ color: '#94A3B8', p: 0.2 }}
                                  >
                                    <Trash2 size={13} />
                                  </IconButton>
                                </Box>

                                {/* Title */}
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 700,
                                    color: task.is_completed ? 'text.secondary' : 'text.primary',
                                    textDecoration: task.is_completed ? 'line-through' : 'none',
                                    mb: 0.75,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {task.title}
                                </Typography>

                                {/* Project & Cost Center */}
                                {(task.project_name || task.cost_center_code) && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
                                    {task.project_name && (
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        {task.project_name}
                                      </Typography>
                                    )}
                                    {task.cost_center_code && (
                                      <Chip
                                        label={task.cost_center_code}
                                        size="small"
                                        sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}
                                      />
                                    )}
                                  </Box>
                                )}

                                {/* Subtasks / Progress Pill */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                    <ListTree size={13} color="#04552B" />
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                      {task.subtasks.filter((s) => s.is_completed).length} / {task.subtasks.length} subtasks
                                    </Typography>
                                  </Box>
                                )}

                                {/* Footer: Due Date & Assignees */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center',
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  {task.due_date ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      {isOverdue ? <AlertCircle size={13} color="#DC2626" /> : <Clock size={13} color="#64748B" />}
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontWeight: isOverdue ? 700 : 500,
                                          color: isOverdue ? '#DC2626' : 'text.secondary',
                                          fontSize: 11,
                                        }}
                                      >
                                        {task.due_date}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: 11 }}>
                                      No due date
                                    </Typography>
                                  )}

                                  {task.assignees && task.assignees.length > 0 ? (
                                    <AvatarGroup max={2} sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: 10, bgcolor: '#04552B' } }}>
                                      {task.assignees.map((a) => (
                                        <Avatar key={a.id} title={a.full_name}>
                                          {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'U'}
                                        </Avatar>
                                      ))}
                                    </AvatarGroup>
                                  ) : (
                                    <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#94A3B8' }}>?</Avatar>
                                  )}
                                </Box>
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </DragDropContext>
  );
}
