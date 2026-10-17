import React, { useState } from 'react';
import { useSelector } from 'react-redux';
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
  AvatarGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Tooltip,
  Collapse,
  Checkbox,
  InputLabel,
  ListItemText,
  OutlinedInput,
  useTheme,
  Menu,
  Divider,
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  Search,
  Flag,
  CheckSquare,
  Clock,
  Trash2,
  Lock,
  RefreshCw,
  Link2,
  Edit2,
  Folder,
  FolderPlus,
  GripVertical,
  MoreVertical,
  CornerDownRight,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react';
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useAddSubtaskMutation,
  useDeleteTaskMutation,
  useGetStatusDefinitionsQuery,
  useGetProjectMilestonesQuery,
  useDeleteProjectMilestoneMutation,
  useGetProjectTaskListsQuery,
  useCreateTaskListMutation,
  useUpdateTaskListMutation,
  useDeleteTaskListMutation,
  useReorderTaskListsMutation,
  useReorderTasksMutation,
  TaskItem,
  TaskDependencyInfo,
  ProjectTaskListItem,
} from '@/api/projectsApi';
import { useUsersQuery } from '@/api/mastersApi';
import { useToast } from '@/components/ui/ToastHost';
import { time24To12, time12To24, formatDateTime12h, formatStandardDateTime, formatDependencyLabel, getTaskIdBadgeStyle } from '@/utils/format';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';
import DependencyModal from '@/components/projects/DependencyModal';

interface ProjectTasksListProps {
  projectId: string;
}

