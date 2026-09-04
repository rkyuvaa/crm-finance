import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Tag,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { useBulkTaskActionMutation, useGetStatusDefinitionsQuery } from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';

interface TaskBulkActionBarProps {
  selectedCount: number;
  selectedTaskIds: number[];
  onClearSelection: () => void;
}

export default function TaskBulkActionBar({
  selectedCount,
  selectedTaskIds,
  onClearSelection,
}: TaskBulkActionBarProps) {
  const [bulkAction, { isLoading }] = useBulkTaskActionMutation();
  const { data: users = [] } = useUsersQuery();
  const { data: statuses = [] } = useGetStatusDefinitionsQuery();
  const { showToast } = useToast();

  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [statusId, setStatusId] = useState<number | ''>('');
  const [priority, setPriority] = useState<string>('');

  if (selectedCount === 0) return null;

  const handleApplyStatus = async (val: number) => {
    try {
      const res = await bulkAction({
        task_ids: selectedTaskIds,
        action: 'CHANGE_STATUS',
        value: val,
      }).unwrap();
      showToast(`Updated status for ${res.affected} tasks`, 'success');
      setStatusId('');
    } catch {
      showToast('Bulk status update failed', 'error');
    }
  };

  const handleApplyAssignee = async (val: number) => {
    try {
      const res = await bulkAction({
        task_ids: selectedTaskIds,
        action: 'ASSIGN_USER',
        value: val,
      }).unwrap();
      showToast(`Assigned ${res.affected} tasks`, 'success');
      setAssigneeId('');
    } catch {
      showToast('Bulk assignment failed', 'error');
    }
  };

  const handleApplyPriority = async (val: string) => {
    try {
      const res = await bulkAction({
        task_ids: selectedTaskIds,
        action: 'CHANGE_PRIORITY',
        value: val,
      }).unwrap();
      showToast(`Updated priority for ${res.affected} tasks`, 'success');
      setPriority('');
    } catch {
      showToast('Bulk priority update failed', 'error');
    }
  };

  const handleDeleteBulk = async () => {
    if (confirm(`Are you sure you want to delete ${selectedCount} selected tasks?`)) {
      try {
        const res = await bulkAction({
          task_ids: selectedTaskIds,
          action: 'DELETE',
        }).unwrap();
        showToast(`Deleted ${res.affected} tasks`, 'info');
        onClearSelection();
      } catch {
        showToast('Bulk delete failed', 'error');
      }
    }
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1300,
        px: 3,
        py: 1.5,
        borderRadius: '30px',
        bgcolor: '#0F172A',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Layers size={18} color="#10B981" />
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 14 }}>
          {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'} selected
        </Typography>
      </Box>

      <Box sx={{ height: 24, width: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />

      {/* Change Status */}
      <Select
        size="small"
        displayEmpty
        value={statusId}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (val) handleApplyStatus(val);
        }}
        renderValue={() => 'Status'}
        sx={{
          height: 32,
          color: '#FFF',
          fontSize: 13,
          bgcolor: 'rgba(255,255,255,0.1)',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiSvgIcon-root': { color: '#FFF' },
        }}
      >
        {statuses.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </Select>

      {/* Assign User */}
      <Select
        size="small"
        displayEmpty
        value={assigneeId}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (val) handleApplyAssignee(val);
        }}
        renderValue={() => 'Assignee'}
        sx={{
          height: 32,
          color: '#FFF',
          fontSize: 13,
          bgcolor: 'rgba(255,255,255,0.1)',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiSvgIcon-root': { color: '#FFF' },
        }}
      >
        {users.map((u) => (
          <MenuItem key={u.id} value={u.id}>
            {u.full_name}
          </MenuItem>
        ))}
      </Select>

      {/* Set Priority */}
      <Select
        size="small"
        displayEmpty
        value={priority}
        onChange={(e) => {
          const val = e.target.value as string;
          if (val) handleApplyPriority(val);
        }}
        renderValue={() => 'Priority'}
        sx={{
          height: 32,
          color: '#FFF',
          fontSize: 13,
          bgcolor: 'rgba(255,255,255,0.1)',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
          '& .MuiSvgIcon-root': { color: '#FFF' },
        }}
      >
        <MenuItem value="URGENT">Urgent</MenuItem>
        <MenuItem value="HIGH">High</MenuItem>
        <MenuItem value="NORMAL">Normal</MenuItem>
        <MenuItem value="LOW">Low</MenuItem>
      </Select>

      {/* Delete */}
      <Tooltip title="Delete selected tasks">
        <IconButton size="small" onClick={handleDeleteBulk} sx={{ color: '#EF4444' }}>
          <Trash2 size={16} />
        </IconButton>
      </Tooltip>

      {/* Close Selection */}
      <IconButton size="small" onClick={onClearSelection} sx={{ color: '#94A3B8' }}>
        <X size={18} />
      </IconButton>
    </Paper>
  );
}
