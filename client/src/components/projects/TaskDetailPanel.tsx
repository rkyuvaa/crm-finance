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
  Paper,
  Tooltip,
} from '@mui/material';
import {
  X,
  Clock,
  Calendar,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  Plus,
  Paperclip,
  Lock,
  FileText,
  UploadCloud,
  Trash2,
  Play,
  Square,
  Send,
} from 'lucide-react';
import {
  TaskItem,
  useToggleSubtaskMutation,
  useAddSubtaskMutation,
  useLogTimeMutation,
  useAddCommentMutation,
  useGetTaskCommentsQuery,
} from '@/api/projectsApi';
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

  const [toggleSubtask] = useToggleSubtaskMutation();
  const [addSubtask, { isLoading: isAddingSubtask }] = useAddSubtaskMutation();
  const [logTime, { isLoading: isLoggingTime }] = useLogTimeMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  const { data: comments = [] } = useGetTaskCommentsQuery(task?.id || 0, {
    skip: !task?.id,
  });

  const { showToast } = useToast();

  const [attachments, setAttachments] = useState<
    Array<{ id: number; name: string; size: string; date: string }>
  >([
    { id: 1, name: 'engineering_blueprint_v2.pdf', size: '2.4 MB', date: '2026-09-02' },
  ]);

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
          body: {
            hours: hoursLogged,
            log_date: new Date().toISOString().split('T')[0],
            description: `Timer logged work: ${formatTimer(timerSeconds)}`,
          },
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

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await addSubtask({
        taskId: task.id,
        body: { title: newSubtaskTitle.trim() },
      }).unwrap();
      setNewSubtaskTitle('');
      showToast('Subtask added', 'success');
    } catch {
      showToast('Failed to add subtask', 'error');
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({
        taskId: task.id,
        body: { content: commentText.trim() },
      }).unwrap();
      setCommentText('');
      showToast('Comment posted', 'success');
    } catch {
      showToast('Failed to post comment', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems = Array.from(files).map((f, i) => ({
        id: Date.now() + i,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toISOString().split('T')[0],
      }));
      setAttachments((prev) => [...prev, ...newItems]);
      showToast('File attached successfully', 'success');
    }
  };

  const handleRemoveAttachment = (id: number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    showToast('Attachment removed', 'info');
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
          justify: 'space-between',
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

          {/* ── CLICKUP TASK DEPENDENCIES ─────────────────────────────────── */}
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

          {/* ── CLICKUP CHECKLISTS & INTERACTIVE SUBTASKS ──────────────────── */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckSquare size={18} color="#04552B" />
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Subtasks & Checklists
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {task.subtasks?.length > 0
                  ? `${Math.round((task.subtasks.filter((s) => s.is_completed).length / task.subtasks.length) * 100)}%`
                  : '0%'}
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
                  <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input
                      type="checkbox"
                      checked={sub.is_completed}
                      onChange={() => handleToggleSubtask(sub.id)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                    <Typography sx={{ textDecoration: sub.is_completed ? 'line-through' : 'none', color: sub.is_completed ? 'text.secondary' : 'text.primary', fontSize: 14 }}>
                      {sub.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Add Subtask Input */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="+ Add Subtask item (Press Enter)"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                sx={{ '& .MuiOutlinedInput-root': { height: 32, fontSize: 13 } }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAddSubtask}
                disabled={isAddingSubtask}
                sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 32, textTransform: 'none' }}
              >
                Add
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* ── CLICKUP FILE ATTACHMENTS ──────────────────────────────────── */}
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

            {attachments.length === 0 ? (
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
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {file.size} • Uploaded {file.date}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: '#04552B' }}>
                  {task.assignee_name?.charAt(0) || '?'}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.assignee_name || 'Unassigned'}</Typography>
              </Box>
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Cost Center</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>CC-OPS-2026</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Risk Level</Typography>
                <Chip size="small" label="Medium" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700 }} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
