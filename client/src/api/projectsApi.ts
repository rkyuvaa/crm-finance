import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/api/baseApi';
import type { RootState } from '@/app/store';

export interface ProjectItem {
  id: number;
  name: string;
  code?: string;
  description?: string;
  space_id?: number;
  lead_id?: number;
  lead_app_no?: string;
  lead_customer_name?: string;
  category: string;
  type_id?: number;
  status_id?: number;
  progress: number;
  budget: float;
  estimated_cost: float;
  actual_cost: float;
  target_start_date?: string;
  target_end_date?: string;
  owner_id?: number;
  owner_name?: string;
  tasks_count: { total: number; done: number };
  created_at: string;
  updated_at: string;
}

export type float = number;

export interface TaskSubtaskItem {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  display_order: number;
  created_at: string;
}

export interface TaskAssigneeInfo {
  id: number;
  user_id: number;
  full_name: string;
  email?: string;
}

export interface TaskFollowerInfo {
  id: number;
  user_id: number;
  full_name: string;
  email?: string;
}

export interface TaskTagInfo {
  id: number;
  name: string;
  color?: string;
}

export interface TaskChecklistItemInfo {
  id: number;
  checklist_id: number;
  title: string;
  is_completed: boolean;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
  display_order: number;
}

export interface TaskChecklistInfo {
  id: number;
  task_id: number;
  title: string;
  items: TaskChecklistItemInfo[];
}

export interface TaskTimeEntryInfo {
  id: number;
  task_id: number;
  user_id: number;
  user_name?: string;
  duration_minutes: number;
  started_at?: string;
  ended_at?: string;
  description?: string;
  created_at: string;
}

export interface TaskDependencyInfo {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: 'BLOCKS' | 'BLOCKED_BY' | 'WAITING_ON';
  depends_on_task_number?: string;
  depends_on_task_title?: string;
  depends_on_status_name?: string;
  depends_on_priority?: string;
  depends_on_due_date?: string;
  depends_on_is_completed?: boolean;
  direction?: 'BLOCKING' | 'BLOCKED_BY';
}

export interface TaskRelationshipInfo {
  id: number;
  task_id: number;
  related_task_id: number;
  relationship_type: 'RELATED' | 'LINKED' | 'DUPLICATE';
  related_task_number?: string;
  related_task_title?: string;
}

