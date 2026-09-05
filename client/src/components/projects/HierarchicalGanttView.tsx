import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Avatar,
  Tooltip,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Search,
  Maximize2,
  Plus,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { TaskItem, useUpdateTaskMutation, useAddSubtaskMutation, useRescheduleDependenciesMutation } from '@/api/projectsApi';
import { useToast } from '@/components/ui/ToastHost';

type TimeScale = 'DAY' | 'WEEK' | 'MONTH';

interface TreeNode extends TaskItem {
  depth: number;
  hasChildren: boolean;
  children: TreeNode[];
  computedStartDate?: string;
  computedDueDate?: string;
}

interface HierarchicalGanttViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
  isLoading?: boolean;
}

export default function HierarchicalGanttView({
  tasks,
  onOpenTaskDetail,
  isLoading = false,
}: HierarchicalGanttViewProps) {
  const { showToast } = useToast();
  const [updateTask] = useUpdateTaskMutation();
  const [addSubtask] = useAddSubtaskMutation();
  const [rescheduleDependenciesApi] = useRescheduleDependenciesMutation();

  // Gantt State
  const [scale, setScale] = useState<TimeScale>('WEEK');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<number, boolean>>({});
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(360);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [autoRescheduleDependencies, setAutoRescheduleDependencies] = useState<boolean>(false);

  // Quick inline add subtask state
  const [inlineSubtaskParentId, setInlineSubtaskParentId] = useState<number | null>(null);
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState('');

  // Dragging / Resizing State
  const [draggingState, setDraggingState] = useState<{
    taskId: number;
    mode: 'MOVE' | 'RESIZE_LEFT' | 'RESIZE_RIGHT';
    initialMouseX: number;
    initialStartDate: Date;
    initialDueDate: Date;
    currentStartDate: Date;
    currentDueDate: Date;
  } | null>(null);

  // Date Range State
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  // Scroll Sync Refs
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  // Auto-expand all top level tasks initially when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const initialMap: Record<number, boolean> = {};
      tasks.forEach((t) => {
        initialMap[t.id] = true;
      });
      setExpandedTaskIds((prev) => ({ ...initialMap, ...prev }));
    }
  }, [tasks]);

  // Synchronized Vertical Scrolling
  const handleLeftScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
    }
    isSyncingScroll.current = false;
  };

  const handleRightScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (leftPaneRef.current && rightPaneRef.current) {
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
    }
    isSyncingScroll.current = false;
  };

  // Build Recursive Tree Data
  const treeData = useMemo(() => {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // Initialize nodes
    tasks.forEach((t) => {
      map.set(t.id, {
        ...t,
        depth: 0,
        hasChildren: false,
        children: [],
      });
    });

    // Populate hierarchy
    tasks.forEach((t) => {
      const node = map.get(t.id)!;
      if (t.parent_task_id && map.has(t.parent_task_id)) {
        const parent = map.get(t.parent_task_id)!;
        parent.hasChildren = true;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Compute recursively depth & parent fallback date bounds
    const computeDepthAndBounds = (node: TreeNode, depth: number): { minStart?: string; maxDue?: string } => {
      node.depth = depth;
      let minStart = node.start_date;
      let maxDue = node.due_date;

      if (node.children.length > 0) {
        node.hasChildren = true;
        node.children.forEach((child) => {
          const childBounds = computeDepthAndBounds(child, depth + 1);
          if (childBounds.minStart) {
            if (!minStart || childBounds.minStart < minStart) minStart = childBounds.minStart;
          }
          if (childBounds.maxDue) {
            if (!maxDue || childBounds.maxDue > maxDue) maxDue = childBounds.maxDue;
          }
        });
      }
      node.computedStartDate = minStart;
      node.computedDueDate = maxDue;
      return { minStart, maxDue };
    };

    roots.forEach((r) => computeDepthAndBounds(r, 0));
    return roots;
  }, [tasks]);

  // Filter & Flatten Tree based on search & expanded state
  const visibleNodes = useMemo(() => {
    const result: TreeNode[] = [];

    const matchesSearch = (node: TreeNode): boolean => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchSelf =
        (node.title && node.title.toLowerCase().includes(q)) ||
        (node.task_number && node.task_number.toLowerCase().includes(q)) ||
        (node.assignee_name && node.assignee_name.toLowerCase().includes(q)) ||
        (node.tags && node.tags.toLowerCase().includes(q));
      if (matchSelf) return true;
      return node.children.some((c) => matchesSearch(c));
    };

    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        const priorityMatch = priorityFilter === 'ALL' || node.priority === priorityFilter;

        if (matchesSearch(node) && priorityMatch) {
          result.push(node);
          if (node.hasChildren && (expandedTaskIds[node.id] || searchQuery.trim())) {
            traverse(node.children);
          }
        }
      });
    };

    traverse(treeData);
    return result;
  }, [treeData, expandedTaskIds, searchQuery, priorityFilter]);

  // Determine Timeline Date Window Bounds
  const { timelineStart, totalColumns, columnWidthPx } = useMemo(() => {
    let minD = new Date(baseDate);
    let maxD = new Date(baseDate);

    let validTaskDates = false;
    tasks.forEach((t) => {
      const s = t.start_date ? new Date(t.start_date) : null;
      const d = t.due_date ? new Date(t.due_date) : null;
      if (s && !isNaN(s.getTime())) {
        if (!validTaskDates || s < minD) minD = s;
        validTaskDates = true;
      }
      if (d && !isNaN(d.getTime())) {
        if (!validTaskDates || d > maxD) maxD = d;
        validTaskDates = true;
      }
    });

    if (!validTaskDates) {
      minD = new Date(baseDate);
      minD.setDate(minD.getDate() - 7);
      maxD = new Date(baseDate);
      maxD.setDate(maxD.getDate() + 21);
    } else {
      minD = new Date(minD);
      minD.setDate(minD.getDate() - 5);
      maxD = new Date(maxD);
      maxD.setDate(maxD.getDate() + 14);
    }

    let colWidth = 44;
    let totalCols = 30;

    if (scale === 'DAY') {
      colWidth = 48;
      const diffDays = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24));
      totalCols = Math.max(30, diffDays);
    } else if (scale === 'WEEK') {
      colWidth = 140;
      const diffWeeks = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24 * 7));
      totalCols = Math.max(12, diffWeeks);
    } else if (scale === 'MONTH') {
      colWidth = 180;
      const diffMonths = (maxD.getFullYear() - minD.getFullYear()) * 12 + (maxD.getMonth() - minD.getMonth()) + 1;
      totalCols = Math.max(12, diffMonths);
    }

    return {
      timelineStart: minD,
      timelineEnd: maxD,
      totalColumns: totalCols,
      columnWidthPx: colWidth,
    };
  }, [tasks, baseDate, scale]);

  // Generate Date Headers array
  const dateHeaders = useMemo(() => {
    const headers: Array<{ label: string; subLabel: string; date: Date }> = [];
    const curr = new Date(timelineStart);

    for (let i = 0; i < totalColumns; i++) {
      if (scale === 'DAY') {
        const d = new Date(curr);
        d.setDate(d.getDate() + i);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const numStr = d.getDate().toString();
        headers.push({ label: `${dayStr} ${numStr}`, subLabel: d.toLocaleDateString('en-US', { month: 'short' }), date: d });
      } else if (scale === 'WEEK') {
        const d = new Date(curr);
        d.setDate(d.getDate() + i * 7);
        const endW = new Date(d);
        endW.setDate(endW.getDate() + 6);
        headers.push({
          label: `W${getWeekNumber(d)} (${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })})`,
          subLabel: `${d.toLocaleDateString('en-US', { month: 'short' })} - ${endW.toLocaleDateString('en-US', { month: 'short' })}`,
          date: d,
        });
      } else if (scale === 'MONTH') {
        const d = new Date(curr.getFullYear(), curr.getMonth() + i, 1);
        headers.push({
          label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          subLabel: `${d.getFullYear()}`,
          date: d,
        });
      }
    }
    return headers;
  }, [timelineStart, totalColumns, scale]);

  // Auto-fit calculate schedule bounds
  const handleAutoFit = () => {
    let minD: Date | null = null;
    let maxD: Date | null = null;
    tasks.forEach((t) => {
      if (t.start_date) {
        const d = new Date(t.start_date);
        if (!minD || d < minD) minD = d;
      }
      if (t.due_date) {
        const d = new Date(t.due_date);
        if (!maxD || d > maxD) maxD = d;
      }
    });

    if (minD) {
      setBaseDate(new Date(minD));
      showToast('Fitted schedule to project date bounds 🎯', 'info');
    }
  };

  // Helper for week number calculation
  function getWeekNumber(d: Date) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  // Toggle expand node
  const toggleNodeExpand = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Quick Add Subtask Handler
  const handleCreateSubtaskInline = async (parentId: number) => {
    if (!inlineSubtaskTitle.trim()) return;
    try {
      await addSubtask({ taskId: parentId, title: inlineSubtaskTitle.trim() }).unwrap();
      setInlineSubtaskTitle('');
      setInlineSubtaskParentId(null);
      showToast('Subtask created under parent', 'success');
    } catch {
      showToast('Failed to create subtask', 'error');
    }
  };

  // Calculate Bar Position & Width (in pixels)
  const getBarPixelCoords = (node: TreeNode) => {
    const sStr = node.start_date || node.computedStartDate;
    const dStr = node.due_date || node.computedDueDate;

    if (!sStr && !dStr) return null;

    const sDate = sStr ? new Date(sStr) : new Date(dStr!);
    const dDate = dStr ? new Date(dStr) : new Date(sStr!);

    const msPerDay = 1000 * 3600 * 24;

    let leftPx = 0;
    let widthPx = 0;

    if (scale === 'DAY') {
      const offsetDays = (sDate.getTime() - timelineStart.getTime()) / msPerDay;
      const durationDays = Math.max(1, (dDate.getTime() - sDate.getTime()) / msPerDay + 1);
      leftPx = offsetDays * columnWidthPx;
      widthPx = durationDays * columnWidthPx;
    } else if (scale === 'WEEK') {
      const offsetWeeks = (sDate.getTime() - timelineStart.getTime()) / (msPerDay * 7);
      const durationWeeks = Math.max(0.2, (dDate.getTime() - sDate.getTime()) / (msPerDay * 7));
      leftPx = offsetWeeks * columnWidthPx;
      widthPx = Math.max(28, durationWeeks * columnWidthPx);
    } else if (scale === 'MONTH') {
      const offsetMonths = (sDate.getFullYear() - timelineStart.getFullYear()) * 12 + (sDate.getMonth() - timelineStart.getMonth()) + sDate.getDate() / 30;
      const durationMonths = Math.max(0.2, (dDate.getTime() - sDate.getTime()) / (msPerDay * 30));
      leftPx = offsetMonths * columnWidthPx;
      widthPx = Math.max(28, durationMonths * columnWidthPx);
    }

    return { leftPx, widthPx, sDate, dDate };
  };

  // Drag & Resize Mouse Handlers
  const handleMouseDownBar = (node: TreeNode, mode: 'MOVE' | 'RESIZE_LEFT' | 'RESIZE_RIGHT', e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = getBarPixelCoords(node);
    if (!coords) return;

    setDraggingState({
      taskId: node.id,
      mode,
      initialMouseX: e.clientX,
      initialStartDate: coords.sDate,
      initialDueDate: coords.dDate,
      currentStartDate: coords.sDate,
      currentDueDate: coords.dDate,
    });
  };

  // Window MouseMove / MouseUp Effects for Dragging Bar
  useEffect(() => {
    if (!draggingState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingState.initialMouseX;
      let daysOffset = 0;
      if (scale === 'DAY') {
        daysOffset = Math.round(deltaX / columnWidthPx);
      } else if (scale === 'WEEK') {
        daysOffset = Math.round((deltaX / columnWidthPx) * 7);
      } else if (scale === 'MONTH') {
        daysOffset = Math.round((deltaX / columnWidthPx) * 30);
      }

      const newStart = new Date(draggingState.initialStartDate.getTime());
      const newDue = new Date(draggingState.initialDueDate.getTime());

      if (draggingState.mode === 'MOVE') {
        newStart.setDate(newStart.getDate() + daysOffset);
        newDue.setDate(newDue.getDate() + daysOffset);
      } else if (draggingState.mode === 'RESIZE_LEFT') {
        newStart.setDate(newStart.getDate() + daysOffset);
        if (newStart > newDue) newStart.setTime(newDue.getTime());
      } else if (draggingState.mode === 'RESIZE_RIGHT') {
        newDue.setDate(newDue.getDate() + daysOffset);
        if (newDue < newStart) newDue.setTime(newStart.getTime());
      }

      setDraggingState((prev) => (prev ? { ...prev, currentStartDate: newStart, currentDueDate: newDue } : null));
    };

    const handleMouseUp = async () => {
      if (!draggingState) return;

      const sStr = draggingState.currentStartDate.toISOString().split('T')[0];
      const dStr = draggingState.currentDueDate.toISOString().split('T')[0];
      const targetId = draggingState.taskId;

      const diffMs = draggingState.currentDueDate.getTime() - draggingState.initialDueDate.getTime();
      const daysShift = Math.round(diffMs / (1000 * 3600 * 24));

      setDraggingState(null);

      try {
        await updateTask({
          id: targetId,
          body: { start_date: sStr as any, due_date: dStr as any },
        }).unwrap();
        showToast('Schedule updated & saved ✓', 'success');

        if (autoRescheduleDependencies && daysShift !== 0) {
          await rescheduleDependenciesApi({ taskId: targetId, days_shift: daysShift }).unwrap();
          showToast(`Auto-shifted downstream dependent tasks by ${daysShift} day(s)`, 'info');
        }
      } catch {
        showToast('Failed to save updated schedule dates', 'error');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingState, scale, columnWidthPx]);

  // Draggable Left Column Resizer
  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  };

  useEffect(() => {
    if (!isResizingLeft) return;
    const handleResizeMove = (e: MouseEvent) => {
      setLeftPanelWidth(Math.max(260, Math.min(600, e.clientX - 40)));
    };
    const handleResizeUp = () => setIsResizingLeft(false);

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };
  }, [isResizingLeft]);

  // Compute SVG Dependency Arrow Lines
  const dependencyLines = useMemo(() => {
    const lines: Array<{
      id: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      blockerTitle: string;
      blockedTitle: string;
    }> = [];

    visibleNodes.forEach((node, nodeIdx) => {
      if (node.dependencies && node.dependencies.length > 0) {
        node.dependencies.forEach((dep) => {
          if (dep.direction === 'BLOCKING') {
            const targetNodeIdx = visibleNodes.findIndex((n) => n.id === dep.depends_on_task_id);
            if (targetNodeIdx >= 0) {
              const targetNode = visibleNodes[targetNodeIdx];
              const coordsA = getBarPixelCoords(node);
              const coordsB = getBarPixelCoords(targetNode);
              if (coordsA && coordsB) {
                lines.push({
                  id: dep.id,
                  x1: coordsA.leftPx + coordsA.widthPx,
                  y1: nodeIdx * 44 + 22,
                  x2: coordsB.leftPx,
                  y2: targetNodeIdx * 44 + 22,
                  blockerTitle: node.title,
                  blockedTitle: targetNode.title,
                });
              }
            }
          }
        });
      }
    });

    return lines;
  }, [visibleNodes, scale, timelineStart, columnWidthPx]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} color="primary" />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden', bgcolor: 'background.paper' }}>
      {/* ── GANTT TOP TOOLBAR ────────────────────────────────────────────── */}
      <Box
        sx={{
          p: 1.75,
          px: 2.5,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {/* Left Search & Filter Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search hierarchy tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#64748B" />
                </InputAdornment>
              ),
              sx: { height: 34, fontSize: 13, width: 220, bgcolor: 'background.default' },
            }}
          />

          <Select
            size="small"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            sx={{ height: 34, fontSize: 12, minWidth: 120, bgcolor: 'background.default' }}
          >
            <MenuItem value="ALL">All Priorities</MenuItem>
            <MenuItem value="URGENT">🔴 Urgent</MenuItem>
            <MenuItem value="HIGH">🟠 High</MenuItem>
            <MenuItem value="NORMAL">🟢 Normal</MenuItem>
            <MenuItem value="LOW">🔵 Low</MenuItem>
          </Select>
        </Box>

        {/* Right Scale, Zoom, Today & Fit Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRescheduleDependencies}
                onChange={(e) => setAutoRescheduleDependencies(e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <RefreshCw size={12} /> Auto Reschedule
              </Typography>
            }
            sx={{ mr: 0 }}
          />

          <Button
            size="small"
            variant="outlined"
            onClick={() => setBaseDate(new Date())}
            sx={{ height: 32, fontSize: 12, textTransform: 'none', px: 1.5 }}
          >
            Today
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={handleAutoFit}
            startIcon={<Maximize2 size={13} />}
            sx={{ height: 32, fontSize: 12, textTransform: 'none', px: 1.5 }}
          >
            Auto Fit
          </Button>

          {/* Scale Buttons (Day, Week, Month) */}
          <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: '6px', overflow: 'hidden' }}>
            {(['DAY', 'WEEK', 'MONTH'] as TimeScale[]).map((mode) => (
              <Button
                key={mode}
                size="small"
                onClick={() => setScale(mode)}
                sx={{
                  height: 30,
                  fontSize: 11,
                  px: 1.5,
                  borderRadius: 0,
                  bgcolor: scale === mode ? '#04552B' : 'transparent',
                  color: scale === mode ? '#FFFFFF' : 'text.primary',
                  fontWeight: scale === mode ? 700 : 500,
                  '&:hover': { bgcolor: scale === mode ? '#034120' : 'action.hover' },
                }}
              >
                {mode}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── SPLIT-PANE GANTT WORKSPACE ──────────────────────────────────── */}
      <Box sx={{ display: 'flex', position: 'relative', height: 'calc(100vh - 280px)', minHeight: 480 }}>
        {/* LEFT PANE: Task Hierarchy Tree Table (Fixed Horizontal) */}
        <Box
          ref={leftPaneRef}
          onScroll={handleLeftScroll}
          sx={{
            width: leftPanelWidth,
            minWidth: 260,
            maxWidth: 600,
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: 10,
          }}
        >
          {/* Header Column Label */}
          <Box
            sx={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              px: 2,
              fontWeight: 700,
              fontSize: '0.8rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid',
              borderColor: 'divider',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 12,
            }}
          >
            Task / Deliverable Structure
          </Box>

          {/* Task Tree Rows */}
          {visibleNodes.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No matching tasks in hierarchy.
              </Typography>
            </Box>
          ) : (
            visibleNodes.map((node) => {
              const isInlineAdding = inlineSubtaskParentId === node.id;

              return (
                <Box key={node.id}>
                  <Box
                    onClick={() => onOpenTaskDetail(node)}
                    sx={{
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      px: 1.5,
                      pl: `${node.depth * 20 + 12}px`,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      bgcolor: node.depth === 0 ? 'background.paper' : 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    {/* Expand / Collapse Icon */}
                    {node.hasChildren ? (
                      <IconButton
                        size="small"
                        onClick={(e) => toggleNodeExpand(node.id, e)}
                        sx={{ p: 0.25, mr: 0.5 }}
                      >
                        {expandedTaskIds[node.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </IconButton>
                    ) : (
                      <Box sx={{ width: 22 }} />
                    )}

                    {/* Task Reference Badge */}
                    <Chip
                      label={node.task_number || `TASK-${node.id}`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        mr: 1,
                        bgcolor: '#F1F5F9',
                        color: '#475569',
                        fontFamily: 'monospace',
                      }}
                    />

                    {/* Task Title */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: node.depth === 0 ? 700 : 500,
                        color: node.is_completed ? 'text.secondary' : 'text.primary',
                        textDecoration: node.is_completed ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        mr: 1,
                      }}
                    >
                      {node.title}
                    </Typography>

                    {/* Quick Action: Add Subtask Button */}
                    <Tooltip title="Add subtask">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInlineSubtaskParentId(isInlineAdding ? null : node.id);
                        }}
                        sx={{ p: 0.5, opacity: 0.6, '&:hover': { opacity: 1, color: '#04552B' } }}
                      >
                        <Plus size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Inline Create Subtask Input */}
                  {isInlineAdding && (
                    <Box sx={{ p: 1, pl: `${(node.depth + 1) * 20 + 20}px`, display: 'flex', gap: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#F0FDF4' }}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Subtask name..."
                        value={inlineSubtaskTitle}
                        onChange={(e) => setInlineSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateSubtaskInline(node.id)}
                        sx={{ '& .MuiOutlinedInput-root': { height: 32, fontSize: 12, bgcolor: 'background.paper' } }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleCreateSubtaskInline(node.id)}
                        sx={{ bgcolor: '#04552B', '&:hover': { bgcolor: '#034120' }, height: 32, textTransform: 'none', px: 1.5, fontSize: 11 }}
                      >
                        Save
                      </Button>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>

        {/* RESIZER DRAG DIVIDER */}
        <Box
          onMouseDown={handleMouseDownResizer}
          sx={{
            width: 4,
            cursor: 'col-resize',
            bgcolor: isResizingLeft ? '#04552B' : 'divider',
            transition: 'background-color 0.15s ease',
            zIndex: 15,
            '&:hover': { bgcolor: '#04552B' },
          }}
        />

        {/* RIGHT PANE: Timeline Date Grid & Gantt Bars (Horizontally Scrollable) */}
        <Box
          ref={rightPaneRef}
          onScroll={handleRightScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            position: 'relative',
            bgcolor: 'background.default',
          }}
        >
          {/* TIMELINE DATE HEADER GRID */}
          <Box
            sx={{
              height: 48,
              display: 'flex',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              zIndex: 12,
              width: totalColumns * columnWidthPx,
            }}
          >
            {dateHeaders.map((hdr, idx) => (
              <Box
                key={idx}
                sx={{
                  width: columnWidthPx,
                  minWidth: columnWidthPx,
                  height: '100%',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 0.5,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.primary', lineHeight: 1.1 }}>
                  {hdr.label}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  {hdr.subLabel}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* TIMELINE ROWS GRID & BARS */}
          <Box sx={{ position: 'relative', width: totalColumns * columnWidthPx }}>
            {/* Background Column Grid Lines */}
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              {dateHeaders.map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: columnWidthPx,
                    minWidth: columnWidthPx,
                    height: '100%',
                    borderRight: '1px dashed',
                    borderColor: 'divider',
                  }}
                />
              ))}
            </Box>

            {/* SVG OVERLAY FOR DEPENDENCY ARROWS */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: totalColumns * columnWidthPx,
                height: visibleNodes.length * 44,
                pointerEvents: 'none',
                zIndex: 7,
              }}
            >
              <defs>
                <marker
                  id="gantt-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#D97706" />
                </marker>
              </defs>
              {dependencyLines.map((line) => {
                const controlOffset = Math.max(20, Math.abs(line.x2 - line.x1) / 2);
                const pathD = `M ${line.x1} ${line.y1} C ${line.x1 + controlOffset} ${line.y1}, ${line.x2 - controlOffset} ${line.y2}, ${line.x2} ${line.y2}`;
                return (
                  <g key={line.id} style={{ pointerEvents: 'stroke' }}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="2"
                      strokeDasharray={line.y1 > line.y2 ? '4 2' : 'none'}
                      markerEnd="url(#gantt-arrow)"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render Row Bars for Visible Hierarchy Nodes */}
            {visibleNodes.map((node) => {
              const coords = getBarPixelCoords(node);
              const isCurrentlyDragging = draggingState?.taskId === node.id;

              let renderLeft = coords ? coords.leftPx : 0;
              let renderWidth = coords ? coords.widthPx : 0;

              if (isCurrentlyDragging && draggingState) {
                const overrideCoords = getBarPixelCoords({
                  ...node,
                  start_date: draggingState.currentStartDate.toISOString().split('T')[0],
                  due_date: draggingState.currentDueDate.toISOString().split('T')[0],
                });
                if (overrideCoords) {
                  renderLeft = overrideCoords.leftPx;
                  renderWidth = overrideCoords.widthPx;
                }
              }

              return (
                <Box
                  key={node.id}
                  sx={{
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {coords ? (
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {node.title} ({node.task_number})
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Status: {node.status_name || 'Active'}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Priority: {node.priority}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Dates: {node.start_date || 'No Start'} → {node.due_date || 'No Due'}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Progress: {node.progress_percentage || 0}%
                          </Typography>
                        </Box>
                      }
                      arrow
                    >
                      <Box
                        onMouseDown={(e) => handleMouseDownBar(node, 'MOVE', e)}
                        onDoubleClick={() => onOpenTaskDetail(node)}
                        sx={{
                          position: 'absolute',
                          left: `${renderLeft}px`,
                          width: `${renderWidth}px`,
                          height: node.hasChildren ? 26 : 28,
                          bgcolor: node.hasChildren
                            ? '#334155'
                            : node.priority === 'URGENT'
                            ? '#DC2626'
                            : node.priority === 'HIGH'
                            ? '#D97706'
                            : '#04552B',
                          borderRadius: node.hasChildren ? '3px' : '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 1,
                          color: '#FFFFFF',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                          cursor: 'grab',
                          zIndex: 6,
                          userSelect: 'none',
                          transition: isCurrentlyDragging ? 'none' : 'all 0.15s ease',
                          opacity: isCurrentlyDragging ? 0.85 : 1,
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        {/* LEFT RESIZE HANDLE */}
                        <Box
                          onMouseDown={(e) => handleMouseDownBar(node, 'RESIZE_LEFT', e)}
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 8,
                            cursor: 'ew-resize',
                            bgcolor: 'rgba(255,255,255,0.25)',
                            borderRadius: '6px 0 0 6px',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.6)' },
                          }}
                        />

                        {/* Progress Fill Overlay */}
                        {node.progress_percentage > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${node.progress_percentage}%`,
                              bgcolor: 'rgba(255,255,255,0.25)',
                              borderRadius: 'inherit',
                              pointerEvents: 'none',
                            }}
                          />
                        )}

                        {/* Bar Label */}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            zIndex: 2,
                            color: '#FFFFFF',
                          }}
                        >
                          {node.priority} • {node.title}
                        </Typography>

                        {/* RIGHT RESIZE HANDLE */}
                        <Box
                          onMouseDown={(e) => handleMouseDownBar(node, 'RESIZE_RIGHT', e)}
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 8,
                            cursor: 'ew-resize',
                            bgcolor: 'rgba(255,255,255,0.25)',
                            borderRadius: '0 6px 6px 0',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.6)' },
                          }}
                        />
                      </Box>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" sx={{ pl: 2, color: 'text.secondary', fontStyle: 'italic', fontSize: '0.7rem' }}>
                      No dates scheduled
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
