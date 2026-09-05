import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useGetTasksQuery, TaskItem } from '@/api/projectsApi';
import HierarchicalGanttView from '@/components/projects/HierarchicalGanttView';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';

interface ProjectTimelineViewProps {
  projectId?: string;
  onOpenTaskDetail?: (task: TaskItem) => void;
}

export default function ProjectTimelineView({ projectId, onOpenTaskDetail }: ProjectTimelineViewProps) {
  const numericId = Number(projectId);
  const { data: tasks = [], isLoading } = useGetTasksQuery(
    { project_id: numericId },
    { skip: !numericId || isNaN(numericId) }
  );

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleOpenDetail = (task: TaskItem) => {
    if (onOpenTaskDetail) {
      onOpenTaskDetail(task);
    } else {
      setSelectedTask(task);
      setPanelOpen(true);
    }
  };

  return (
    <Box>
      <HierarchicalGanttView
        tasks={tasks}
        isLoading={isLoading}
        onOpenTaskDetail={handleOpenDetail}
      />
      {!onOpenTaskDetail && (
        <TaskDetailPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          task={selectedTask}
        />
      )}
    </Box>
  );
}
