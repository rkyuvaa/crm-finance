import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  Grid,
  Chip,
  Avatar,
  AvatarGroup,
  TextField,
  Button,
  LinearProgress,
  CircularProgress,
  Paper,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  X,
  Clock,
  Calendar,
  CheckSquare,
  ListTree,
  MessageSquare,
  Paperclip,
  Lock,
  FileText,
  UploadCloud,
  Trash2,
  Play,
  Square,
  Send,
  Edit2,
  Check,
  UserPlus,
  Tag as TagIcon,
  Activity as ActivityIcon,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  TaskItem,
  useToggleSubtaskMutation,
  useAddSubtaskMutation,
  useDeleteSubtaskMutation,
  useUpdateTaskMutation,
  useLogTimeMutation,
  useAddCommentMutation,
  useGetTaskCommentsQuery,
  useGetTaskAttachmentsQuery,
  useAddTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
  useGetCustomFieldDefinitionsQuery,
  useGetTaskCustomFieldsQuery,
  useSaveTaskCustomFieldMutation,
  useStartTimerMutation,
  useStopTimerMutation,
  useAddChecklistMutation,
  useAddChecklistItemMutation,
  useToggleChecklistItemMutation,
  useConvertChecklistItemToSubtaskMutation,
  useAddFollowerMutation,
  useRemoveFollowerMutation,
  useAddDependencyMutation,
  useRemoveDependencyMutation,
} from '@/api/projectsApi';
import { useUsersQuery, useCostCentersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';

interface TaskDetailPanelProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

export default function TaskDetailPanel({ open, onClose, task }: TaskDetailPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Editable Title & Description State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Failed'>('Saved');

  // Checklist State
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistItemTitles, setNewChecklistItemTitles] = useState<Record<number, string>>({});

  // Dependency State
  const [depTaskId, setDepTaskId] = useState<number | ''>('');
  const [depType, setDepType] = useState<'BLOCKS' | 'BLOCKED_BY' | 'WAITING_ON'>('BLOCKED_BY');

  // Stopwatch Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Custom Field editing state
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editFieldValue, setEditFieldValue] = useState('');

  const { showToast } = useToast();

  const [toggleSubtask] = useToggleSubtaskMutation();
  const [addSubtask, { isLoading: isAddingSubtask }] = useAddSubtaskMutation();
  const [deleteSubtask] = useDeleteSubtaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [logTime] = useLogTimeMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  const [startTimerApi] = useStartTimerMutation();
  const [stopTimerApi] = useStopTimerMutation();

  const [addChecklistApi] = useAddChecklistMutation();
  const [addChecklistItemApi] = useAddChecklistItemMutation();
  const [toggleChecklistItemApi] = useToggleChecklistItemMutation();
  const [convertChecklistItemApi] = useConvertChecklistItemToSubtaskMutation();

  const [addFollowerApi] = useAddFollowerMutation();
  const [removeFollowerApi] = useRemoveFollowerMutation();

  const [addDependencyApi] = useAddDependencyMutation();
  const [removeDependencyApi] = useRemoveDependencyMutation();

  const { data: users = [] } = useUsersQuery();
  const { data: costCenters = [] } = useCostCentersQuery();

  const { data: comments = [] } = useGetTaskCommentsQuery(task?.id || 0, { skip: !task?.id });
  const { data: attachments = [], isLoading: isLoadingAttachments } = useGetTaskAttachmentsQuery(task?.id || 0, { skip: !task?.id });
  const [addTaskAttachment] = useAddTaskAttachmentMutation();
  const [deleteTaskAttachment] = useDeleteTaskAttachmentMutation();

  const { data: customDefs = [] } = useGetCustomFieldDefinitionsQuery();
  const { data: customValues = [] } = useGetTaskCustomFieldsQuery(task?.id || 0, { skip: !task?.id });
  const [saveCustomField] = useSaveTaskCustomFieldMutation();

  // Populate local title and description on task change
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
    }
  }, [task?.id]);

  // Timer Tick Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!task) return null;

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTitleBlur = async () => {
    if (!title.trim() || title === task.title) return;
    setSaveStatus('Saving...');
    try {
      await updateTask({ id: task.id, body: { title: title.trim() } }).unwrap();
      setSaveStatus('Saved');
      showToast('Title updated', 'success');
    } catch {
      setSaveStatus('Failed');
      showToast('Failed to update title', 'error');
    }
  };

  const handleDescriptionBlur = async () => {
    if (description === task.description) return;
    setSaveStatus('Saving...');
    try {
      await updateTask({ id: task.id, body: { description: description.trim() } }).unwrap();
      setSaveStatus('Saved');
      showToast('Description saved', 'success');
    } catch {
      setSaveStatus('Failed');
      showToast('Failed to save description', 'error');
    }
  };

  const handleToggleTimer = async () => {
    if (!isTimerRunning) {
      try {
        await startTimerApi(task.id).unwrap();
        setIsTimerRunning(true);
        showToast('Stopwatch timer started ⏱️', 'info');
      } catch {
        showToast('Could not start timer', 'error');
      }
    } else {
      try {
        await stopTimerApi({ taskId: task.id, description: `Stopwatch session: ${formatTimer(timerSeconds)}` }).unwrap();
        setIsTimerRunning(false);
        setTimerSeconds(0);
        showToast('Timer stopped & work logged!', 'success');
      } catch {
        showToast('Could not stop timer', 'error');
      }
    }
  };

  const handleCostCenterChange = async (ccId: number | '') => {
    try {
      await updateTask({ id: task.id, body: { cost_center_id: ccId || undefined } as any }).unwrap();
      showToast('Cost Center updated', 'success');
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to update cost center', 'error');
    }
  };

  const handleAssigneeChange = async (selectedUserIds: number[]) => {
    try {
      await updateTask({ id: task.id, body: { assignee_ids: selectedUserIds } as any }).unwrap();
      showToast('Assignees updated', 'success');
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to update assignees', 'error');
    }
  };

  const handleFollowerChange = async (selectedUserIds: number[]) => {
    try {
      await updateTask({ id: task.id, body: { follower_ids: selectedUserIds } as any }).unwrap();
      showToast('Followers updated', 'success');
    } catch (err: any) {
      showToast(err?.data?.detail || 'Failed to update followers', 'error');
    }
  };

  const handleToggleSubtask = async (subtaskId: number) => {
    try {
      await toggleSubtask(subtaskId).unwrap();
    } catch {
      showToast('Failed to update subtask', 'error');
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await deleteSubtask(subtaskId).unwrap();
      showToast('Subtask deleted', 'info');
    } catch {
      showToast('Failed to delete subtask', 'error');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await addSubtask({
        taskId: task.id,
        title: newSubtaskTitle.trim(),
      }).unwrap();
      setNewSubtaskTitle('');
      showToast('Subtask added', 'success');
    } catch {
      showToast('Failed to add subtask', 'error');
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      await addChecklistApi({ taskId: task.id, title: newChecklistTitle.trim() }).unwrap();
      setNewChecklistTitle('');
      showToast('Checklist created', 'success');
    } catch {
      showToast('Failed to create checklist', 'error');
    }
  };

  const handleAddChecklistItem = async (checklistId: number) => {
    const itemTitle = newChecklistItemTitles[checklistId];
    if (!itemTitle || !itemTitle.trim()) return;
    try {
      await addChecklistItemApi({ taskId: task.id, checklistId, title: itemTitle.trim() }).unwrap();
      setNewChecklistItemTitles((prev) => ({ ...prev, [checklistId]: '' }));
      showToast('Item added to checklist', 'success');
    } catch {
      showToast('Failed to add checklist item', 'error');
    }
  };

  const handleToggleChecklistItem = async (itemId: number) => {
    try {
      await toggleChecklistItemApi({ taskId: task.id, itemId }).unwrap();
    } catch {
      showToast('Failed to toggle item', 'error');
    }
  };

  const handleConvertChecklistItemToSubtask = async (itemId: number) => {
    try {
      await convertChecklistItemApi({ taskId: task.id, itemId }).unwrap();
      showToast('Converted checklist item to subtask!', 'success');
    } catch {
      showToast('Failed to convert to subtask', 'error');
    }
  };

  const handleAddDependency = async () => {
    if (!depTaskId) return;
    try {
      await addDependencyApi({
        taskId: task.id,
        depends_on_task_id: Number(depTaskId),
        dependency_type: depType,
      }).unwrap();
      setDepTaskId('');
      showToast('Dependency added', 'success');
    } catch (err: any) {
      showToast(err?.data?.detail?.message || 'Could not add dependency (anti-circular rule enforced)', 'error');
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    try {
      await removeDependencyApi({ taskId: task.id, dependencyId: depId }).unwrap();
      showToast('Dependency removed', 'info');
    } catch {
      showToast('Failed to remove dependency', 'error');
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({
        taskId: task.id,
        content: commentText.trim(),
      }).unwrap();
      setCommentText('');
      showToast('Comment posted with @mention notifications', 'success');
    } catch {
      showToast('Failed to post comment', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileSizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        try {
          await addTaskAttachment({
            taskId: task.id,
            filename: file.name,
            file_size: fileSizeFormatted,
          }).unwrap();
          showToast(`Attached ${file.name}`, 'success');
        } catch {
          showToast(`Failed to attach ${file.name}`, 'error');
        }
      }
    }
  };

  const handleRemoveAttachment = async (id: number) => {
    try {
      await deleteTaskAttachment(id).unwrap();
      showToast('Attachment removed', 'info');
    } catch {
      showToast('Failed to remove attachment', 'error');
    }
  };

  const handleSaveCustomField = async (fieldId: number) => {
    try {
      await saveCustomField({
        taskId: task.id,
        field_id: fieldId,
        value: editFieldValue.trim() || undefined,
      }).unwrap();
      showToast('Custom field saved', 'success');
      setEditingFieldId(null);
      setEditFieldValue('');
    } catch {
      showToast('Failed to save custom field value', 'error');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 680, md: 940 }, p: 0, bgcolor: 'background.default' },
      }}
    >
      {/* Header Toolbar */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={task.task_number || `TASK-${task.id}`}
            size="small"
            sx={{ bgcolor: '#F1F5F9', color: '#334155', fontWeight: 700, fontFamily: 'monospace' }}
          />
          <Chip
            label={task.priority}
            size="small"
            sx={{
              bgcolor: task.priority === 'URGENT' ? '#FEE2E2' : task.priority === 'HIGH' ? '#FEF3C7' : '#04552B',
              color: task.priority === 'URGENT' ? '#DC2626' : task.priority === 'HIGH' ? '#D97706' : '#FFFFFF',
              fontWeight: 700,
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {saveStatus === 'Saving...' ? 'Saving...' : saveStatus === 'Saved' ? 'Saved ✓' : 'Save Error'}
          </Typography>
        </Box>

        {/* Stopwatch Timer Widget */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Paper
            variant="outlined"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: '20px',
              bgcolor: isTimerRunning ? '#F0FDF4' : 'background.paper',
              borderColor: isTimerRunning ? '#16A34A' : 'divider',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: isTimerRunning ? '#16A34A' : 'text.primary' }}>
              {formatTimer(timerSeconds)}
            </Typography>
            <Button
              size="small"
              variant={isTimerRunning ? 'contained' : 'outlined'}
              color={isTimerRunning ? 'error' : 'primary'}
              startIcon={isTimerRunning ? <Square size={12} /> : <Play size={12} />}
              onClick={handleToggleTimer}
              sx={{ height: 24, fontSize: 11, textTransform: 'none', px: 1 }}
            >
              {isTimerRunning ? 'Stop & Log' : 'Start Timer'}
            </Button>
          </Paper>

          <IconButton size="small" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </Box>
      </Box>

      {/* Panel Body */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: 'calc(100vh - 65px)' }}>
        {/* Left Column (Details, Subtasks, Checklists, Comments) */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', bgcolor: 'background.paper' }}>
          {/* Editable Title */}
          <TextField
            fullWidth
            variant="standard"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Task title..."
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: '1.4rem', fontWeight: 700, color: 'text.primary', mb: 2 },
            }}
          />

          {/* Rich Description */}
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
            DESCRIPTION
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Add detailed task description, scope, requirements, markdown links..."
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { fontSize: 14 } }}
          />

          <Divider sx={{ mb: 3 }} />

          {/* ── SUBTASKS (ClickUp Nested 3 Levels) ───────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListTree size={18} color="#04552B" />
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Subtasks & Work Breakdown
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Progress: {task.progress_percentage || 0}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={task.progress_percentage || 0}
              sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: '#04552B' } }}
            />

            {task.subtasks?.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {task.subtasks.map((sub) => (
                  <Paper
                    key={sub.id}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      px: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                      bgcolor: sub.is_completed ? 'action.hover' : 'background.default',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={sub.is_completed}
                        onChange={() => handleToggleSubtask(sub.id)}
                        style={{ cursor: 'pointer', width: 17, height: 17, accentColor: '#04552B' }}
                      />
                      <Chip label={sub.task_number || `SUB-${sub.id}`} size="small" sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace' }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: sub.is_completed ? 400 : 600,
                          textDecoration: sub.is_completed ? 'line-through' : 'none',
                          color: sub.is_completed ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {sub.title}
                      </Typography>
                    </Box>

                    <IconButton size="small" onClick={() => handleDeleteSubtask(sub.id)}>
                      <Trash2 size={15} color="#DC2626" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Quick Add Subtask */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="+ Add subtask title..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                sx={{ '& .MuiOutlinedInput-root': { height: 36, fontSize: 13 } }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAddSubtask}
                disabled={isAddingSubtask}
                sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, textTransform: 'none', px: 2 }}
              >
                Add Subtask
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── CHECKLISTS ────────────────────────────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckSquare size={18} color="#2563EB" />
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Checklists
                </Typography>
              </Box>
            </Box>

            {task.checklists && task.checklists.length > 0 ? (
              task.checklists.map((chk) => (
                <Paper key={chk.id} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {chk.title}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    {chk.items.map((item) => (
                      <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={() => handleToggleChecklistItem(item.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563EB' }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? 'text.secondary' : 'text.primary' }}
                          >
                            {item.title}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => handleConvertChecklistItemToSubtask(item.id)}
                          sx={{ fontSize: 10, textTransform: 'none' }}
                        >
                          Convert to Subtask
                        </Button>
                      </Box>
                    ))}
                  </Box>

                  {/* Add Checklist Item */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="+ Add checklist item..."
                      value={newChecklistItemTitles[chk.id] || ''}
                      onChange={(e) => setNewChecklistItemTitles((prev) => ({ ...prev, [chk.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem(chk.id)}
                      sx={{ '& .MuiOutlinedInput-root': { height: 32, fontSize: 12 } }}
                    />
                    <Button size="small" variant="outlined" onClick={() => handleAddChecklistItem(chk.id)}>
                      Add Item
                    </Button>
                  </Box>
                </Paper>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                No checklists added to this task.
              </Typography>
            )}

            {/* Create Checklist */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="+ Create new checklist title..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                sx={{ '& .MuiOutlinedInput-root': { height: 34, fontSize: 13 } }}
              />
              <Button variant="outlined" size="small" onClick={handleAddChecklist} sx={{ textTransform: 'none' }}>
                Add Checklist
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── DEPENDENCIES ────────────────────────────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock size={18} color="#D97706" /> Task Dependencies & Relationships
            </Typography>

            {task.dependencies && task.dependencies.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {task.dependencies.map((dep) => (
                  <Paper key={dep.id} variant="outlined" sx={{ p: 1.25, px: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={dep.dependency_type} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dep.depends_on_task_number}: {dep.depends_on_task_title}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveDependency(dep.id)}>
                      <Trash2 size={14} color="#DC2626" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                No active dependencies. (Anti-circular validation active)
              </Typography>
            )}

            {/* Add Dependency Controls */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Select
                size="small"
                displayEmpty
                value={depType}
                onChange={(e) => setDepType(e.target.value as any)}
                sx={{ height: 34, fontSize: 12, minWidth: 130 }}
              >
                <MenuItem value="BLOCKED_BY">Blocked By</MenuItem>
                <MenuItem value="BLOCKS">Blocks</MenuItem>
                <MenuItem value="WAITING_ON">Waiting On</MenuItem>
              </Select>

              <TextField
                size="small"
                type="number"
                placeholder="Target Task ID..."
                value={depTaskId}
                onChange={(e) => setDepTaskId(e.target.value ? Number(e.target.value) : '')}
                sx={{ width: 140, '& .MuiOutlinedInput-root': { height: 34, fontSize: 12 } }}
              />

              <Button variant="outlined" size="small" onClick={handleAddDependency} sx={{ height: 34, textTransform: 'none' }}>
                Add Dependency
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── ATTACHMENTS ───────────────────────────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Paperclip size={18} color="#2563EB" /> File Attachments ({attachments.length})
              </Typography>
              <Button variant="outlined" size="small" component="label" startIcon={<UploadCloud size={14} />}>
                Upload File
                <input type="file" hidden multiple onChange={handleFileUpload} />
              </Button>
            </Box>

            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {attachments.map((file) => (
                  <Paper key={file.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FileText size={18} color="#04552B" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{file.filename}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveAttachment(file.id)}>
                      <Trash2 size={15} color="#DC2626" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── ACTIVITY & COMMENTS ───────────────────────────────── */}
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageSquare size={18} color="#64748B" /> Comments & Immutable Audit Log
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#04552B', fontSize: 13, fontWeight: 700 }}>A</Avatar>
              <TextField
                fullWidth
                size="small"
                placeholder="Write comment with @mentions..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                multiline
                rows={2}
              />
              <IconButton onClick={handlePostComment} disabled={isAddingComment || !commentText.trim()} sx={{ bgcolor: '#04552B', color: '#FFF' }}>
                <Send size={16} />
              </IconButton>
            </Box>

            {/* Comments Timeline */}
            {comments.map((c) => (
              <Box key={c.id} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#64748B' }}>{c.user_name?.charAt(0) || 'U'}</Avatar>
                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, borderRadius: '8px', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 12 }}>{c.user_name || 'User'}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5 }}>{c.content}</Typography>
                </Paper>
              </Box>
            ))}

            {/* Immutable Audit Log */}
            {task.activities && task.activities.length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                  AUDIT TIMELINE
                </Typography>
                {task.activities.map((act) => (
                  <Box key={act.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <ActivityIcon size={13} color="#64748B" />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>{act.actor_name}</strong>: {act.description || act.action_type} ({new Date(act.created_at).toLocaleTimeString()})
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Column (Master Data Properties) */}
        <Box sx={{ width: { xs: '100%', md: 300 }, p: 3, borderLeft: { md: '1px solid' }, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>
            Work Item Properties
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Cost Center Master Selector */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Cost Center (Master Data)
              </Typography>
              <Select
                size="small"
                fullWidth
                value={task.cost_center_id || ''}
                onChange={(e) => handleCostCenterChange(e.target.value ? Number(e.target.value) : '')}
                displayEmpty
                sx={{ height: 36, fontSize: 13, bgcolor: 'background.paper' }}
              >
                <MenuItem value=""><em>None Selected</em></MenuItem>
                {costCenters.map((cc) => (
                  <MenuItem key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Assignees */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}>
                Assignees
              </Typography>
              <Select
                multiple
                size="small"
                fullWidth
                displayEmpty
                value={(task.assignees || []).map((a) => a.user_id || a.id)}
                onChange={(e) => {
                  const vals = typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : (e.target.value as number[]);
                  handleAssigneeChange(vals);
                }}
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) {
                    return <Typography variant="body2" color="textSecondary">Select Assignees...</Typography>;
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((uid) => {
                        const u = (users as any[]).find((usr) => usr.id === uid) || (task.assignees || []).find((a) => (a.user_id || a.id) === uid);
                        const name = u ? (u.full_name || u.username || 'User') : `User ${uid}`;
                        return (
                          <Chip
                            key={uid}
                            avatar={<Avatar sx={{ width: 18, height: 18, fontSize: 10 }}>{(name || 'U').charAt(0)}</Avatar>}
                            label={name}
                            size="small"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        );
                      })}
                    </Box>
                  );
                }}
                sx={{ bgcolor: 'background.paper', borderRadius: '8px', minHeight: 36 }}
              >
                {(users as any[]).map((u) => (
                  <MenuItem key={u.id} value={u.id} sx={{ fontSize: 13 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 11, mr: 1 }}>{(u.full_name || u.username || 'U').charAt(0)}</Avatar>
                    {u.full_name || u.username}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Followers / Watchers */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}>
                Followers / Watchers
              </Typography>
              <Select
                multiple
                size="small"
                fullWidth
                displayEmpty
                value={(task.followers || []).map((f) => f.user_id || f.id)}
                onChange={(e) => {
                  const vals = typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : (e.target.value as number[]);
                  handleFollowerChange(vals);
                }}
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) {
                    return <Typography variant="body2" color="textSecondary">Select Followers...</Typography>;
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((uid) => {
                        const u = (users as any[]).find((usr) => usr.id === uid) || (task.followers || []).find((f) => (f.user_id || f.id) === uid);
                        const name = u ? (u.full_name || u.username || 'Follower') : `User ${uid}`;
                        return (
                          <Chip
                            key={uid}
                            label={name}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        );
                      })}
                    </Box>
                  );
                }}
                sx={{ bgcolor: 'background.paper', borderRadius: '8px', minHeight: 36 }}
              >
                {(users as any[]).map((u) => (
                  <MenuItem key={u.id} value={u.id} sx={{ fontSize: 13 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 11, mr: 1 }}>{(u.full_name || u.username || 'U').charAt(0)}</Avatar>
                    {u.full_name || u.username}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Custom Fields */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>
              Custom Fields
            </Typography>
            {customDefs.map((def) => {
              const valObj = customValues.find((v) => v.field_id === def.id);
              const isEditing = editingFieldId === def.id;

              return (
                <Box key={def.id}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{def.label}</Typography>
                  {isEditing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <TextField size="small" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} />
                      <IconButton size="small" onClick={() => handleSaveCustomField(def.id)}><Check size={16} /></IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{valObj?.value || 'Not set'}</Typography>
                      <IconButton size="small" onClick={() => { setEditingFieldId(def.id); setEditFieldValue(valObj?.value || ''); }}>
                        <Edit2 size={13} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
