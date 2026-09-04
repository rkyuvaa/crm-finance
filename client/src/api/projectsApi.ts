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

export interface TaskItem {
  id: number;
  project_id?: number;
  project_name?: string;
  parent_task_id?: number;
  title: string;
  description?: string;
  type_id?: number;
  status_id?: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  assignee_id?: number;
  assignee_name?: string;
  start_date?: string;
  due_date?: string;
  estimated_hours: number;
  actual_hours: number;
  tags?: string;
  subtasks: TaskSubtaskItem[];
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
} = projectsApi;