export default function ProjectTasksList({ projectId }: ProjectTasksListProps) {
  const toast = useToast();
  const numericProjectId = Number(projectId);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const tTokens = {
    cardBg: isDark ? '#181D22' : '#FFFFFF',
    subtleBg: isDark ? '#13171B' : '#F5F7F5',
    subtleHover: isDark ? '#1C232B' : '#EDF2ED',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(32, 48, 32, 0.035)',
    stickyMainBg: isDark ? '#181D22' : '#FFFFFF',
    stickyNestedBg: isDark ? '#13171B' : '#F5F7F5',
    stickyHoverMain: isDark ? '#1F262E' : '#F5F7F5',
    stickyHoverNested: isDark ? '#192027' : '#EEF2EE',
    headerBg: isDark ? '#13171B' : '#F5F7F5',
    groupHeaderBg: isDark ? '#15191E' : '#EFF4EF',
    groupHeaderHover: isDark ? '#1A2128' : '#E6EDE6',
    taskListBg: isDark ? '#161B21' : '#F4F7F4',
    taskListHover: isDark ? '#1C232B' : '#ECF1EC',
    inputBgHover: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(32, 48, 32, 0.04)',
    inputBgFocus: isDark ? '#13171B' : '#FFFFFF',
    inputBorderFocus: isDark ? '#5FCF87' : '#203020',
    primaryBtn: '#203020',
    primaryBtnHover: '#2A402A',
    borderColor: isDark ? '#262E36' : '#E2E8E2',
  };

  const { data: users = [] } = useUsersQuery();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [searchQ, setSearchQ] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [quickTaskInputs, setQuickTaskInputs] = useState<Record<number, string>>({});
  const [groupBy, setGroupBy] = useState<'status' | 'milestone'>('milestone');

  const { data: milestones = [] } = useGetProjectMilestonesQuery(numericProjectId);

  const isRecalculating = useSelector((state: any) => {
    if (!state.projectsApi || !state.projectsApi.mutations) return false;
    return Object.values(state.projectsApi.mutations).some((m: any) => 
      (m.endpointName === 'updateTask' || m.endpointName === 'createTask' || m.endpointName === 'deleteTask') && m.status === 'pending'
    );
  });

  // Subtask Collapsible & Creation State
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<number, boolean>>({});
  const [addingSubtaskId, setAddingSubtaskId] = useState<number | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const { data: tasks = [], isLoading } = useGetTasksQuery({
    project_id: numericProjectId,
    q: searchQ || undefined,
    include_subtasks: true,
  });

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = safeTasks.filter((t) => {
    if (!t) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  // Map of subtasks by parent_id for quick and foolproof hierarchy resolution
  const subtasksByParentId = React.useMemo(() => {
    const map: Record<number, Map<number, TaskItem>> = {};
    safeTasks.forEach((t) => {
      if (t.parent_task_id) {
        if (!map[t.parent_task_id]) map[t.parent_task_id] = new Map();
        map[t.parent_task_id].set(t.id, t);
      }
    });
    const res: Record<number, TaskItem[]> = {};
    Object.keys(map).forEach((key) => {
      const pid = Number(key);
      res[pid] = Array.from(map[pid].values());
    });
    return res;
  }, [safeTasks]);

  const getSubtasksForTask = React.useCallback((task: TaskItem): TaskItem[] => {
    const combinedMap = new Map<number, TaskItem>();
    const directNested = task.nested_subtasks || task.subtasks || [];
    directNested.forEach((st) => {
      if (st && st.id) combinedMap.set(st.id, st);
    });
    const fromMap = subtasksByParentId[task.id] || [];
    fromMap.forEach((st) => {
      if (st && st.id) combinedMap.set(st.id, st);
    });
    return Array.from(combinedMap.values());
  }, [subtasksByParentId]);

  const { data: statusDefs = [] } = useGetStatusDefinitionsQuery();
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [addSubtask] = useAddSubtaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const { data: taskLists = [] } = useGetProjectTaskListsQuery(numericProjectId);
  const [createTaskList] = useCreateTaskListMutation();
  const [updateTaskList] = useUpdateTaskListMutation();
  const [deleteTaskList] = useDeleteTaskListMutation();
  const [deleteProjectMilestone] = useDeleteProjectMilestoneMutation();
  const [reorderTaskLists] = useReorderTaskListsMutation();
  const [reorderTasks] = useReorderTasksMutation();

  // Dependency Modal State
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [depModalTask, setDepModalTask] = useState<TaskItem | null>(null);
  const [depModalDependency, setDepModalDependency] = useState<TaskDependencyInfo | null>(null);

  const handleOpenDependencyModal = (task: TaskItem, dep: TaskDependencyInfo | null = null) => {
    setDepModalTask(task);
    setDepModalDependency(dep);
    setDepModalOpen(true);
  };

  // Drag and drop state for reordering
  type DragItemType =
    | { type: 'TASK_LIST'; id: number; milestoneId: number }
    | { type: 'TASK'; id: number; taskListId?: number | null; milestoneId?: number | null; parentTaskId?: number | null };

  const [dragItem, setDragItem] = useState<DragItemType | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Task Creation Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState<number>(1);
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('05:00 PM');
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(0);
  const [milestoneId, setMilestoneId] = useState<number | ''>('');
  const [taskListId, setTaskListId] = useState<number | ''>('');
  const [isTaskListLocked, setIsTaskListLocked] = useState(false);

  // Task List Creation / Renaming Dialog States
  const [createTaskListOpen, setCreateTaskListOpen] = useState(false);
  const [targetMilestoneIdForTaskList, setTargetMilestoneIdForTaskList] = useState<number | null>(null);
  const [newTaskListName, setNewTaskListName] = useState('');

  const [editTaskListOpen, setEditTaskListOpen] = useState(false);
  const [editingTaskListId, setEditingTaskListId] = useState<number | null>(null);
  const [editingTaskListName, setEditingTaskListName] = useState('');

  const [expandedTaskLists, setExpandedTaskLists] = useState<Record<number, boolean>>({});

  const handleOpenCreateTaskList = (mId: number) => {
    setTargetMilestoneIdForTaskList(mId);
    setNewTaskListName('');
    setCreateTaskListOpen(true);
  };

  const handleCreateTaskListSubmit = async () => {
    if (!newTaskListName.trim() || !targetMilestoneIdForTaskList) return;
    try {
      await createTaskList({
        milestoneId: targetMilestoneIdForTaskList,
        name: newTaskListName.trim(),
      }).unwrap();
      toast.showSuccess(`Task List "${newTaskListName.trim()}" created`);
      setCreateTaskListOpen(false);
      setNewTaskListName('');
      setTargetMilestoneIdForTaskList(null);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create task list');
    }
  };

  const handleOpenEditTaskList = (tl: ProjectTaskListItem) => {
    setEditingTaskListId(tl.id);
    setEditingTaskListName(tl.name);
    setEditTaskListOpen(true);
  };

  const handleUpdateTaskListSubmit = async () => {
    if (!editingTaskListName.trim() || !editingTaskListId) return;
    try {
      await updateTaskList({
        id: editingTaskListId,
        name: editingTaskListName.trim(),
      }).unwrap();
      toast.showSuccess('Task List updated');
      setEditTaskListOpen(false);
      setEditingTaskListId(null);
      setEditingTaskListName('');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to update task list');
    }
  };

  // Row Actions Context Menu State (Requirement 9)
  const [rowMenuAnchor, setRowMenuAnchor] = useState<{
    mouseX?: number;
    mouseY?: number;
    anchorEl?: HTMLElement | null;
    type: 'TASK' | 'TASK_LIST' | 'MILESTONE';
    item: any;
    depth?: number;
  } | null>(null);

  // Delete Confirmation Dialog State (Requirement 9)
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    type: 'TASK' | 'TASK_LIST' | 'MILESTONE';
    id: number;
    name: string;
    descendantCount: number;
    descriptionText: string;
  }>({
    open: false,
    type: 'TASK',
    id: 0,
    name: '',
    descendantCount: 0,
    descriptionText: '',
  });

  // Count descendants for Task
  const countTaskDescendants = (taskId: number): number => {
    let count = 0;
    const directChildren = safeTasks.filter((t) => t.parent_task_id === taskId && !t.is_deleted);
    count += directChildren.length;
    for (const child of directChildren) {
      count += countTaskDescendants(child.id);
    }
    return count;
  };

  // Count descendants for Task List
  const countTaskListDescendants = (taskListId: number): number => {
    const directTasks = safeTasks.filter((t) => t.task_list_id === taskListId && !t.parent_task_id && !t.is_deleted);
    let count = directTasks.length;
    for (const t of directTasks) {
      count += countTaskDescendants(t.id);
    }
    return count;
  };

  // Count descendants for Milestone
  const countMilestoneDescendants = (mId: number): { taskListsCount: number; tasksCount: number } => {
    const mTaskLists = taskLists.filter((tl) => tl.milestone_id === mId);
    const mTasks = safeTasks.filter((t) => t.milestone_id === mId && !t.is_deleted);
    return {
      taskListsCount: mTaskLists.length,
      tasksCount: mTasks.length,
    };
  };

  // Open Delete Confirmation Dialog
  const handlePromptDelete = (item: any, type: 'TASK' | 'TASK_LIST' | 'MILESTONE') => {
    if (type === 'TASK') {
      const descendants = countTaskDescendants(item.id);
      setDeleteDialogState({
        open: true,
        type: 'TASK',
        id: item.id,
        name: item.title,
        descendantCount: descendants,
        descriptionText:
          descendants > 0
            ? `This task and all its ${descendants} descendant sub-task${descendants === 1 ? '' : 's'} will be permanently deleted.`
            : 'Are you sure you want to delete this task?',
      });
    } else if (type === 'TASK_LIST') {
      const descendants = countTaskListDescendants(item.id);
      setDeleteDialogState({
        open: true,
        type: 'TASK_LIST',
        id: item.id,
        name: item.name,
        descendantCount: descendants,
        descriptionText:
          descendants > 0
            ? `This task list and all its ${descendants} contained task${descendants === 1 ? '' : 's'} and sub-tasks will be permanently deleted.`
            : 'Are you sure you want to delete this empty task list?',
      });
    } else if (type === 'MILESTONE') {
      const { taskListsCount, tasksCount } = countMilestoneDescendants(item.id);
      const total = taskListsCount + tasksCount;
      setDeleteDialogState({
        open: true,
        type: 'MILESTONE',
        id: item.id,
        name: item.title || item.name,
        descendantCount: total,
        descriptionText: `This milestone and all its ${taskListsCount} task list${taskListsCount === 1 ? '' : 's'} and ${tasksCount} task${tasksCount === 1 ? '' : 's'} / sub-tasks will be permanently deleted.`,
      });
    }
  };

  // Confirm and Execute Deletion
  const handleConfirmDelete = async () => {
    const { type, id } = deleteDialogState;
    try {
      if (type === 'TASK') {
        await deleteTask(id).unwrap();
        toast.showSuccess('Task and descendants deleted');
      } else if (type === 'TASK_LIST') {
        await deleteTaskList(id).unwrap();
        toast.showSuccess('Task list and child tasks deleted');
      } else if (type === 'MILESTONE') {
        await deleteProjectMilestone(id).unwrap();
        toast.showSuccess('Milestone and child items deleted');
      }
      setDeleteDialogState((prev) => ({ ...prev, open: false }));
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to delete item');
    }
  };

  // Row Action: Add Sub-task directly from menu
  const handleAddSubtaskFromMenu = async (parentTask: TaskItem) => {
    try {
      await createTask({
        title: 'New Sub-task',
        project_id: numericProjectId,
        milestone_id: parentTask.milestone_id || undefined,
        task_list_id: parentTask.task_list_id || undefined,
        parent_task_id: parentTask.id,
        status_id: 1,
        priority: 'NORMAL',
      } as any).unwrap();
      setExpandedTaskIds((prev) => ({ ...prev, [parentTask.id]: true }));
      toast.showSuccess('Sub-task created');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to add sub-task');
    }
  };

  // Row Action: Create Task Above
  const handleCreateTaskAbove = async (referenceTask: TaskItem) => {
    const siblings = safeTasks.filter((t) =>
      (t.parent_task_id || null) === (referenceTask.parent_task_id || null) &&
      (t.task_list_id || null) === (referenceTask.task_list_id || null) &&
      (t.milestone_id || null) === (referenceTask.milestone_id || null)
    ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

    const refIndex = siblings.findIndex((t) => t.id === referenceTask.id);

    try {
      const res = await createTask({
        title: referenceTask.parent_task_id ? 'New Sub-task' : 'New Task',
        project_id: numericProjectId,
        milestone_id: referenceTask.milestone_id || undefined,
        task_list_id: referenceTask.task_list_id || undefined,
        parent_task_id: referenceTask.parent_task_id || undefined,
        status_id: referenceTask.status_id || 1,
        priority: 'NORMAL',
      } as any).unwrap();

      const newTaskId = (res as any).id;
      const updatedSiblingIds = siblings.map((t) => t.id);
      const insertIdx = refIndex >= 0 ? refIndex : 0;
      updatedSiblingIds.splice(insertIdx, 0, newTaskId);

      await reorderTasks({ siblingIds: updatedSiblingIds }).unwrap();
      toast.showSuccess('Task created above');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create task above');
    }
  };

  // Row Action: Create Task Below
  const handleCreateTaskBelow = async (referenceTask: TaskItem) => {
    const siblings = safeTasks.filter((t) =>
      (t.parent_task_id || null) === (referenceTask.parent_task_id || null) &&
      (t.task_list_id || null) === (referenceTask.task_list_id || null) &&
      (t.milestone_id || null) === (referenceTask.milestone_id || null)
    ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

    const refIndex = siblings.findIndex((t) => t.id === referenceTask.id);

    try {
      const res = await createTask({
        title: referenceTask.parent_task_id ? 'New Sub-task' : 'New Task',
        project_id: numericProjectId,
        milestone_id: referenceTask.milestone_id || undefined,
        task_list_id: referenceTask.task_list_id || undefined,
        parent_task_id: referenceTask.parent_task_id || undefined,
        status_id: referenceTask.status_id || 1,
        priority: 'NORMAL',
      } as any).unwrap();

      const newTaskId = (res as any).id;
      const updatedSiblingIds = siblings.map((t) => t.id);
      const insertIdx = refIndex >= 0 ? refIndex + 1 : updatedSiblingIds.length;
      updatedSiblingIds.splice(insertIdx, 0, newTaskId);

      await reorderTasks({ siblingIds: updatedSiblingIds }).unwrap();
      toast.showSuccess('Task created below');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create task below');
    }
  };

  const toggleTaskList = (tlId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTaskLists((prev) => ({ ...prev, [tlId]: prev[tlId] === false ? true : false }));
  };

  const defaultStatuses = [
    { id: 1, name: 'To Do', color: '#64748B', is_terminal: false },
    { id: 2, name: 'In Progress', color: '#2563EB', is_terminal: false },
    { id: 3, name: 'In Review', color: '#D97706', is_terminal: false },
    { id: 4, name: 'Done', color: '#16A34A', is_terminal: true },
    { id: 5, name: 'Blocked', color: '#DC2626', is_terminal: false },
  ];

  const activeStatuses = statusDefs.length > 0 ? statusDefs : defaultStatuses;

  const toggleGroup = (statusIdVal: number) => {
    setExpandedGroups((prev) => ({ ...prev, [statusIdVal]: !prev[statusIdVal] }));
  };

  const toggleSubtasksExpand = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCreateSubtask = async (parentId: number) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await addSubtask({ taskId: parentId, body: { title: newSubtaskTitle.trim() } }).unwrap();
      toast.showSuccess('Subtask created successfully');
      setNewSubtaskTitle('');
      setAddingSubtaskId(null);
      setExpandedTaskIds((prev) => ({ ...prev, [parentId]: true }));
    } catch {
      toast.showError('Failed to create subtask');
    }
  };

  const handleToggleSubtaskCompleted = async (subtask: TaskItem, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    try {
      await updateTask({ id: subtask.id, body: { is_completed: !subtask.is_completed } }).unwrap();
    } catch {
      toast.showError('Failed to update subtask status');
    }
  };

  const handleDeleteTaskItem = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id).unwrap();
        toast.showSuccess('Task deleted');
      } catch {
        toast.showError('Failed to delete task');
      }
    }
  };

  const [selectedDep, setSelectedDep] = useState<TaskDependencyInfo | null>(null);

  const openTask = (task: TaskItem) => {
    setSelectedTask(task);
    setSelectedDep(null);
    setPanelOpen(true);
  };

  const openTaskWithDep = (task: TaskItem, dep: TaskDependencyInfo) => {
    setSelectedTask(task);
    setSelectedDep(dep);
    setPanelOpen(true);
  };

  const handleOpenCreateModal = (defaultStatusId: number = 1, defaultMilestoneId?: number, defaultTaskListId?: number) => {
    setTitle('');
    setDescription('');
    setStatusId(defaultStatusId);
    setMilestoneId(defaultMilestoneId || '');
    setTaskListId(defaultTaskListId || '');
    setIsTaskListLocked(Boolean(defaultTaskListId));
    setPriority('NORMAL');
    setAssigneeIds([]);
    setStartDate('');
    setStartTime('09:00 AM');
    setDueDate('');
    setDueTime('05:00 PM');
    setEstimatedHours(0);
    setCreateOpen(true);
  };

  const handleTaskListDragOver = (e: React.DragEvent, targetTl: ProjectTaskListItem) => {
    if (!dragItem || dragItem.type !== 'TASK_LIST') return;
    if (dragItem.milestoneId !== targetTl.milestone_id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const pos = relY < rect.height / 2 ? 'top' : 'bottom';
    setDragOverTargetId(targetTl.id);
    setDragOverPosition(pos);
  };

  const handleTaskListDrop = async (e: React.DragEvent, targetTl: ProjectTaskListItem) => {
    e.preventDefault();
    if (!dragItem || dragItem.type !== 'TASK_LIST') return;
    if (dragItem.milestoneId !== targetTl.milestone_id || dragItem.id === targetTl.id) {
      setDragItem(null);
      setDragOverTargetId(null);
      setDragOverPosition(null);
      return;
    }

    const siblings = [...taskLists.filter((tl) => tl.milestone_id === targetTl.milestone_id)].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
    );

    const dragIdx = siblings.findIndex((x) => x.id === dragItem.id);
    const targetIdx = siblings.findIndex((x) => x.id === targetTl.id);
    if (dragIdx === -1 || targetIdx === -1) {
      setDragItem(null);
      setDragOverTargetId(null);
      setDragOverPosition(null);
      return;
    }

    const updated = [...siblings];
    const [removed] = updated.splice(dragIdx, 1);
    const insertIdx = updated.findIndex((x) => x.id === targetTl.id);
    const finalIdx = dragOverPosition === 'bottom' ? insertIdx + 1 : insertIdx;
    updated.splice(finalIdx, 0, removed);

    const siblingIds = updated.map((x) => x.id);
    setDragItem(null);
    setDragOverTargetId(null);
    setDragOverPosition(null);

    try {
      await reorderTaskLists({ milestoneId: targetTl.milestone_id, siblingIds }).unwrap();
      toast.showSuccess('Task list order updated');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to reorder task lists');
    }
  };

  const handleTaskDragOver = (e: React.DragEvent, targetTask: TaskItem) => {
    if (!dragItem || dragItem.type !== 'TASK') return;

    if (targetTask.parent_task_id) {
      if (dragItem.parentTaskId !== targetTask.parent_task_id) return;
    } else if (targetTask.task_list_id) {
      if (dragItem.parentTaskId || dragItem.taskListId !== targetTask.task_list_id) return;
    } else {
      if (dragItem.parentTaskId || dragItem.taskListId || (dragItem.milestoneId || null) !== (targetTask.milestone_id || null)) return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const pos = relY < rect.height / 2 ? 'top' : 'bottom';
    setDragOverTargetId(targetTask.id);
    setDragOverPosition(pos);
  };

  const handleTaskDrop = async (e: React.DragEvent, targetTask: TaskItem) => {
    e.preventDefault();
    if (!dragItem || dragItem.type !== 'TASK') return;
    if (dragItem.id === targetTask.id) {
      setDragItem(null);
      setDragOverTargetId(null);
      setDragOverPosition(null);
      return;
    }

    let siblings: TaskItem[] = [];
    if (targetTask.parent_task_id) {
      if (dragItem.parentTaskId !== targetTask.parent_task_id) return;
      siblings = [...(subtasksByParentId[targetTask.parent_task_id] || [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
      );
    } else if (targetTask.task_list_id) {
      if (dragItem.parentTaskId || dragItem.taskListId !== targetTask.task_list_id) return;
      siblings = [...safeTasks.filter((t) => !t.parent_task_id && t.task_list_id === targetTask.task_list_id)].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
      );
    } else {
      if (dragItem.parentTaskId || dragItem.taskListId || (dragItem.milestoneId || null) !== (targetTask.milestone_id || null)) return;
      siblings = [...safeTasks.filter((t) => !t.parent_task_id && !t.task_list_id && (t.milestone_id || null) === (targetTask.milestone_id || null))].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
      );
    }

    const dragIdx = siblings.findIndex((x) => x.id === dragItem.id);
    const targetIdx = siblings.findIndex((x) => x.id === targetTask.id);
    if (dragIdx === -1 || targetIdx === -1) {
      setDragItem(null);
      setDragOverTargetId(null);
      setDragOverPosition(null);
      return;
    }

    const updated = [...siblings];
    const [removed] = updated.splice(dragIdx, 1);
    const insertIdx = updated.findIndex((x) => x.id === targetTask.id);
    const finalIdx = dragOverPosition === 'bottom' ? insertIdx + 1 : insertIdx;
    updated.splice(finalIdx, 0, removed);

    const siblingIds = updated.map((x) => x.id);
    setDragItem(null);
    setDragOverTargetId(null);
    setDragOverPosition(null);

    try {
      await reorderTasks({ siblingIds }).unwrap();
      toast.showSuccess('Task order updated');
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to reorder tasks');
    }
  };

  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedTaskIds({});
      setIsAllExpanded(false);
    } else {
      const allIds: Record<number, boolean> = {};
      const collectIds = (taskList: TaskItem[]) => {
        taskList.forEach((t) => {
          allIds[t.id] = true;
          const subList = getSubtasksForTask(t);
          if (subList.length > 0) {
            collectIds(subList);
          }
        });
      };
      collectIds(safeTasks);
      setExpandedTaskIds(allIds);
      setIsAllExpanded(true);
    }
  };

  const getTaskDurationDisplay = (t: TaskItem): number => {
    if (t.duration_working_days && t.duration_working_days > 0) {
      return t.duration_working_days;
    }
    if (t.start_date && t.due_date) {
      const s = new Date(t.start_date.split('T')[0]);
      const d = new Date(t.due_date.split('T')[0]);
      if (!isNaN(s.getTime()) && !isNaN(d.getTime()) && d >= s) {
        let count = 0;
        const cur = new Date(s);
        while (cur <= d) {
          const day = cur.getDay();
          if (day !== 0 && day !== 6) count++;
          cur.setDate(cur.getDate() + 1);
        }
        return count || 1;
      }
    }
    return t.duration_working_days ?? 0;
  };

  const getErrorMessage = (err: any): string => {
    if (typeof err?.data?.detail === 'string') return err.data.detail;
    if (Array.isArray(err?.data?.detail) && err.data.detail.length > 0) {
      return err.data.detail[0]?.msg || err.data.detail[0]?.message || 'Invalid value or date entered';
    }
    if (typeof err?.data?.detail === 'object' && err?.data?.detail !== null) {
      return err.data.detail.message || err.data.detail.detail || 'Invalid value or date entered';
    }
    return err?.data?.message || err?.message || 'Failed to update task';
  };

  const handleCellUpdate = async (taskId: number, field: string, value: any) => {
    try {
      await updateTask({ id: taskId, body: { [field]: value } }).unwrap();
      toast.showSuccess('Task updated');
    } catch (err: any) {
      toast.showError(getErrorMessage(err));
    }
  };

  // Inline Quick Task Creation ("Type & Enter")
  const handleQuickCreateTask = async (targetStatusId: number) => {
    const taskTitle = quickTaskInputs[targetStatusId]?.trim();
    if (!taskTitle) return;

    try {
      await createTask({
        title: taskTitle,
        project_id: numericProjectId,
        status_id: targetStatusId,
        priority: 'NORMAL',
      }).unwrap();
      setQuickTaskInputs((prev) => ({ ...prev, [targetStatusId]: '' }));
      toast.showSuccess(`Task "${taskTitle}" created!`);
    } catch (err: any) {
      const msg = typeof err?.data?.detail === 'string'
        ? err.data.detail
        : err?.data?.detail?.message || err?.message || 'Failed to create task';
      toast.showError(msg);
    }
  };

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: number) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = Number(taskIdStr);
    try {
      await updateTask({ id: taskId, body: { status_id: targetStatusId } }).unwrap();
      toast.showSuccess('Task status updated!');
    } catch (err: any) {
      const msg = typeof err?.data?.detail === 'string'
        ? err.data.detail
        : err?.data?.detail?.message || err?.message || 'Failed to update task status';
      toast.showError(msg);
    }
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      toast.showError('Task title is required');
      return;
    }
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: numericProjectId,
        status_id: statusId,
        milestone_id: milestoneId ? Number(milestoneId) : undefined,
        task_list_id: taskListId ? Number(taskListId) : undefined,
        priority,
        assignee_id: assigneeIds.length > 0 ? assigneeIds[0] : undefined,
        assignee_ids: assigneeIds,
        start_date: startDate || undefined,
        start_time: startTime || undefined,
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
        estimated_hours: Number(estimatedHours) || 0,
      } as any).unwrap();
      toast.showSuccess(`Task "${title}" created successfully!`);
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setAssigneeIds([]);
      setStartDate('');
      setStartTime('09:00 AM');
      setDueDate('');
      setDueTime('05:00 PM');
      setEstimatedHours(0);
      setMilestoneId('');
      setTaskListId('');
      setIsTaskListLocked(false);
    } catch (err: any) {
      toast.showError(err?.data?.detail || 'Failed to create task');
    }
  };

  const getPriorityFlagColor = (p: string) => {
    switch (p) {
      case 'URGENT':
        return '#DC2626';
      case 'HIGH':
        return '#D97706';
      case 'NORMAL':
        return '#2563EB';
      case 'LOW':
        return '#64748B';
      default:
        return '#64748B';
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
                  borderColor: isSubCompleted ? 'divider' : tTokens.borderColor,
                  borderLeft: '3px solid',
                  borderLeftColor: isDark ? '#5FCF87' : '#203020',
                  borderRadius: '8px',
                  bgcolor: isSubCompleted ? 'action.hover' : tTokens.subtleBg,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    borderColor: isDark ? '#5FCF87' : '#203020',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  openTask(sub);
                }}
              >
                {/* Subtask Header Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                    <Checkbox
                      size="small"
                      checked={!!isSubCompleted}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleSubtaskCompleted(sub, e)}
                      sx={{ p: 0.2, color: 'text.secondary', '&.Mui-checked': { color: isDark ? '#5FCF87' : '#203020' } }}
                    />
                    <Chip
                      label={sub.task_number ? sub.task_number.replace(/0+([1-9]\d*)$/, '$1') : `TASK-${sub.id}`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.6rem',
                        ...getTaskIdBadgeStyle(depth + 1),
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
                      <Flag
                        size={13}
                        color={getPriorityFlagColor(sub.priority)}
                        fill={getPriorityFlagColor(sub.priority)}
                      />
                    )}

                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteTaskItem(sub.id, e)}
                      sx={{ color: '#94A3B8', p: 0.2, '&:hover': { color: '#DC2626' } }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Subtask Meta Row */}
                {(sub.due_date || (sub.assignees && sub.assignees.length > 0)) && (
                  <Box
                    sx={{
                      display: 'flex',
                      justify: 'space-between',
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
                      <AvatarGroup max={2} sx={{ '& .MuiAvatar-root': { width: 18, height: 18, fontSize: 9, bgcolor: tTokens.primaryBtn, color: '#FFFFFF' } }}>
                        {sub.assignees.map((a) => (
                          <Avatar key={a.id} title={a.full_name}>
                            {a.full_name ? a.full_name.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    )}
                  </Box>
                )}

                {/* Sub-subtask Collapsible Toggle */}
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
                      color: isDark ? '#5FCF87' : '#203020',
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

  // Render Table Row for List View
  const renderListTableRow = (task: TaskItem, depth = 0) => {
    const subtaskList = getSubtasksForTask(task);
    const subtaskCount = task.subtask_count || subtaskList.length;
    const hasChildren = Boolean(task.is_parent || subtaskCount > 0 || subtaskList.length > 0);
    const isExpanded = !!expandedTaskIds[task.id];
    const completedCount = task.completed_subtask_count ?? subtaskList.filter((s) => s.is_completed).length;

    return (
      <React.Fragment key={task.id}>
        <TableRow
          hover
          onDragOver={(e) => handleTaskDragOver(e, task)}
          onDrop={(e) => handleTaskDrop(e, task)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setRowMenuAnchor({
              mouseX: e.clientX + 2,
              mouseY: e.clientY - 6,
              type: 'TASK',
              item: task,
              depth,
            });
          }}
          sx={{
            cursor: 'pointer',
            bgcolor: depth > 0 ? tTokens.stickyNestedBg : 'inherit',
            borderLeft: depth > 0 ? `${Math.min(depth, 3) * 3}px solid ${isDark ? '#5FCF87' : '#203020'}` : 'none',
            borderTop: dragOverTargetId === task.id && dragOverPosition === 'top' ? `2px solid ${isDark ? '#5FCF87' : '#203020'}` : undefined,
            borderBottom: dragOverTargetId === task.id && dragOverPosition === 'bottom' ? `2px solid ${isDark ? '#5FCF87' : '#203020'}` : undefined,
            '&:hover .sticky-cell': { bgcolor: depth > 0 ? tTokens.stickyHoverNested : tTokens.stickyHoverMain },
            '&:hover .row-action-btn': { opacity: 1 },
          }}
          onClick={() => openTask(task)}
        >
          {/* Expander & Drag Handle Cell (Sticky) */}
          <TableCell
            className="sticky-cell"
            align="center"
            width={44}
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: depth > 0 ? tTokens.stickyNestedBg : tTokens.stickyMainBg,
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease',
              p: 0,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 0.25 }}>
              <Box
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', `TASK:${task.id}`);
                  setDragItem({
                    type: 'TASK',
                    id: task.id,
                    taskListId: task.task_list_id,
                    milestoneId: task.milestone_id,
                    parentTaskId: task.parent_task_id,
                  });
                }}
                onDragEnd={() => {
                  setDragItem(null);
                  setDragOverTargetId(null);
                  setDragOverPosition(null);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  color: 'text.secondary',
                  opacity: 0.45,
                  p: 0.25,
                  borderRadius: '3px',
                  '&:hover': { opacity: 1, color: isDark ? '#5FCF87' : '#203020', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                }}
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </Box>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={(e) => toggleSubtasksExpand(task.id, e)}
                  sx={{
                    p: 0.25,
                    color: isExpanded ? (isDark ? '#5FCF87' : '#203020') : 'text.secondary',
                    '&:hover': { color: isDark ? '#5FCF87' : '#203020', bgcolor: isDark ? 'rgba(95, 207, 135, 0.1)' : 'rgba(32, 48, 32, 0.08)' },
                  }}
                  title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                >
                  <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {isExpanded ? '▼' : '▶'}
                  </Typography>
                </IconButton>
              ) : (
                <Box sx={{ width: 18 }} />
              )}
            </Box>
          </TableCell>

          {/* 1. Name Cell (Sticky & Inline Editable) */}
          <TableCell
            className="sticky-cell"
            sx={{
              position: 'sticky',
              left: 44,
              zIndex: 1,
              bgcolor: depth > 0 ? tTokens.stickyNestedBg : tTokens.stickyMainBg,
              whiteSpace: 'nowrap',
              borderRight: '1px solid',
              borderColor: 'divider',
              minWidth: 360,
              width: 360,
              transition: 'background-color 0.15s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pl: depth * 2.5, width: '100%' }}>
              {depth > 0 && (
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.85rem', userSelect: 'none', mr: -0.25 }}>
                  ↳
                </Typography>
              )}
              {hasChildren && (
                <Typography
                  component="span"
                  onClick={(e) => toggleSubtasksExpand(task.id, e)}
                  sx={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    color: isExpanded ? (isDark ? '#5FCF87' : '#203020') : 'text.secondary',
                    mr: 0.25,
                    '&:hover': { color: isDark ? '#5FCF87' : '#203020' },
                  }}
                  title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                >
                  {isExpanded ? '▼' : '▶'}
                </Typography>
              )}
              {task.task_number && (
                <Chip
                  label={task.task_number.replace(/0+([1-9]\d*)$/, '$1')}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    ...getTaskIdBadgeStyle(depth),
                  }}
                />
              )}
              {task.dependency_conflict?.has_conflict && (
                <Tooltip title={task.dependency_conflict.conflict_message}>
                  <Chip
                    label="⚠️ Conflict"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      bgcolor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              )}
              <TextField
                size="small"
                variant="standard"
                defaultValue={task.title}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== task.title) {
                    handleCellUpdate(task.id, 'title', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  '& .MuiInputBase-input': {
                    fontWeight: depth === 0 ? 600 : 500,
                    fontSize: '0.875rem',
                    color: 'text.primary',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: tTokens.inputBgHover },
                    '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
                  },
                }}
              />

              {hasChildren && (
                <Chip
                  onClick={(e) => toggleSubtasksExpand(task.id, e)}
                  label={`${completedCount}/${subtaskCount} subtasks`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    bgcolor: isExpanded ? (isDark ? 'rgba(95, 207, 135, 0.15)' : 'rgba(32, 48, 32, 0.08)') : tTokens.subtleBg,
                    color: isExpanded ? (isDark ? '#5FCF87' : '#203020') : 'text.secondary',
                    flexShrink: 0,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: isDark ? 'rgba(95, 207, 135, 0.25)' : 'rgba(32, 48, 32, 0.14)' },
                  }}
                />
              )}

              {/* Row Action Trigger Button (Hover reveals 3-dot button) */}
              <IconButton
                size="small"
                className="row-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setRowMenuAnchor({
                    anchorEl: e.currentTarget,
                    type: 'TASK',
                    item: task,
                    depth,
                  });
                }}
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  p: 0.25,
                  ml: 0.5,
                  flexShrink: 0,
                  color: 'text.secondary',
                  '&:hover': {
                    color: isDark ? '#5FCF87' : '#203020',
                    bgcolor: isDark ? 'rgba(95, 207, 135, 0.1)' : 'rgba(32, 48, 32, 0.08)',
                  },
                }}
                title="Row actions"
              >
                <MoreVertical size={15} />
              </IconButton>
            </Box>
          </TableCell>

          {/* 2. Dependencies (Fixed Width, Scrollable, Showing Lag Directly) */}
          <TableCell
            sx={{
              width: 170,
              minWidth: 170,
              maxWidth: 170,
              p: '6px 8px',
              verticalAlign: 'middle',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDependencyModal(task, null);
            }}
          >
            <Box
              sx={{
                maxHeight: 52,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                alignItems: 'center',
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: '2px' },
              }}
            >
              {task.dependencies && task.dependencies.length > 0 ? (
                task.dependencies.map((dep) => {
                  const dt = dep.dep_type || 'FS';
                  const num = dep.predecessor_task_number || dep.depends_on_task_number || `TASK-${dep.depends_on_task_id}`;
                  const chipLabel = formatDependencyLabel(num, dt, dep.lag_days, dep.lag_hours);
                  return (
                    <Tooltip
                      key={dep.id}
                      title={`${dep.predecessor_task_title || dep.depends_on_task_title || 'Task'} (${chipLabel}) - Click to edit`}
                    >
                      <Chip
                        icon={<Link2 size={10} color={isDark ? '#5FCF87' : '#203020'} />}
                        label={chipLabel}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDependencyModal(task, dep);
                        }}
                        sx={{
                          height: 22,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: isDark ? 'rgba(95, 207, 135, 0.15)' : '#E8F5E9',
                          color: isDark ? '#A7F3D0' : '#203020',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(95, 207, 135, 0.3)' : '#C8E6C9',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          maxWidth: '100%',
                          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                          '&:hover': { bgcolor: isDark ? 'rgba(95, 207, 135, 0.25)' : '#C8E6C9' },
                        }}
                      />
                    </Tooltip>
                  );
                })
              ) : (
                <Tooltip title="Click to add dependency">
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.disabled',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      px: 1,
                      py: 0.25,
                      borderRadius: '4px',
                      '&:hover': { color: isDark ? '#5FCF87' : '#203020', bgcolor: isDark ? 'rgba(95, 207, 135, 0.1)' : 'rgba(32, 48, 32, 0.05)' },
                    }}
                  >
                    —
                  </Typography>
                </Tooltip>
              )}
            </Box>
          </TableCell>

          {/* 3. Assigned To (Fixed Width, Scrollable, Multi-chip Select) */}
          <TableCell
            sx={{
              width: 170,
              minWidth: 170,
              maxWidth: 170,
              p: '6px 8px',
              verticalAlign: 'middle',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <FormControl size="small" variant="standard" fullWidth>
              <Select
                multiple
                displayEmpty
                value={(task.assignees || []).map((a) => a.user_id)}
                onChange={(e) => {
                  const val = e.target.value as number[];
                  handleCellUpdate(task.id, 'assignee_ids', val);
                }}
                renderValue={(selected) => {
                  const selectedIds = selected as number[];
                  if (selectedIds.length === 0) return <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.78rem' }}>Unassigned</Typography>;
                  const matched = users.filter((u) => selectedIds.includes(u.id));
                  return (
                    <Box
                      sx={{
                        maxHeight: 52,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        alignItems: 'center',
                        width: '100%',
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: '2px' },
                      }}
                    >
                      {matched.map((u) => (
                        <Chip
                          key={u.id}
                          avatar={
                            <Avatar sx={{ width: 18, height: 18, fontSize: '0.65rem', bgcolor: tTokens.primaryBtn, color: '#fff' }}>
                              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                            </Avatar>
                          }
                          label={u.full_name || u.email}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            maxWidth: '100%',
                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                          }}
                        />
                      ))}
                    </Box>
                  );
                }}
                disableUnderline
                sx={{
                  fontSize: '0.8rem',
                  width: '100%',
                  '& .MuiSelect-select': { py: 0.25, px: 0.5, borderRadius: '4px', '&:hover': { bgcolor: tTokens.inputBgHover } },
                }}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    <Checkbox size="small" checked={(task.assignees || []).some((a) => a.user_id === u.id)} />
                    <ListItemText primary={u.full_name || u.email} primaryTypographyProps={{ fontSize: 13 }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </TableCell>

          {/* 4. Start Date & Time */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={task.start_date ? `Start: ${formatStandardDateTime(task.start_date, task.start_time, '09:00')}` : 'Set start date and time'}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  type="date"
                  size="small"
                  variant="standard"
                  value={task.start_date ? task.start_date.split('T')[0].split(' ')[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleCellUpdate(task.id, 'start_date', val || null);
                  }}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                      py: 0.25,
                      px: 0.5,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: tTokens.inputBgHover, color: 'text.primary' },
                      '&:focus': { bgcolor: tTokens.inputBgFocus, color: 'text.primary', outline: `1px solid ${tTokens.inputBorderFocus}` },
                    },
                  }}
                />
                <TextField
                  type="time"
                  size="small"
                  variant="standard"
                  value={time12To24(task.start_time || '')}
                  onChange={(e) => {
                    const val = e.target.value ? time24To12(e.target.value) : '';
                    handleCellUpdate(task.id, 'start_time', val || null);
                  }}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      py: 0.25,
                      px: 0.25,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: tTokens.inputBgHover, color: 'text.primary' },
                      '&:focus': { bgcolor: tTokens.inputBgFocus, color: 'text.primary', outline: `1px solid ${tTokens.inputBorderFocus}` },
                    },
                  }}
                />
              </Box>
            </Tooltip>
          </TableCell>

          {/* 5. End Date & Time */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={task.due_date ? `Due: ${formatStandardDateTime(task.due_date, task.due_time, '18:00')}` : 'Set due date and time'}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  type="date"
                  size="small"
                  variant="standard"
                  value={task.due_date ? task.due_date.split('T')[0].split(' ')[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleCellUpdate(task.id, 'due_date', val || null);
                  }}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                      py: 0.25,
                      px: 0.5,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: tTokens.inputBgHover, color: 'text.primary' },
                      '&:focus': { bgcolor: tTokens.inputBgFocus, color: 'text.primary', outline: `1px solid ${tTokens.inputBorderFocus}` },
                    },
                  }}
                />
                <TextField
                  type="time"
                  size="small"
                  variant="standard"
                  value={time12To24(task.due_time || '')}
                  onChange={(e) => {
                    const val = e.target.value ? time24To12(e.target.value) : '';
                    handleCellUpdate(task.id, 'due_time', val || null);
                  }}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      py: 0.25,
                      px: 0.25,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: tTokens.inputBgHover, color: 'text.primary' },
                      '&:focus': { bgcolor: tTokens.inputBgFocus, color: 'text.primary', outline: `1px solid ${tTokens.inputBorderFocus}` },
                    },
                  }}
                />
              </Box>
            </Tooltip>
          </TableCell>

          {/* 6. Duration (Inline Numeric Edit) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                type="number"
                size="small"
                variant="standard"
                value={getTaskDurationDisplay(task)}
                disabled={task.is_parent}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  handleCellUpdate(task.id, 'duration_working_days', val);
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  width: 45,
                  '& .MuiInputBase-input': {
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                    py: 0.25,
                    px: 0.5,
                    textAlign: 'right',
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: tTokens.inputBgHover },
                    '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {task.is_parent ? 'CD' : 'WD'}
              </Typography>
              {!task.is_parent && Boolean(task.duration_working_hours) && (
                <Chip
                  label={`+${task.duration_working_hours}h`}
                  size="small"
                  sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#FEF3C7', color: '#92400E' }}
                />
              )}
            </Box>
          </TableCell>

          {/* 7. Status (Inline Status Selector) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <FormControl size="small" variant="standard">
              <Select
                value={task.status_id || 1}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  handleCellUpdate(task.id, 'status_id', val);
                }}
                disableUnderline
                renderValue={(stId) => {
                  const st = activeStatuses.find((s) => s.id === stId);
                  return (
                    <Chip
                      label={st?.name || task.status_name || 'To Do'}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: st?.color || task.status_color || '#64748B',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    />
                  );
                }}
                sx={{
                  '& .MuiSelect-select': { p: 0 },
                }}
              >
                {activeStatuses.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: st.color }} />
                      <Typography variant="body2">{st.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </TableCell>

          {/* 8. Completion Date & Time (Inline Edit) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={(task.completion_date || task.completed_at) ? `Completed: ${formatStandardDateTime(task.completion_date || task.completed_at, task.completion_time)}` : 'Set completion date and time'}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  type="date"
                  size="small"
                  variant="standard"
                  value={task.completion_date ? task.completion_date.split('T')[0].split(' ')[0] : (task.completed_at ? task.completed_at.split('T')[0] : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleCellUpdate(task.id, 'completion_date', val || null);
                  }}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                      py: 0.25,
                      px: 0.5,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: tTokens.inputBgHover, color: 'text.primary' },
                      '&:focus': { bgcolor: tTokens.inputBgFocus, color: 'text.primary', outline: `1px solid ${tTokens.inputBorderFocus}` },
                    },
                  }}
                />
                <TextField
                  type="time"
                  size="small"
                  variant="standard"
                  value={time12To24(task.completion_time || '')}
                  onChange={(e) => {
                    const val = e.target.value ? time24To12(e.target.value) : '';
                    handleCellUpdate(task.id, 'completion_time', val || null);
                  }}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    width: 70,
                    '& .MuiInputBase-input': {
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      py: 0.25,
                      px: 0.25,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: tTokens.inputBgHover, color: 'text.primary' },
                      '&:focus': { bgcolor: tTokens.inputBgFocus, color: 'text.primary', outline: `1px solid ${tTokens.inputBorderFocus}` },
                    },
                  }}
                />
              </Box>
            </Tooltip>
          </TableCell>

          {/* 9. Estimated Cost (Inline Numeric Input) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>₹</Typography>
              <TextField
                type="number"
                size="small"
                variant="standard"
                defaultValue={task.estimated_cost || 0}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== (task.estimated_cost || 0)) {
                    handleCellUpdate(task.id, 'estimated_cost', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  width: 80,
                  '& .MuiInputBase-input': {
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: tTokens.inputBgHover },
                    '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
                  },
                }}
              />
            </Box>
          </TableCell>

          {/* 10. Actual Cost (Inline Numeric Input) */}
          <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>₹</Typography>
              <TextField
                type="number"
                size="small"
                variant="standard"
                defaultValue={task.actual_cost || 0}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== (task.actual_cost || 0)) {
                    handleCellUpdate(task.id, 'actual_cost', val);
                  }
                }}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                InputProps={{ disableUnderline: true }}
                sx={{
                  width: 80,
                  '& .MuiInputBase-input': {
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: tTokens.inputBgHover },
                    '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
                  },
                }}
              />
            </Box>
          </TableCell>
        </TableRow>

        {/* List View Recursive Subtasks */}
        {hasChildren && isExpanded && subtaskList.map((subtask) => renderListTableRow(subtask, depth + 1))}

        {/* Inline Add Subtask Row under task when expanded */}
        {hasChildren && isExpanded && (
          <TableRow sx={{ bgcolor: tTokens.subtleBg }} onClick={(e) => e.stopPropagation()}>
            <TableCell sx={{ bgcolor: tTokens.subtleBg, p: 0 }} />
            <TableCell sx={{ bgcolor: tTokens.subtleBg, pl: (depth + 1) * 2.5 + 2, borderRight: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <TextField
                  size="small"
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
                  variant="standard"
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    maxWidth: 260,
                    '& .MuiInputBase-input': {
                      fontSize: '0.78rem',
                      fontStyle: 'italic',
                      py: 0.25,
                      px: 0.75,
                      borderRadius: '4px',
                      bgcolor: 'background.paper',
                      border: '1px dashed',
                      borderColor: tTokens.borderColor,
                    },
                  }}
                />
                {addingSubtaskId === task.id && newSubtaskTitle.trim() && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleCreateSubtask(task.id)}
                    sx={{
                      height: 24,
                      fontSize: '0.68rem',
                      bgcolor: tTokens.primaryBtn,
                      '&:hover': { bgcolor: tTokens.primaryBtnHover },
                      textTransform: 'none',
                      px: 1,
                    }}
                  >
                    Add
                  </Button>
                )}
              </Box>
            </TableCell>
            <TableCell colSpan={9} sx={{ bgcolor: tTokens.subtleBg }} />
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── CLICKUP STYLE TOOLBAR (Top Bar) ────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
        }}
      >
        {/* View Toggle Buttons (Board vs List) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{
              height: 32,
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12,
                px: 1.5,
                '&.Mui-selected': { bgcolor: 'primary.main', color: '#FFFFFF', fontWeight: 700 },
              },
            }}
          >
            <ToggleButton value="list">
              <ListIcon size={14} style={{ marginRight: 6 }} /> List
            </ToggleButton>
            <ToggleButton value="board">
              <LayoutGrid size={14} style={{ marginRight: 6 }} /> Board
            </ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small">
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'status' | 'milestone')}
              sx={{ height: 32, fontSize: 12, bgcolor: 'background.paper' }}
            >
              <MenuItem value="status">Group: Status</MenuItem>
              <MenuItem value="milestone">Group: Milestone</MenuItem>
            </Select>
          </FormControl>

          <Button
            size="small"
            variant="outlined"
            onClick={handleToggleExpandAll}
            sx={{ height: 32, fontSize: 12, textTransform: 'none', color: '#475569', borderColor: '#CBD5E1', fontWeight: 600 }}
          >
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        </Box>

        {/* Right Search & Add Task Action */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isRecalculating && (
            <Chip
              icon={<RefreshCw size={12} className="animate-spin" />}
              label="Recalculating..."
              size="small"
              sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600, fontSize: 11, border: '1px solid #FDE68A' }}
            />
          )}

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              displayEmpty
              sx={{ height: 32, fontSize: 12, bgcolor: 'background.paper' }}
            >
              <MenuItem value="ALL">All Priorities</MenuItem>
              <MenuItem value="URGENT">Urgent 🚩</MenuItem>
              <MenuItem value="HIGH">High 🚩</MenuItem>
              <MenuItem value="NORMAL">Normal 🚩</MenuItem>
              <MenuItem value="LOW">Low 🚩</MenuItem>
            </Select>
          </FormControl>

          <TextField
            placeholder="Search tasks..."
            size="small"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} color="#94A3B8" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220, '& .MuiOutlinedInput-root': { height: 32, fontSize: 12 } }}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={() => handleOpenCreateModal(1)}
            sx={{ bgcolor: tTokens.primaryBtn, '&:hover': { bgcolor: tTokens.primaryBtnHover }, height: 32, textTransform: 'none', fontSize: 13, fontWeight: 600 }}
          >
            Add Task
          </Button>
        </Box>
      </Box>

      {/* ── CLICKUP KANBAN BOARD VIEW ──────────────────────────────────── */}
      {viewMode === 'board' && (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            minHeight: '520px',
            alignItems: 'flex-start',
          }}
        >
          {activeStatuses.map((st) => {
            // Filter top-level tasks only (exclude standalone subtasks)
            const statusTasks = filteredTasks.filter((t) => !t.parent_task_id && (t.status_id || 1) === st.id);

            return (
              <Box
                key={st.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, st.id)}
                sx={{
                  width: 300,
                  minWidth: 300,
                  bgcolor: 'background.default',
                  borderRadius: '10px',
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 280px)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Column Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={st.name.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: st.color,
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        height: 22,
                        px: 0.5,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {statusTasks.length}
                    </Typography>
                  </Box>

                  <Tooltip title="Add Task in this status">
                    <IconButton size="small" onClick={() => handleOpenCreateModal(st.id)} sx={{ p: 0.5 }}>
                      <Plus size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Cards Container */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    overflowY: 'auto',
                    pr: 0.5,
                    flex: 1,
                  }}
                >
                  {statusTasks.length === 0 ? (
                    <Box
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: '8px',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                        No tasks in {st.name}
                      </Typography>
                    </Box>
                  ) : (
                    statusTasks.map((task) => {
                      const subtaskList = task.nested_subtasks || task.subtasks || [];
                      const subtaskCount = task.subtask_count ?? subtaskList.length;
                      const completedCount =
                        task.completed_subtask_count ?? subtaskList.filter((s) => s.is_completed).length;
                      const isExpanded = !!expandedTaskIds[task.id];

                      return (
                        <Paper
                          key={task.id}
                          elevation={0}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => openTask(task)}
                          sx={{
                            p: 2,
                            borderRadius: '8px',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'grab',
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            },
                          }}
                        >
                          {/* Task Title */}
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5, lineHeight: 1.4 }}>
                            {task.title}
                          </Typography>

                          {/* Footer Meta Row */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* Assignee Avatar */}
                              <Tooltip title={task.assignee_name || 'Unassigned'}>
                                <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: tTokens.primaryBtn, color: '#FFFFFF', fontWeight: 700 }}>
                                  {task.assignee_name?.charAt(0) || '?'}
                                </Avatar>
                              </Tooltip>

                              {/* Priority Flag */}
                              <Tooltip title={`Priority: ${task.priority}`}>
                                <Flag size={14} color={getPriorityFlagColor(task.priority)} fill={getPriorityFlagColor(task.priority)} />
                              </Tooltip>
                            </Box>

                            {/* Due Date or Tracked Hours */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {task.due_date && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: 'text.secondary' }}>
                                  <Calendar size={12} />
                                  <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 500 }}>
                                    {task.due_date}
                                  </Typography>
                                </Box>
                              )}
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, fontFamily: 'monospace' }}>
                                {task.actual_hours}h/{task.estimated_hours}h
                              </Typography>
                            </Box>
                          </Box>

                          {/* ClickUp-style Collapsible Subtask Row */}
                          {(subtaskCount > 0 || addingSubtaskId === task.id) && (
                            <Box
                              onClick={(e) => toggleSubtasksExpand(task.id, e)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mt: 1.25,
                                pt: 0.75,
                                pb: 0.75,
                                px: 1,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                bgcolor: isExpanded ? 'action.selected' : tTokens.subtleBg,
                                '&:hover': { bgcolor: 'action.selected' },
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {isExpanded ? (
                                  <ChevronDown size={15} color={isDark ? '#5FCF87' : '#203020'} />
                                ) : (
                                  <ChevronRight size={15} color={isDark ? '#5FCF87' : '#203020'} />
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: isDark ? '#5FCF87' : '#203020',
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
                                      bgcolor: tTokens.primaryBtn,
                                      '&:hover': { bgcolor: tTokens.primaryBtnHover },
                                    }}
                                  >
                                    Add
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </Paper>
                      );
                    })
                  )}
                </Box>

                {/* Inline Fast Task Creation ("Type & Enter") */}
                <Box sx={{ mt: 1.5 }}>
                  <TextField
                    placeholder="+ Add Task (Press Enter)"
                    size="small"
                    fullWidth
                    value={quickTaskInputs[st.id] || ''}
                    onChange={(e) => setQuickTaskInputs((prev) => ({ ...prev, [st.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleQuickCreateTask(st.id);
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 32,
                        fontSize: 12,
                        bgcolor: 'background.paper',
                      },
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── CLICKUP GROUPED LIST VIEW ───────────────────────────────────── */}
      {viewMode === 'list' && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
            <TableHead sx={{ bgcolor: tTokens.headerBg }}>
              <TableRow>
                <TableCell
                  width={44}
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    bgcolor: tTokens.headerBg,
                    whiteSpace: 'nowrap',
                  }}
                ></TableCell>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 44,
                    zIndex: 3,
                    bgcolor: tTokens.headerBg,
                    fontWeight: 600,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    minWidth: 360,
                    width: 360,
                  }}
                >
                  Name
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap', width: 170, minWidth: 170, maxWidth: 170 }}>Dependencies</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap', width: 170, minWidth: 170, maxWidth: 170 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Completion Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Estimated Cost</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>Actual Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                    <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>
                      No tasks found in this project yet.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Plus size={15} />}
                      onClick={() => handleOpenCreateModal(1)}
                      sx={{ textTransform: 'none', color: isDark ? '#5FCF87' : '#203020', borderColor: isDark ? '#5FCF87' : '#203020' }}
                    >
                      Create First Task
                    </Button>
                  </TableCell>
                </TableRow>
              ) : groupBy === 'status' ? (
                activeStatuses.map((status) => {
                  const statusTasks = filteredTasks.filter((t) => !t.parent_task_id && (t.status_id || 1) === status.id);
                  if (statusTasks.length === 0) return null;
                  const isExpanded = expandedGroups[status.id] !== false; // default true

                  return (
                    <React.Fragment key={`status-${status.id}`}>
                      {/* Group Header */}
                      <TableRow sx={{ bgcolor: tTokens.groupHeaderBg, '&:hover': { bgcolor: tTokens.groupHeaderHover }, cursor: 'pointer' }} onClick={() => toggleGroup(status.id)}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            bgcolor: 'inherit',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          colSpan={10}
                          sx={{
                            position: 'sticky',
                            left: 44,
                            zIndex: 2,
                            bgcolor: 'inherit',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={status.name} size="small" sx={{ bgcolor: status.color, color: 'white', fontWeight: 600, height: 20, fontSize: '0.7rem' }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{statusTasks.length} Tasks</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Tasks */}
                      {isExpanded && statusTasks.map((task) => renderListTableRow(task, 0))}
                    </React.Fragment>
                  );
                })
              ) : (
                [
                  ...milestones.map((m) => ({ id: m.id, name: m.title })),
                  { id: null, name: 'Unassigned Milestone' }
                ].map((milestone) => {
                  const mTasks = filteredTasks.filter((t) => !t.parent_task_id && (t.milestone_id || null) === milestone.id);
                  const mTaskLists = milestone.id
                    ? [...taskLists.filter((tl) => tl.milestone_id === milestone.id)].sort(
                        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
                      )
                    : [];
                  if (mTasks.length === 0 && mTaskLists.length === 0) return null;
                  const groupId = milestone.id || -1;
                  const isExpanded = expandedGroups[groupId] !== false; // default true
                  const directUngroupedTasks = [...mTasks.filter((t) => !t.task_list_id)].sort(
                    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
                  );

                  return (
                    <React.Fragment key={`milestone-${groupId}`}>
                      {/* Milestone Header Row */}
                      <TableRow
                        sx={{ bgcolor: tTokens.groupHeaderBg, '&:hover': { bgcolor: tTokens.groupHeaderHover }, cursor: 'pointer' }}
                        onClick={() => toggleGroup(groupId)}
                        onContextMenu={(e) => {
                          if (milestone.id) {
                            e.preventDefault();
                            e.stopPropagation();
                            setRowMenuAnchor({
                              mouseX: e.clientX + 2,
                              mouseY: e.clientY - 6,
                              type: 'MILESTONE',
                              item: milestone,
                            });
                          }
                        }}
                      >
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            bgcolor: 'inherit',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <IconButton size="small">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          colSpan={10}
                          sx={{
                            position: 'sticky',
                            left: 44,
                            zIndex: 2,
                            bgcolor: 'inherit',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                                🚩 {milestone.name}
                              </Typography>
                              <Chip
                                label={`${mTasks.length} Tasks`}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: tTokens.subtleBg, color: 'text.secondary' }}
                              />
                              {mTaskLists.length > 0 && (
                                <Chip
                                  label={`${mTaskLists.length} Task Lists`}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#EDE9FE', color: '#6D28D9' }}
                                />
                              )}
                            </Box>
                            {milestone.id && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<FolderPlus size={13} />}
                                  onClick={() => handleOpenCreateTaskList(milestone.id as number)}
                                  sx={{
                                    height: 24,
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    py: 0,
                                    px: 1,
                                    color: '#6D28D9',
                                    borderColor: '#DDD6FE',
                                    '&:hover': { borderColor: '#8B5CF6', bgcolor: '#F5F3FF' },
                                  }}
                                >
                                  Add Task List
                                </Button>
                                <Tooltip title="Delete Milestone">
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePromptDelete(milestone, 'MILESTONE')}
                                    sx={{ color: '#DC2626', p: 0.25, '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.08)' } }}
                                  >
                                    <Trash2 size={14} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <>
                          {/* 1. Task Lists under this Milestone */}
                          {mTaskLists.map((tl) => {
                            const tlTasks = mTasks.filter((t) => t.task_list_id === tl.id);
                            const isTlExpanded = expandedTaskLists[tl.id] !== false; // default true

                            return (
                              <React.Fragment key={`tasklist-${tl.id}`}>
                                {/* Task List Header Row */}
                                <TableRow
                                  onDragOver={(e) => handleTaskListDragOver(e, tl)}
                                  onDrop={(e) => handleTaskListDrop(e, tl)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setRowMenuAnchor({
                                      mouseX: e.clientX + 2,
                                      mouseY: e.clientY - 6,
                                      type: 'TASK_LIST',
                                      item: tl,
                                    });
                                  }}
                                  sx={{
                                    bgcolor: tTokens.taskListBg,
                                    '&:hover': { bgcolor: tTokens.taskListHover },
                                    borderTop: dragOverTargetId === tl.id && dragOverPosition === 'top' ? '2px solid #6D28D9' : '1px solid',
                                    borderBottom: dragOverTargetId === tl.id && dragOverPosition === 'bottom' ? '2px solid #6D28D9' : '1px solid',
                                    borderColor: dragOverTargetId === tl.id ? '#6D28D9' : tTokens.borderColor,
                                  }}
                                >
                                  {/* Expand / Collapse Chevron & Drag Handle */}
                                  <TableCell
                                    sx={{
                                      position: 'sticky',
                                      left: 0,
                                      zIndex: 2,
                                      bgcolor: 'inherit',
                                      whiteSpace: 'nowrap',
                                      p: 0,
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                                      <Box
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          e.dataTransfer.effectAllowed = 'move';
                                          e.dataTransfer.setData('text/plain', `TASK_LIST:${tl.id}`);
                                          setDragItem({
                                            type: 'TASK_LIST',
                                            id: tl.id,
                                            milestoneId: tl.milestone_id,
                                          });
                                        }}
                                        onDragEnd={() => {
                                          setDragItem(null);
                                          setDragOverTargetId(null);
                                          setDragOverPosition(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'grab',
                                          color: 'text.secondary',
                                          opacity: 0.45,
                                          p: 0.25,
                                          borderRadius: '3px',
                                          '&:hover': { opacity: 1, color: '#6D28D9', bgcolor: 'rgba(109, 40, 217, 0.08)' },
                                        }}
                                        title="Drag to reorder task list"
                                      >
                                        <GripVertical size={14} />
                                      </Box>
                                      <IconButton size="small" onClick={(e) => toggleTaskList(tl.id, e)} sx={{ p: 0.25 }}>
                                        {isTlExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                      </IconButton>
                                    </Box>
                                  </TableCell>

                                  {/* Task List Name (Only editable field) */}
                                  <TableCell
                                    sx={{
                                      position: 'sticky',
                                      left: 44,
                                      zIndex: 2,
                                      bgcolor: 'inherit',
                                      whiteSpace: 'nowrap',
                                      borderRight: '1px solid',
                                      borderColor: 'divider',
                                      pl: 2,
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                        <Folder size={15} color="#6D28D9" style={{ flexShrink: 0 }} />
                                        <TextField
                                          size="small"
                                          variant="standard"
                                          defaultValue={tl.name}
                                          key={`${tl.id}-${tl.name}`}
                                          onClick={(e) => e.stopPropagation()}
                                          onBlur={async (e) => {
                                            const val = e.target.value.trim();
                                            if (val && val !== tl.name) {
                                              try {
                                                await updateTaskList({ id: tl.id, name: val }).unwrap();
                                                toast.showSuccess('Task list updated');
                                              } catch (err: any) {
                                                toast.showError(err?.data?.detail || 'Failed to update task list');
                                              }
                                            }
                                          }}
                                          onKeyDown={(e: any) => {
                                            if (e.key === 'Enter') e.target.blur();
                                          }}
                                          InputProps={{ disableUnderline: true }}
                                          sx={{
                                            flex: 1,
                                            '& .MuiInputBase-input': {
                                              fontWeight: 700,
                                              fontSize: '0.84rem',
                                              color: 'text.primary',
                                              py: 0.25,
                                              px: 0.5,
                                              borderRadius: '4px',
                                              transition: 'all 0.15s ease',
                                              '&:hover': { bgcolor: tTokens.inputBgHover },
                                              '&:focus': { bgcolor: tTokens.inputBgFocus, outline: `1px solid ${tTokens.inputBorderFocus}` },
                                            },
                                          }}
                                        />
                                        <Chip
                                          label={`${tlTasks.length} tasks`}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: tTokens.subtleBg, color: 'text.secondary', flexShrink: 0 }}
                                        />
                                      </Box>

                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
                                        <Tooltip title="Add Task to this Task List">
                                          <IconButton size="small" onClick={() => handleOpenCreateModal(1, milestone.id as number, tl.id)}>
                                            <Plus size={14} color={isDark ? '#5FCF87' : '#203020'} />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Rename Task List">
                                          <IconButton size="small" onClick={() => handleOpenEditTaskList(tl)}>
                                            <Edit2 size={13} color="#64748B" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Task List">
                                          <IconButton size="small" onClick={() => handlePromptDelete(tl, 'TASK_LIST')}>
                                            <Trash2 size={13} color="#DC2626" />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    </Box>
                                  </TableCell>

                                  {/* Dependencies: No dependencies allowed for Task List */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.8rem', width: 170, minWidth: 170, maxWidth: 170 }}>
                                    —
                                  </TableCell>

                                  {/* Assigned To: No assigned to allowed for Task List */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.8rem', width: 170, minWidth: 170, maxWidth: 170 }}>
                                    —
                                  </TableCell>

                                  {/* Start Date: Automatically Calculated (MIN) - Read-only */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap' }}>
                                    <Tooltip title="Calculated: Earliest Start Date & Time among direct child tasks">
                                      <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: tl.start_date ? 'text.primary' : 'text.disabled' }}>
                                        {tl.start_date ? formatStandardDateTime(tl.start_date, tl.start_time, '09:00') : '—'}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>

                                  {/* Due Date (End): Automatically Calculated (MAX) - Read-only */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap' }}>
                                    <Tooltip title="Calculated: Latest End Date & Time among direct child tasks">
                                      <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: tl.end_date ? 'text.primary' : 'text.disabled' }}>
                                        {tl.end_date ? formatStandardDateTime(tl.end_date, tl.end_time, '18:00') : '—'}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>

                                  {/* Duration: Automatically Calculated (End - Start) - Read-only */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap' }}>
                                    <Tooltip title={tl.duration_working_days != null ? "Calculated: Working duration between earliest start and latest end" : "Blank until tasks exist"}>
                                      {tl.duration_working_days != null ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
                                            {tl.duration_working_days} WD
                                          </Typography>
                                          {Boolean(tl.duration_working_hours) && (
                                            <Chip
                                              label={`+${tl.duration_working_hours}h`}
                                              size="small"
                                              sx={{ height: 16, fontSize: '0.62rem', fontWeight: 600, bgcolor: '#FEF3C7', color: '#92400E' }}
                                            />
                                          )}
                                        </Box>
                                      ) : (
                                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'text.disabled' }}>
                                          —
                                        </Typography>
                                      )}
                                    </Tooltip>
                                  </TableCell>

                                  {/* Status: No status for Task List */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.8rem' }}>
                                    —
                                  </TableCell>

                                  {/* Completion Date: None for Task List */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.8rem' }}>
                                    —
                                  </TableCell>

                                  {/* Estimated Cost: No separate cost for Task List */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.8rem' }}>
                                    —
                                  </TableCell>

                                  {/* Actual Cost: No separate cost for Task List */}
                                  <TableCell sx={{ bgcolor: 'inherit', whiteSpace: 'nowrap', color: 'text.disabled', fontSize: '0.8rem' }}>
                                    —
                                  </TableCell>
                                </TableRow>

                                {/* Child Tasks inside this Task List */}
                                {isTlExpanded && (
                                  <>
                                    {tlTasks.length === 0 ? (
                                      <TableRow sx={{ bgcolor: tTokens.subtleBg }}>
                                        <TableCell sx={{ bgcolor: tTokens.subtleBg }} />
                                        <TableCell colSpan={10} sx={{ py: 1.25, pl: 4, bgcolor: tTokens.subtleBg, borderRight: '1px solid', borderColor: 'divider' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                              No tasks in this task list.
                                            </Typography>
                                            <Button
                                              size="small"
                                              startIcon={<Plus size={14} />}
                                              onClick={() => handleOpenCreateModal(1, milestone.id as number, tl.id)}
                                              sx={{
                                                textTransform: 'none',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: isDark ? '#5FCF87' : '#203020',
                                                '&:hover': { bgcolor: isDark ? 'rgba(95, 207, 135, 0.1)' : 'rgba(32, 48, 32, 0.05)' },
                                              }}
                                            >
                                              ＋ Add Task
                                            </Button>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      <>
                                        {tlTasks.map((task) => renderListTableRow(task, 0))}
                                        <TableRow sx={{ bgcolor: tTokens.subtleBg }}>
                                          <TableCell sx={{ bgcolor: tTokens.subtleBg }} />
                                          <TableCell colSpan={10} sx={{ py: 0.75, pl: 4, bgcolor: tTokens.subtleBg, borderRight: '1px solid', borderColor: 'divider' }}>
                                            <Button
                                              size="small"
                                              startIcon={<Plus size={14} />}
                                              onClick={() => handleOpenCreateModal(1, milestone.id as number, tl.id)}
                                              sx={{
                                                textTransform: 'none',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                color: isDark ? '#5FCF87' : '#203020',
                                                '&:hover': { bgcolor: isDark ? 'rgba(95, 207, 135, 0.1)' : 'rgba(32, 48, 32, 0.05)' },
                                              }}
                                            >
                                              ＋ Add Task
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      </>
                                    )}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}

                          {/* 2. Tasks under milestone not in any Task List */}
                          {directUngroupedTasks.length > 0 && mTaskLists.length > 0 && (
                            <TableRow sx={{ bgcolor: tTokens.subtleBg }}>
                              <TableCell sx={{ bgcolor: tTokens.subtleBg }} />
                              <TableCell colSpan={10} sx={{ py: 0.75, pl: 2, bgcolor: tTokens.subtleBg, borderRight: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                                  Other Tasks (Ungrouped)
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {directUngroupedTasks.map((task) => renderListTableRow(task, 0))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Task Creation Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Create New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Task Title"
            size="small"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Description"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="create-task-status-label">Status</InputLabel>
            <Select
              labelId="create-task-status-label"
              value={statusId}
              onChange={(e) => setStatusId(Number(e.target.value))}
              input={<OutlinedInput label="Status" />}
            >
              {activeStatuses.map((st) => (
                <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {isTaskListLocked ? (
            <Box
              sx={{
                p: 1.25,
                borderRadius: '6px',
                bgcolor: isDark ? 'rgba(109, 40, 217, 0.12)' : '#F5F3FF',
                border: '1px solid',
                borderColor: isDark ? 'rgba(109, 40, 217, 0.3)' : '#DDD6FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Folder size={16} color="#6D28D9" />
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>
                    CREATING UNDER TASK LIST
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#DDD6FE' : '#5B21B6', fontSize: '0.85rem' }}>
                    {taskLists.find((tl) => tl.id === Number(taskListId))?.name || `Task List #${taskListId}`}
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={milestones.find((m) => m.id === Number(milestoneId))?.title || 'Milestone'}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: isDark ? 'rgba(95, 207, 135, 0.15)' : '#E8F5E9', color: isDark ? '#5FCF87' : '#203020' }}
              />
            </Box>
          ) : (
            <>
              <FormControl size="small" fullWidth>
                <InputLabel id="create-task-milestone-label">Milestone (Optional)</InputLabel>
                <Select
                  labelId="create-task-milestone-label"
                  value={milestoneId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setMilestoneId(val);
                    setTaskListId('');
                  }}
                  input={<OutlinedInput label="Milestone (Optional)" />}
                >
                  <MenuItem value=""><em>No Milestone (Unassigned)</em></MenuItem>
                  {milestones.map((m) => (
                    <MenuItem key={m.id} value={m.id}>🚩 {m.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {Boolean(milestoneId) && (
                <FormControl size="small" fullWidth>
                  <InputLabel id="create-task-tasklist-label">Task List (Optional)</InputLabel>
                  <Select
                    labelId="create-task-tasklist-label"
                    value={taskListId}
                    onChange={(e) => setTaskListId(e.target.value ? Number(e.target.value) : '')}
                    input={<OutlinedInput label="Task List (Optional)" />}
                  >
                    <MenuItem value=""><em>No Task List (Directly under Milestone)</em></MenuItem>
                    {taskLists
                      .filter((tl) => tl.milestone_id === Number(milestoneId))
                      .map((tl) => (
                        <MenuItem key={tl.id} value={tl.id}>📁 {tl.name}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            </>
          )}
          <FormControl size="small" fullWidth>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              renderValue={(val) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Flag size={14} color={getPriorityFlagColor(val)} fill={getPriorityFlagColor(val)} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: getPriorityFlagColor(val) }}>
                    {val} Priority
                  </Typography>
                </Box>
              )}
            >
              <MenuItem value="URGENT">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#DC2626', fontWeight: 600 }}>
                  <Flag size={14} color="#DC2626" fill="#DC2626" /> Urgent
                </Box>
              </MenuItem>
              <MenuItem value="HIGH">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#EA580C', fontWeight: 600 }}>
                  <Flag size={14} color="#EA580C" fill="#EA580C" /> High
                </Box>
              </MenuItem>
              <MenuItem value="NORMAL">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#2563EB', fontWeight: 600 }}>
                  <Flag size={14} color="#2563EB" fill="#2563EB" /> Normal
                </Box>
              </MenuItem>
              <MenuItem value="LOW">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', fontWeight: 600 }}>
                  <Flag size={14} color="#64748B" fill="#64748B" /> Low
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="create-task-assignees-label">Task Assignees (Multiple)</InputLabel>
            <Select
              labelId="create-task-assignees-label"
              multiple
              value={assigneeIds}
              onChange={(e) => {
                const val = e.target.value;
                setAssigneeIds(typeof val === 'string' ? val.split(',').map(Number) : val);
              }}
              input={<OutlinedInput label="Task Assignees (Multiple)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => {
                    const u = users.find((usr) => usr.id === id);
                    return <Chip key={id} label={u?.full_name || `User #${id}`} size="small" />;
                  })}
                </Box>
              )}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox checked={assigneeIds.includes(u.id)} />
                  <ListItemText primary={u.full_name} secondary={u.role_name || u.email || 'User'} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="Start Time"
              type="time"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={time12To24(startTime)}
              onChange={(e) => setStartTime(e.target.value ? time24To12(e.target.value) : '')}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Due Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <TextField
              label="Due Time"
              type="time"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={time12To24(dueTime)}
              onChange={(e) => setDueTime(e.target.value ? time24To12(e.target.value) : '')}
            />
          </Box>
          <TextField
            label="Estimated Hours"
            type="number"
            size="small"
            fullWidth
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTask} sx={{ bgcolor: tTokens.primaryBtn, '&:hover': { bgcolor: tTokens.primaryBtnHover } }}>
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Task List Modal */}
      <Dialog open={createTaskListOpen} onClose={() => setCreateTaskListOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Create New Task List</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Group related tasks under this milestone. Start, End, and Duration will be calculated automatically from its child tasks.
          </Typography>
          <TextField
            label="Task List Name"
            size="small"
            fullWidth
            required
            autoFocus
            value={newTaskListName}
            onChange={(e) => setNewTaskListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateTaskListSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateTaskListOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateTaskListSubmit}
            disabled={!newTaskListName.trim()}
            sx={{ bgcolor: tTokens.primaryBtn, '&:hover': { bgcolor: tTokens.primaryBtnHover } }}
          >
            Create Task List
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task List Modal */}
      <Dialog open={editTaskListOpen} onClose={() => setEditTaskListOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Edit Task List Name</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Task List Name"
            size="small"
            fullWidth
            required
            autoFocus
            value={editingTaskListName}
            onChange={(e) => setEditingTaskListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUpdateTaskListSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditTaskListOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateTaskListSubmit}
            disabled={!editingTaskListName.trim()}
            sx={{ bgcolor: tTokens.primaryBtn, '&:hover': { bgcolor: tTokens.primaryBtnHover } }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Slide-over Panel */}
      <TaskDetailPanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedDep(null);
        }}
        task={selectedTask}
        initialEditingDep={selectedDep}
      />

      {/* Dependency Creation / Edit Dedicated Window */}
      <DependencyModal
        open={depModalOpen}
        onClose={() => {
          setDepModalOpen(false);
          setDepModalTask(null);
          setDepModalDependency(null);
        }}
        task={depModalTask}
        dependency={depModalDependency}
        projectTasks={safeTasks}
      />

      {/* Row Actions Menu (Requirement 9) */}
      <Menu
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        anchorEl={rowMenuAnchor?.anchorEl}
        anchorReference={rowMenuAnchor?.anchorEl ? 'anchorEl' : 'anchorPosition'}
        anchorPosition={
          rowMenuAnchor?.mouseX != null && rowMenuAnchor?.mouseY != null
            ? { top: rowMenuAnchor.mouseY, left: rowMenuAnchor.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            minWidth: 190,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {rowMenuAnchor?.type === 'TASK' && [
          <MenuItem
            key="add-subtask"
            onClick={() => {
              const item = rowMenuAnchor.item;
              setRowMenuAnchor(null);
              handleAddSubtaskFromMenu(item);
            }}
            sx={{ gap: 1.5, py: 1, fontSize: '0.85rem' }}
          >
            <CornerDownRight size={16} color={isDark ? '#5FCF87' : '#203020'} />
            <ListItemText primary="Add Sub-task" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }} />
          </MenuItem>,
          <MenuItem
            key="task-above"
            onClick={() => {
              const item = rowMenuAnchor.item;
              setRowMenuAnchor(null);
              handleCreateTaskAbove(item);
            }}
            sx={{ gap: 1.5, py: 1, fontSize: '0.85rem' }}
          >
            <ArrowUpToLine size={16} />
            <ListItemText
              primary={rowMenuAnchor.item?.parent_task_id ? "Create Sub-task Above" : "Create Task Above"}
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
            />
          </MenuItem>,
          <MenuItem
            key="task-below"
            onClick={() => {
              const item = rowMenuAnchor.item;
              setRowMenuAnchor(null);
              handleCreateTaskBelow(item);
            }}
            sx={{ gap: 1.5, py: 1, fontSize: '0.85rem' }}
          >
            <ArrowDownToLine size={16} />
            <ListItemText
              primary={rowMenuAnchor.item?.parent_task_id ? "Create Sub-task Below" : "Create Task Below"}
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
            />
          </MenuItem>,
          <Divider key="div-delete" sx={{ my: 0.5 }} />,
          <MenuItem
            key="delete-task"
            onClick={() => {
              const item = rowMenuAnchor.item;
              setRowMenuAnchor(null);
              handlePromptDelete(item, 'TASK');
            }}
            sx={{ gap: 1.5, py: 1, fontSize: '0.85rem', color: 'error.main' }}
          >
            <Trash2 size={16} color="#ef4444" />
            <ListItemText
              primary="Delete"
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: 'error.main' }}
            />
          </MenuItem>,
        ]}

        {rowMenuAnchor?.type === 'TASK_LIST' && (
          <MenuItem
            onClick={() => {
              const item = rowMenuAnchor.item;
              setRowMenuAnchor(null);
              handlePromptDelete(item, 'TASK_LIST');
            }}
            sx={{ gap: 1.5, py: 1, fontSize: '0.85rem', color: 'error.main' }}
          >
            <Trash2 size={16} color="#ef4444" />
            <ListItemText
              primary="Delete Task List"
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: 'error.main' }}
            />
          </MenuItem>
        )}

        {rowMenuAnchor?.type === 'MILESTONE' && (
          <MenuItem
            onClick={() => {
              const item = rowMenuAnchor.item;
              setRowMenuAnchor(null);
              handlePromptDelete(item, 'MILESTONE');
            }}
            sx={{ gap: 1.5, py: 1, fontSize: '0.85rem', color: 'error.main' }}
          >
            <Trash2 size={16} color="#ef4444" />
            <ListItemText
              primary="Delete Milestone"
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: 'error.main' }}
            />
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog (Requirement 9) */}
      <Dialog
        open={deleteDialogState.open}
        onClose={() => setDeleteDialogState((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="#ef4444" />
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.primary', fontWeight: 600 }}>
            {deleteDialogState.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {deleteDialogState.descriptionText}
          </Typography>
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, fontWeight: 500 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            size="small"
            onClick={() => setDeleteDialogState((prev) => ({ ...prev, open: false }))}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
