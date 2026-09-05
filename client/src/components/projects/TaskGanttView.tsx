import React from 'react';
import { TaskItem } from '@/api/projectsApi';
import HierarchicalGanttView from '@/components/projects/HierarchicalGanttView';

interface TaskGanttViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
}

export default function TaskGanttView({ tasks, onOpenTaskDetail }: TaskGanttViewProps) {
  return (
    <HierarchicalGanttView
      tasks={tasks}
      onOpenTaskDetail={onOpenTaskDetail}
    />
  );
}
