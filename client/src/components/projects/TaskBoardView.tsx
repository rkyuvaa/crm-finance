import React, { useState } from 'react';
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
  Collapse,
  Checkbox,
  TextField,
  Button,
} from '@mui/material';
import {
  Clock,
  Briefcase,
  Trash2,
  Lock,
  ListTree,
  AlertCircle,
  Plus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  TaskItem,
  useUpdateTaskMutation,
  useAddSubtaskMutation,
  useGetStatusDefinitionsQuery,
} from '@/api/projectsApi';
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
  const [addSubtask] = useAddSubtaskMutation();
  const { showToast } = useToast();

  // State for collapsible subtasks per task ID
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<number, boolean>>({});
  const [addingSubtaskId, setAddingSubtaskId] = useState<number | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const columns =
    statusDefs.length > 0
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

  const toggleSubtasksExpand = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCreateSubtask = async (parentId: number) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await addSubtask({ taskId: parentId, body: { title: newSubtaskTitle.trim() } }).unwrap();
      showToast('Subtask created successfully', 'success');
      setNewSubtaskTitle('');
      setAddingSubtaskId(null);
      // Auto-expand parent task to show newly created subtask
      setExpandedTaskIds((prev) => ({ ...prev, [parentId]: true }));
    } catch {
      showToast('Failed to create subtask', 'error');
    }
  };

  const handleToggleTaskCompleted = async (subtask: TaskItem, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    try {
      await updateTask({ id: subtask.id, body: { is_completed: !subtask.is_completed } }).unwrap();
    } catch {
      showToast('Failed to update subtask status', 'error');
    }
  };

  // Recursive subtask card renderer supporting multi-level hierarchy (Task -> Subtask -> Sub-subtask)
  const renderSubtaskCards = (subtaskList: TaskItem[], depth = 1) => {
    if (!subtaskList || subtaskList.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, pl: depth * 1.5 }}>
        {subtaskList.map((sub) => {
          const subChildren = sub.nested_subtasks || sub.subtasks || [];
          const isSubExpanded = !!expandedTaskIds[sub.id];
          const isSubCompleted = sub.is_completed;
          const isSubOverdue = sub.due_date && new Date(sub.due_date) < new Date() && !isSubCompleted;

          return (
            <Box key={sub.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.25,
                  border: '1px solid',
                  borderColor: isSubCompleted ? 'divider' : '#CBD5E1',
                  borderLeft: '3px solid #04552B',
                  borderRadius: '8px',
                  bgcolor: isSubCompleted ? 'action.hover' : '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderColor: '#04552B',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskDetail(sub);
                }}
              >
                {/* Header Row: Checkbox, Number, Title, Priority, Delete */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                    <Checkbox
                      size="small"
                      checked={!!isSubCompleted}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleTaskCompleted(sub, e)}
                      sx={{ p: 0.2, color: '#64748B', '&.Mui-checked': { color: '#04552B' } }}
                    />
                    <Chip
                      label={sub.task_number || `SUB-${sub.id}`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        bgcolor: '#E2E8F0',
                        color: '#334155',
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: isSubCompleted ? 'text.secondary' : 'text.primary',
                        textDecoration: isSubCompleted ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sub.title}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {sub.priority && (
                      <Chip
                        label={sub.priority}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          bgcolor:
                            sub.priority === 'URGENT'
                              ? '#FEE2E2'
                              : sub.priority === 'HIGH'
                              ? '#FEF3C7'
                              : '#F1F5F9',
                          color:
                            sub.priority === 'URGENT'
                              ? '#DC2626'
                              : sub.priority === 'HIGH'
                              ? '#D97706'
                              : '#475569',
                        }}
                      />
                    )}

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(sub.id);
                      }}
                      sx={{ color: '#94A3B8', p: 0.2, '&:hover': { color: '#DC2626' } }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Subtask Meta Row (Due Date & Assignees) */}
                {(sub.due_date || (sub.assignees && sub.assignees.length > 0)) && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 0.75,
                      pt: 0.5,
                      borderTop: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    {sub.due_date ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={11} color={isSubOverdue ? '#DC2626' : '#64748B'} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 10,
                            color: isSubOverdue ? '#DC2626' : 'text.secondary',
                            fontWeight: isSubOverdue ? 700 : 500,
                          }}
                        >
                          {sub.due_date}
                        </Typography>
                      </Box>
                    ) : (
                      <div />
                    )}

                    {sub.assignees && sub.assignees.length > 0 && (
                      <AvatarGroup max={2} sx={{ '& .MuiAvatar-root': { width: 18, height: 18, fontSize: 9, bgcolor: '#04552B' } }}>
                        {sub.assignees.map((a) => (
                          <Avatar key={a.id} title={a.full_name}>
                            {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    )}
                  </Box>
                )}

                {/* Nested Sub-subtask Toggle if present */}
                {subChildren.length > 0 && (
                  <Box
                    onClick={(e) => toggleSubtasksExpand(sub.id, e)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.75,
                      pt: 0.5,
                      cursor: 'pointer',
                      color: '#04552B',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {isSubExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>
                      {isSubExpanded ? '▼' : '▶'} {subChildren.length} {subChildren.length === 1 ? 'subtask' : 'subtasks'}
                    </span>
                  </Box>
                )}
              </Paper>

              {/* Recursive child subtasks */}
              {subChildren.length > 0 && (
                <Collapse in={isSubExpanded} timeout="auto" unmountOnExit={false}>
                  {renderSubtaskCards(subChildren, depth + 1)}
                </Collapse>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Grid container spacing={2} alignItems="stretch">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => !t.parent_task_id && (t.status_id || 1) === col.id);
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

                        const subtaskList = task.nested_subtasks || task.subtasks || [];
                        const subtaskCount = task.subtask_count ?? subtaskList.length;
                        const completedCount =
                          task.completed_subtask_count ?? subtaskList.filter((s) => s.is_completed).length;
                        const isExpanded = !!expandedTaskIds[task.id];

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
                                  '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
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

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <Tooltip title="Add Subtask">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedTaskIds((prev) => ({ ...prev, [task.id]: true }));
                                          setAddingSubtaskId(task.id);
                                        }}
                                        sx={{ color: '#04552B', p: 0.2 }}
                                      >
                                        <Plus size={14} />
                                      </IconButton>
                                    </Tooltip>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask(task.id);
                                      }}
                                      sx={{ color: '#94A3B8', p: 0.2, '&:hover': { color: '#DC2626' } }}
                                    >
                                      <Trash2 size={13} />
                                    </IconButton>
                                  </Box>
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
                                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: 10, bgcolor: '#04552B', color: '#FFFFFF' } }}>
                                      {task.assignees.map((a) => (
                                        <Avatar key={a.id} title={a.user?.full_name || `User #${a.user_id}`}>
                                          {(a.user?.full_name || '?').charAt(0).toUpperCase()}
                                        </Avatar>
                                      ))}
                                    </AvatarGroup>
                                  ) : (
                                    <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#94A3B8' }}>
                                      {(task.assignee_name || '?').charAt(0).toUpperCase()}
                                    </Avatar>
                                  )}
                                </Box>

                                {/* ClickUp-style Collapsible Subtask Row */}
                                {(subtaskCount > 0 || addingSubtaskId === task.id) && (
                                  <Box
                                    onClick={(e) => toggleSubtasksExpand(task.id, e)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justify: 'space-between',
                                      mt: 1.25,
                                      pt: 0.75,
                                      pb: 0.75,
                                      px: 1,
                                      borderTop: '1px solid',
                                      borderColor: 'divider',
                                      cursor: 'pointer',
                                      borderRadius: '6px',
                                      bgcolor: isExpanded ? 'action.selected' : '#F8FAFC',
                                      '&:hover': { bgcolor: 'action.selected' },
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                      {isExpanded ? (
                                        <ChevronDown size={15} color="#04552B" />
                                      ) : (
                                        <ChevronRight size={15} color="#04552B" />
                                      )}
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontWeight: 700,
                                          color: '#04552B',
                                          fontSize: '0.75rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                        }}
                                      >
                                        <span>{isExpanded ? '▼' : '▶'}</span>
                                        <span>
                                          {subtaskCount === 1
                                            ? '1 subtask'
                                            : `${completedCount > 0 ? `${completedCount}/${subtaskCount}` : subtaskCount} subtasks`}
                                        </span>
                                      </Typography>
                                    </Box>

                                    <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }}>
                                      {isExpanded ? 'Collapse' : 'Expand'}
                                    </Typography>
                                  </Box>
                                )}

                                {/* Collapsible Child Task Container */}
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit={false}>
                                  <Box onClick={(e) => e.stopPropagation()} sx={{ pt: 0.5 }}>
                                    {renderSubtaskCards(subtaskList, 1)}

                                    {/* Inline Add Subtask Input */}
                                    <Box sx={{ mt: 1, pl: 1, display: 'flex', gap: 0.75, alignItems: 'center' }}>
                                      <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="+ Add a subtask (press Enter)..."
                                        value={addingSubtaskId === task.id ? newSubtaskTitle : ''}
                                        onFocus={() => setAddingSubtaskId(task.id)}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCreateSubtask(task.id);
                                          }
                                        }}
                                        sx={{
                                          '& .MuiOutlinedInput-root': {
                                            height: 30,
                                            fontSize: '0.75rem',
                                            bgcolor: 'background.paper',
                                            borderRadius: '6px',
                                          },
                                        }}
                                      />
                                      {addingSubtaskId === task.id && newSubtaskTitle.trim() && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() => handleCreateSubtask(task.id)}
                                          sx={{
                                            height: 30,
                                            fontSize: '0.7rem',
                                            minWidth: 50,
                                            px: 1.5,
                                            bgcolor: '#04552B',
                                            '&:hover': { bgcolor: '#033B1E' },
                                          }}
                                        >
                                          Add
                                        </Button>
                                      )}
                                    </Box>
                                  </Box>
                                </Collapse>
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