export interface TaskActivityInfo {
  id: number;
  task_id: number;
  actor_id?: number;
  actor_name: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

export interface TaskItem {
  id: number;
  task_number: string;
  company_id?: number;
  branch_id?: number;
  department_id?: number;
  cost_center_id?: number;
  cost_center_code?: string;
  cost_center_name?: string;
  project_id?: number;
  project_name?: string;
  phase_id?: number;
  parent_task_id?: number;
  sort_order?: number;
  title: string;
  description?: string;
  task_type: string;
  status_id?: number;
  status_name?: string;
  status_category?: string;
  status_color?: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  start_date?: string;
  start_time?: string;
  due_date?: string;
  due_time?: string;
  estimated_minutes: number;
  actual_minutes: number;
  progress_percentage: number;
  is_completed: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  is_blocked?: boolean;
  created_by?: number;
  updated_by?: number;
  completed_by?: number;
  completed_at?: string;
  assignees: TaskAssigneeInfo[];
  followers: TaskFollowerInfo[];
  tags: TaskTagInfo[];
  checklists: TaskChecklistInfo[];
  dependencies: TaskDependencyInfo[];
  relationships: TaskRelationshipInfo[];
  time_entries: TaskTimeEntryInfo[];
  activities: TaskActivityInfo[];
  subtasks: TaskItem[];
  nested_subtasks?: TaskItem[];
  subtask_count?: number;
  completed_subtask_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskTimeLogItem {
  id: number;
  task_id: number;
  user_id: number;
  user_name?: string;
  hours: number;
  log_date: string;
  description?: string;
  created_at: string;
}

export interface TaskCommentItem {
  id: number;
  task_id: number;
  user_id: number;
  user_name?: string;
  content: string;
  created_at: string;
}

export interface StatusDefinitionItem {
  id: number;
  name: string;
  color: string;
  display_order: number;
  is_terminal: boolean;
}

export interface CustomFieldDefinitionItem {
  id: number;
  name: string;
  label: string;
  field_type: 'Text' | 'Number' | 'Date' | 'Select' | 'Boolean';
  options?: string;
  is_required: boolean;
  display_order: number;
}

export interface ProjectMilestoneItem {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  created_at: string;
}

export interface TaskAttachmentItem {
  id: number;
  task_id: number;
  filename: string;
  file_size?: string;
  file_url?: string;
  created_at: string;
}

export interface TaskCustomFieldValueItem {
  id: number;
  field_id: number;
  field_label?: string;
  value?: string;
}

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Projects', 'Tasks', 'TimeLogs', 'Comments', 'StatusDefs', 'CustomFieldDefs', 'Milestones', 'Attachments', 'TaskCustomFields'],
  endpoints: (builder) => ({
    // Projects
    getProjects: builder.query<ProjectItem[], { status?: string; lead_id?: number; q?: string } | void>({
      query: (params) => ({
        url: '/projects',
        params: params || undefined,
      }),
      providesTags: ['Projects'],
    }),
    getProject: builder.query<ProjectItem, number>({
      query: (id) => `/projects/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Projects', id }],
    }),
    createProject: builder.mutation<ProjectItem, Partial<ProjectItem>>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Projects'],
    }),
    updateProject: builder.mutation<ProjectItem, { id: number; body: Partial<ProjectItem> }>({
      query: ({ id, body }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Projects', { type: 'Projects', id }],
    }),
    deleteProject: builder.mutation<void, number>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Projects'],
    }),

    // Tasks
    getTasks: builder.query<TaskItem[], { project_id?: number; status?: string; priority?: string; assignee_id?: number; q?: string } | void>({
      query: (params) => ({
        url: '/tasks',
        params: params || undefined,
      }),
      providesTags: ['Tasks'],
    }),
    getTask: builder.query<TaskItem, number>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Tasks', id }],
    }),
    createTask: builder.mutation<TaskItem, Partial<TaskItem>>({
      query: (body) => ({
        url: '/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks', 'Projects'],
    }),
    updateTask: builder.mutation<TaskItem, { id: number; body: Partial<TaskItem> }>({
      query: ({ id, body }) => ({
        url: `/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Tasks', { type: 'Tasks', id }, 'Projects'],
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks', 'Projects'],
    }),

    // Subtasks
    addSubtask: builder.mutation<TaskSubtaskItem, { taskId: number; title?: string; body?: { title: string } }>({
      query: ({ taskId, title, body }) => ({
        url: `/tasks/${taskId}/subtasks`,
        method: 'POST',
        body: { title: title || body?.title || '' },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    toggleSubtask: builder.mutation<TaskSubtaskItem, number>({
      query: (subtaskId) => ({
        url: `/tasks/subtasks/${subtaskId}/toggle`,
        method: 'PUT',
      }),
      invalidatesTags: ['Tasks'],
    }),
    deleteSubtask: builder.mutation<void, number>({
      query: (subtaskId) => ({
        url: `/tasks/subtasks/${subtaskId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks'],
    }),

    // Time Logs
    logTime: builder.mutation<TaskTimeLogItem, { taskId: number; hours?: number; log_date?: string; description?: string; body?: { hours: number; log_date: string; description?: string } }>({
      query: ({ taskId, hours, log_date, description, body }) => ({
        url: `/tasks/${taskId}/timelogs`,
        method: 'POST',
        body: body || { hours, log_date, description },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks', 'TimeLogs'],
    }),
    getTaskTimeLogs: builder.query<TaskTimeLogItem[], number>({
      query: (taskId) => `/tasks/${taskId}/timelogs`,
      providesTags: ['TimeLogs'],
    }),

    // Comments
    addComment: builder.mutation<TaskCommentItem, { taskId: number; content?: string; body?: { content: string } }>({
      query: ({ taskId, content, body }) => ({
        url: `/tasks/${taskId}/comments`,
        method: 'POST',
        body: { content: content || body?.content || '' },
      }),
      invalidatesTags: ['Comments'],
    }),
    getTaskComments: builder.query<TaskCommentItem[], number>({
      query: (taskId) => `/tasks/${taskId}/comments`,
      providesTags: ['Comments'],
    }),

    // Task Attachments
    getTaskAttachments: builder.query<TaskAttachmentItem[], number>({
      query: (taskId) => `/tasks/${taskId}/attachments`,
      providesTags: (_res, _err, taskId) => [{ type: 'Attachments', id: taskId }, 'Attachments'],
    }),
    addTaskAttachment: builder.mutation<TaskAttachmentItem, { taskId: number; filename: string; file_size?: string; file_url?: string }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/attachments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Attachments', id: taskId }, 'Attachments'],
    }),
    deleteTaskAttachment: builder.mutation<void, number>({
      query: (id) => ({
        url: `/tasks/attachments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Attachments'],
    }),

    // Task Custom Fields
    getTaskCustomFields: builder.query<TaskCustomFieldValueItem[], number>({
      query: (taskId) => `/tasks/${taskId}/custom-fields`,
      providesTags: (_res, _err, taskId) => [{ type: 'TaskCustomFields', id: taskId }, 'TaskCustomFields'],
    }),
    saveTaskCustomField: builder.mutation<TaskCustomFieldValueItem, { taskId: number; field_id: number; value?: string }>({
      query: ({ taskId, field_id, value }) => ({
        url: `/tasks/${taskId}/custom-fields`,
        method: 'POST',
        body: { field_id, value },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'TaskCustomFields', id: taskId }, 'TaskCustomFields'],
    }),

    // Status Definitions
    getStatusDefinitions: builder.query<StatusDefinitionItem[], void>({
      query: () => '/projects/statuses/definitions',
      providesTags: ['StatusDefs'],
    }),
    createStatusDefinition: builder.mutation<StatusDefinitionItem, Partial<StatusDefinitionItem>>({
      query: (body) => ({
        url: '/projects/statuses/definitions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StatusDefs'],
    }),
    updateStatusDefinition: builder.mutation<StatusDefinitionItem, { id: number; body: Partial<StatusDefinitionItem> }>({
      query: ({ id, body }) => ({
        url: `/projects/statuses/definitions/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['StatusDefs'],
    }),
    deleteStatusDefinition: builder.mutation<void, number>({
      query: (id) => ({
        url: `/projects/statuses/definitions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['StatusDefs'],
    }),

    // Custom Field Definitions
    getCustomFieldDefinitions: builder.query<CustomFieldDefinitionItem[], void>({
      query: () => '/projects/tasks/custom-fields/definitions',
      providesTags: ['CustomFieldDefs'],
    }),
    createCustomFieldDefinition: builder.mutation<CustomFieldDefinitionItem, Partial<CustomFieldDefinitionItem>>({
      query: (body) => ({
        url: '/projects/tasks/custom-fields/definitions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CustomFieldDefs'],
    }),
    updateCustomFieldDefinition: builder.mutation<CustomFieldDefinitionItem, { id: number; body: Partial<CustomFieldDefinitionItem> }>({
      query: ({ id, body }) => ({
        url: `/projects/tasks/custom-fields/definitions/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CustomFieldDefs'],
    }),
    deleteCustomFieldDefinition: builder.mutation<void, number>({
      query: (id) => ({
        url: `/projects/tasks/custom-fields/definitions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CustomFieldDefs'],
    }),

    // Milestones
    getProjectMilestones: builder.query<ProjectMilestoneItem[], number>({
      query: (projectId) => `/projects/${projectId}/milestones`,
      providesTags: (_res, _err, projectId) => [{ type: 'Milestones', id: projectId }, 'Milestones'],
    }),
    createProjectMilestone: builder.mutation<ProjectMilestoneItem, { projectId: number; body: Partial<ProjectMilestoneItem> }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/milestones`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { projectId }) => [{ type: 'Milestones', id: projectId }, 'Milestones'],
    }),
    updateProjectMilestone: builder.mutation<ProjectMilestoneItem, { id: number; body: Partial<ProjectMilestoneItem> }>({
      query: ({ id, body }) => ({
        url: `/projects/milestones/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Milestones'],
    }),
    deleteProjectMilestone: builder.mutation<void, number>({
      query: (id) => ({
        url: `/projects/milestones/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Milestones'],
    }),
    // Stopwatch Time Tracking
    startTimer: builder.mutation<TaskItem, number>({
      query: (taskId) => ({
        url: `/tasks/${taskId}/timer/start`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, taskId) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    stopTimer: builder.mutation<TaskItem, { taskId: number; description?: string }>({
      query: ({ taskId, description }) => ({
        url: `/tasks/${taskId}/timer/stop`,
        method: 'POST',
        body: { description },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),

    // Checklists
    addChecklist: builder.mutation<TaskChecklistInfo, { taskId: number; title: string }>({
      query: ({ taskId, title }) => ({
        url: `/tasks/${taskId}/checklists`,
        method: 'POST',
        body: { title },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    addChecklistItem: builder.mutation<TaskChecklistItemInfo, { taskId: number; checklistId: number; title: string; assignee_id?: number; due_date?: string }>({
      query: ({ taskId, checklistId, ...body }) => ({
        url: `/tasks/${taskId}/checklists/${checklistId}/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    toggleChecklistItem: builder.mutation<TaskChecklistItemInfo, { taskId: number; itemId: number }>({
      query: ({ taskId, itemId }) => ({
        url: `/tasks/${taskId}/checklists/items/${itemId}`,
        method: 'PATCH',
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    convertChecklistItemToSubtask: builder.mutation<TaskItem, { taskId: number; itemId: number }>({
      query: ({ taskId, itemId }) => ({
        url: `/tasks/${taskId}/checklists/items/${itemId}/convert-to-subtask`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),

    // Followers
    addFollower: builder.mutation<TaskFollowerInfo, { taskId: number; user_id: number }>({
      query: ({ taskId, user_id }) => ({
        url: `/tasks/${taskId}/followers`,
        method: 'POST',
        body: { user_id },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    removeFollower: builder.mutation<void, { taskId: number; user_id: number }>({
      query: ({ taskId, user_id }) => ({
        url: `/tasks/${taskId}/followers/${user_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),

    // Dependencies
    addDependency: builder.mutation<TaskDependencyInfo, { taskId: number; depends_on_task_id: number; dependency_type?: string; direction?: string }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/dependencies`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    removeDependency: builder.mutation<void, { taskId: number; dependencyId: number }>({
      query: ({ taskId, dependencyId }) => ({
        url: `/tasks/${taskId}/dependencies/${dependencyId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),

    // Subtask & Dependency Advanced Actions
    convertSubtaskToTask: builder.mutation<TaskItem, number>({
      query: (taskId) => ({
        url: `/tasks/${taskId}/convert-to-task`,
        method: 'POST',
      }),
      invalidatesTags: ['Tasks'],
    }),
    convertTaskToSubtask: builder.mutation<TaskItem, { taskId: number; target_parent_id: number }>({
      query: ({ taskId, target_parent_id }) => ({
        url: `/tasks/${taskId}/convert-to-subtask`,
        method: 'POST',
        body: { target_parent_id },
      }),
      invalidatesTags: ['Tasks'],
    }),
    reorderSubtasks: builder.mutation<void, { taskId: number; sibling_ids: number[] }>({
      query: ({ taskId, sibling_ids }) => ({
        url: `/tasks/${taskId}/reorder-subtasks`,
        method: 'POST',
        body: { sibling_ids },
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks'],
    }),
    rescheduleDependencies: builder.mutation<TaskItem, { taskId: number; days_shift: number }>({
      query: ({ taskId, days_shift }) => ({
        url: `/tasks/${taskId}/reschedule-dependencies`,
        method: 'POST',
        body: { days_shift },
      }),
      invalidatesTags: ['Tasks'],
    }),

    // Bulk Actions
    bulkTaskAction: builder.mutation<{ message: string; affected: number }, { task_ids: number[]; action: string; value?: any }>({
      query: (body) => ({
        url: '/tasks/bulk-action',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks', 'Projects'],
    }),

    // Task Templates
    getTaskTemplates: builder.query<any[], void>({
      query: () => '/tasks/templates',
    }),
    createTaskTemplate: builder.mutation<any, { name: string; description?: string; task_id?: number }>({
      query: (body) => ({
        url: '/tasks/templates',
        method: 'POST',
        body,
      }),
    }),
    applyTaskTemplate: builder.mutation<TaskItem, { templateId: number; project_id: number }>({
      query: ({ templateId, project_id }) => ({
        url: `/tasks/templates/${templateId}/apply`,
        method: 'POST',
        body: { project_id },
      }),
      invalidatesTags: ['Tasks', 'Projects'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddSubtaskMutation,
  useToggleSubtaskMutation,
  useDeleteSubtaskMutation,
  useLogTimeMutation,
  useGetTaskTimeLogsQuery,
  useAddCommentMutation,
  useGetTaskCommentsQuery,
  useGetStatusDefinitionsQuery,
  useCreateStatusDefinitionMutation,
  useUpdateStatusDefinitionMutation,
  useDeleteStatusDefinitionMutation,
  useGetCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinitionMutation,
  useUpdateCustomFieldDefinitionMutation,
  useDeleteCustomFieldDefinitionMutation,
  useGetProjectMilestonesQuery,
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
  useDeleteProjectMilestoneMutation,
  useGetTaskAttachmentsQuery,
  useAddTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
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
  useConvertSubtaskToTaskMutation,
  useConvertTaskToSubtaskMutation,
  useReorderSubtasksMutation,
  useRescheduleDependenciesMutation,
  useBulkTaskActionMutation,
  useGetTaskTemplatesQuery,
  useCreateTaskTemplateMutation,
  useApplyTaskTemplateMutation,
} = projectsApi;
