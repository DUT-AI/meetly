import { api } from '@/lib/api';
import {
  type PopulatedTask,
  type TaskComment,
  TaskPriority,
  TaskStatus,
  normalizeTask,
  normalizeTaskComment,
} from '../types';

export interface GetTasksParams {
  workspaceId: string;
  projectId?: string | null;
  assigneeId?: string | null;
  status?: TaskStatus | null;
  search?: string | null;
  dueDate?: string | null;
}

export interface CreateTaskPayload {
  name: string;
  status: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  workspaceId: string;
  projectId: string;
  assigneeId: string;
  dueDate: Date | string;
  description?: string;
}

export interface UpdateTaskPayload {
  name?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  projectId?: string;
  assigneeId?: string;
  dueDate?: Date | string;
  description?: string;
}

export interface BulkUpdateTaskItem {
  id?: string;
  $id?: string;
  status: TaskStatus;
  position: number;
}

export const taskApi = {
  getTasks: async (params: GetTasksParams): Promise<{ documents: PopulatedTask[]; total: number }> => {
    const queryParams: Record<string, any> = {
      workspaceId: params.workspaceId,
    };
    if (params.projectId) queryParams.projectId = params.projectId;
    if (params.assigneeId) queryParams.assigneeId = params.assigneeId;
    if (params.status) queryParams.status = params.status;
    if (params.search) queryParams.search = params.search;
    if (params.dueDate) queryParams.dueDate = params.dueDate;

    const response = await api.get<{ data: { documents: any[]; total: number } }>('/tasks', {
      params: queryParams,
    });
    const result = response.data?.data ?? response.data;
    return {
      documents: (result.documents || []).map(normalizeTask),
      total: result.total || 0,
    };
  },

  getMyGlobalTasks: async (params?: {
    status?: TaskStatus | null;
    search?: string | null;
    dueDate?: string | null;
  }): Promise<{ documents: PopulatedTask[]; total: number }> => {
    const queryParams: Record<string, any> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.search) queryParams.search = params.search;
    if (params?.dueDate) queryParams.dueDate = params.dueDate;

    const response = await api.get<{ data: { documents: any[]; total: number } }>('/tasks/my-tasks', {
      params: queryParams,
    });
    const result = response.data?.data ?? response.data;
    return {
      documents: (result.documents || []).map(normalizeTask),
      total: result.total || 0,
    };
  },

  getTask: async (taskId: string): Promise<PopulatedTask> => {
    const response = await api.get<{ data: any }>(`/tasks/${taskId}`);
    const result = response.data?.data ?? response.data;
    return normalizeTask(result);
  },

  createTask: async (payload: CreateTaskPayload): Promise<PopulatedTask> => {
    const formattedDueDate =
      payload.dueDate instanceof Date ? payload.dueDate.toISOString() : payload.dueDate;
    const body = {
      name: payload.name,
      status: payload.status,
      priority: payload.priority,
      labels: payload.labels,
      workspace_id: payload.workspaceId,
      project_id: payload.projectId,
      assignee_id: payload.assigneeId,
      due_date: formattedDueDate,
      description: payload.description,
    };
    const response = await api.post<{ data: any }>('/tasks', body);
    const result = response.data?.data ?? response.data;
    return normalizeTask(result);
  },

  updateTask: async (taskId: string, payload: UpdateTaskPayload): Promise<PopulatedTask> => {
    const body: Record<string, any> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.priority !== undefined) body.priority = payload.priority;
    if (payload.labels !== undefined) body.labels = payload.labels;
    if (payload.projectId !== undefined) body.project_id = payload.projectId;
    if (payload.assigneeId !== undefined) body.assignee_id = payload.assigneeId;
    if (payload.dueDate !== undefined) {
      body.due_date = payload.dueDate instanceof Date ? payload.dueDate.toISOString() : payload.dueDate;
    }
    if (payload.description !== undefined) body.description = payload.description;

    const response = await api.patch<{ data: any }>(`/tasks/${taskId}`, body);
    const result = response.data?.data ?? response.data;
    return normalizeTask(result);
  },

  bulkUpdateTasks: async (
    tasks: BulkUpdateTaskItem[],
  ): Promise<{ updatedTasks: PopulatedTask[]; workspaceId?: string }> => {
    const mappedTasks = tasks.map((t) => ({
      id: t.id ?? t.$id,
      status: t.status,
      position: t.position,
    }));
    const response = await api.post<{ data: { updatedTasks: any[]; workspaceId?: string } }>(
      '/tasks/bulk-update',
      { tasks: mappedTasks },
    );
    const result = response.data?.data ?? response.data;
    return {
      updatedTasks: (result.updatedTasks || []).map(normalizeTask),
      workspaceId: result.workspaceId,
    };
  },

  deleteTask: async (taskId: string): Promise<{ id: string }> => {
    const response = await api.delete<{ data: { id: string } }>(`/tasks/${taskId}`);
    return response.data?.data ?? response.data;
  },

  getTaskComments: async (taskId: string): Promise<TaskComment[]> => {
    const response = await api.get<{ data: any[] }>(`/tasks/${taskId}/comments`);
    const result = response.data?.data ?? response.data;
    return (result || []).map(normalizeTaskComment);
  },

  createTaskComment: async (
    taskId: string,
    data: { content: string; mentions?: string[] },
  ): Promise<TaskComment> => {
    const response = await api.post<{ data: any }>(`/tasks/${taskId}/comments`, data);
    const result = response.data?.data ?? response.data;
    return normalizeTaskComment(result);
  },

  updateTaskComment: async (
    taskId: string,
    commentId: string,
    data: { content: string; mentions?: string[] },
  ): Promise<TaskComment> => {
    const response = await api.patch<{ data: any }>(
      `/tasks/${taskId}/comments/${commentId}`,
      data,
    );
    const result = response.data?.data ?? response.data;
    return normalizeTaskComment(result);
  },

  deleteTaskComment: async (taskId: string, commentId: string): Promise<{ id: string }> => {
    const response = await api.delete<{ data: { id: string } }>(
      `/tasks/${taskId}/comments/${commentId}`,
    );
    return response.data?.data ?? response.data;
  },
};
