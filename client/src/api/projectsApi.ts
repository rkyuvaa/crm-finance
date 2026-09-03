import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
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
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
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
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
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

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Projects', 'Tasks', 'TimeLogs', 'Comments'],
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
    addSubtask: builder.mutation<TaskSubtaskItem, { taskId: number; title: string }>({
      query: ({ taskId, title }) => ({
        url: `/tasks/${taskId}/subtasks`,
        method: 'POST',
        body: { title },
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
    logTime: builder.mutation<TaskTimeLogItem, { taskId: number; hours: number; log_date: string; description?: string }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/timelogs`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { taskId }) => [{ type: 'Tasks', id: taskId }, 'Tasks', 'TimeLogs'],
    }),
    getTaskTimeLogs: builder.query<TaskTimeLogItem[], number>({
      query: (taskId) => `/tasks/${taskId}/timelogs`,
      providesTags: ['TimeLogs'],
    }),

    // Comments
    addComment: builder.mutation<TaskCommentItem, { taskId: number; content: string }>({
      query: ({ taskId, content }) => ({
        url: `/tasks/${taskId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: ['Comments'],
    }),
    getTaskComments: builder.query<TaskCommentItem[], number>({
      query: (taskId) => `/tasks/${taskId}/comments`,
      providesTags: ['Comments'],
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
} = projectsApi;
