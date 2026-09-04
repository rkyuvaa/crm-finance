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
  TextField,
  Button,
  LinearProgress,
  CircularProgress,
  Paper,
  Select,
  MenuItem,
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
} from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';

interface TaskDetailPanelProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

export default function TaskDetailPanel({ open, onClose, task }: TaskDetailPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
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

  const { data: users = [] } = useUsersQuery();

  const { data: comments = [] } = useGetTaskCommentsQuery(task?.id || 0, {
    skip: !task?.id,
  });

  const { data: attachments = [], isLoading: isLoadingAttachments } = useGetTaskAttachmentsQuery(task?.id || 0, {
    skip: !task?.id,
  });
  const [addTaskAttachment] = useAddTaskAttachmentMutation();
  const [deleteTaskAttachment] = useDeleteTaskAttachmentMutation();

  const { data: customDefs = [] } = useGetCustomFieldDefinitionsQuery();
  const { data: customValues = [] } = useGetTaskCustomFieldsQuery(task?.id || 0, {
    skip: !task?.id,
  });
  const [saveCustomField] = useSaveTaskCustomFieldMutation();

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

  const handleToggleTimer = async () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      showToast('Stopwatch timer started ⏱️', 'info');
    } else {
      setIsTimerRunning(false);
      const hoursLogged = Math.max(0.1, parseFloat((timerSeconds / 3600).toFixed(2)));
      try {
        await logTime({
          taskId: task.id,
          hours: hoursLogged,
          log_date: new Date().toISOString().split('T')[0],
          description: `Timer logged work: ${formatTimer(timerSeconds)}`,
        }).unwrap();
        showToast(`Logged ${hoursLogged} hours to timesheet!`, 'success');
        setTimerSeconds(0);
      } catch {
        showToast('Failed to log timer hours', 'error');
      }
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

  const handleAssigneeChange = async (newAssigneeId: number | '') => {
    if (!task) return;
    try {
      const selectedUser = users.find((u) => u.id === newAssigneeId);
      await updateTask({
        id: task.id,
        body: { assignee_id: newAssigneeId || undefined },
      }).unwrap();
      showToast(
        newAssigneeId ? `Reassigned task to ${selectedUser?.full_name || 'user'}` : 'Task unassigned',
        'success'
      );
    } catch {
      showToast('Failed to update task assignee', 'error');
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
      showToast('Comment posted', 'success');
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
        sx: { width: { xs: '100%', sm: 600, md: 840 }, p: 0, bgcolor: 'background.default' },
      }}
    >
      {/* Header */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={task.priority}
            size="small"
            sx={{ bgcolor: '#04552B', color: '#FFFFFF', fontWeight: 700 }}
          />
          <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
            {task.project_name || 'Project Workspace'}
          </Typography>
        </Box>

        {/* Live Stopwatch Timer Widget */}
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

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: 'calc(100vh - 65px)' }}>
        {/* Main Body (Left side of panel) */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', bgcolor: 'background.paper' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
            {task.title}
          </Typography>

          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.description || 'No detailed description provided for this task.'}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* ── TASK DEPENDENCIES ─────────────────────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock size={18} color="#D97706" /> Task Dependencies
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 200, borderRadius: '8px', bgcolor: 'background.default' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                  WAITING ON (BLOCKING THIS TASK)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  None (Task is unblocked)
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 200, borderRadius: '8px', bgcolor: 'background.default' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                  BLOCKING OTHERS
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  None
                </Typography>
              </Paper>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── SUBTASKS ──────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListTree size={18} color="#04552B" />
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Subtasks
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {task.subtasks?.length > 0
                  ? `${task.subtasks.filter((s) => s.is_completed).length} of ${task.subtasks.length} completed (${Math.round((task.subtasks.filter((s) => s.is_completed).length / task.subtasks.length) * 100)}%)`
                  : '0 Subtasks'}
              </Typography>
            </Box>

            {task.subtasks?.length > 0 && (
              <LinearProgress
                variant="determinate"
                value={(task.subtasks.filter((s) => s.is_completed).length / task.subtasks.length) * 100}
                sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: '#04552B' } }}
              />
            )}

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
                      borderColor: sub.is_completed ? 'divider' : 'action.focus',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={sub.is_completed}
                        onChange={() => handleToggleSubtask(sub.id)}
                        style={{ cursor: 'pointer', width: 17, height: 17, accentColor: '#04552B' }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: sub.is_completed ? 400 : 600,
                          textDecoration: sub.is_completed ? 'line-through' : 'none',
                          color: sub.is_completed ? 'text.secondary' : 'text.primary',
                          fontSize: 14,
                        }}
                      >
                        {sub.title}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={sub.is_completed ? 'COMPLETED' : 'PENDING'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: sub.is_completed ? '#DCFCE7' : '#FEF3C7',
                          color: sub.is_completed ? '#166534' : '#92400E',
                        }}
                      />
                      <IconButton size="small" onClick={() => handleDeleteSubtask(sub.id)}>
                        <Trash2 size={15} color="#DC2626" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Add Subtask Input */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="+ Add new subtask title..."
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
                sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 36, textTransform: 'none', px: 2, fontWeight: 600 }}
              >
                Add Subtask
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── FILE ATTACHMENTS ──────────────────────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Paperclip size={18} color="#2563EB" /> File Attachments ({attachments.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<UploadCloud size={14} />}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600 }}
              >
                Upload File
                <input type="file" hidden multiple onChange={handleFileUpload} />
              </Button>
            </Box>

            {isLoadingAttachments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : attachments.length === 0 ? (
              <Typography variant="body2" color="textSecondary">No files attached to this task yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {attachments.map((file) => (
                  <Paper
                    key={file.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      borderRadius: '8px',
                      bgcolor: 'background.default',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FileText size={18} color="#04552B" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {file.filename}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {file.file_size || 'File'} • {new Date(file.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
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

          {/* Activity / Comments */}
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageSquare size={18} color="#64748B" /> Activity & Comments
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#04552B', fontSize: '0.875rem', fontWeight: 700 }}>A</Avatar>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                multiline
                rows={2}
              />
              <IconButton
                onClick={handlePostComment}
                disabled={isAddingComment || !commentText.trim()}
                sx={{ bgcolor: '#04552B', color: '#FFF', '&:hover': { bgcolor: '#034120' }, alignSelf: 'flex-end' }}
              >
                <Send size={16} />
              </IconButton>
            </Box>

            {/* Comments List */}
            {comments.map((c) => (
              <Box key={c.id} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#64748B' }}>
                  {c.user_name?.charAt(0) || 'U'}
                </Avatar>
                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, borderRadius: '8px', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 12 }}>
                    {c.user_name || 'Admin'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5 }}>
                    {c.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Meta Column (Right side of panel) */}
        <Box sx={{ width: { xs: '100%', md: 280 }, p: 3, borderLeft: { md: '1px solid' }, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>
            Properties
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Assignee</Typography>
              <Select
                size="small"
                fullWidth
                value={task.assignee_id || ''}
                onChange={(e) => handleAssigneeChange(e.target.value ? Number(e.target.value) : '')}
                displayEmpty
                renderValue={(selectedId) => {
                  if (!selectedId) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: '#64748B' }}>?</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 13 }}>
                          Unassigned
                        </Typography>
                      </Box>
                    );
                  }
                  const assignedUser = users.find((u) => u.id === Number(selectedId));
                  const name = assignedUser?.full_name || task.assignee_name || `User #${selectedId}`;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: '#04552B' }}>
                        {name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                        {name}
                      </Typography>
                    </Box>
                  );
                }}
                sx={{
                  height: 36,
                  fontSize: 13,
                  bgcolor: 'background.paper',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                }}
              >
                <MenuItem value="">
                  <Typography variant="body2" color="textSecondary"><em>Unassigned</em></Typography>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#04552B' }}>
                        {u.full_name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{u.full_name}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: 11 }}>{u.email || u.role}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Priority</Typography>
              <Chip size="small" label={task.priority} sx={{ fontWeight: 700, height: 24 }} />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Due Date</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={16} color="#64748B" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.due_date || 'None'}</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Time Tracked</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock size={16} color="#64748B" />
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {task.actual_hours}h / {task.estimated_hours}h
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>
              Custom Fields
            </Typography>

            {customDefs.length === 0 ? (
              <Typography variant="caption" color="textSecondary">No custom fields configured for tasks.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {customDefs.map((def) => {
                  const valObj = customValues.find((v) => v.field_id === def.id);
                  const isEditing = editingFieldId === def.id;

                  return (
                    <Box key={def.id}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {def.label}
                      </Typography>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <TextField
                            size="small"
                            value={editFieldValue}
                            onChange={(e) => setEditFieldValue(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { height: 30, fontSize: 13 } }}
                          />
                          <IconButton size="small" onClick={() => handleSaveCustomField(def.id)} sx={{ color: '#16A34A' }}>
                            <Check size={16} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: valObj?.value ? 'text.primary' : 'text.secondary' }}>
                            {valObj?.value || 'Not set'}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingFieldId(def.id);
                              setEditFieldValue(valObj?.value || '');
                            }}
                            sx={{ p: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}
                          >
                            <Edit2 size={13} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

