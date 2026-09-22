import { type Member, normalizeMember } from '@/features/members/types';
import { type Project, normalizeProject } from '@/features/projects/types';
import type { WorkspaceInfo } from '@/features/workspaces/types';

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export type Task = {
  id: string;
  $id: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assigneeIds: string[];
  assignee_ids?: string[];
  projectId: string;
  project_id?: string;
  workspaceId: string;
  workspace_id?: string;
  position: number;
  dueDate: string;
  due_date?: string;
  description?: string;
  $createdAt?: string;
  $updatedAt?: string;
  created_at?: string;
  updated_at?: string;
};

export type PopulatedTask = Task & {
  project: Project;
  assignees: Member[];
  workspace?: WorkspaceInfo;
};

export type TaskCommentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
};

export type TaskComment = {
  id: string;
  $id: string;
  taskId: string;
  task_id?: string;
  userId: string;
  user_id?: string;
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
  user: TaskCommentUser;
  // Backward compatibility convenience getters
  userName?: string;
  user_name?: string;
  userEmail?: string;
  user_email?: string;
  userAvatarUrl?: string | null;
  user_avatar_url?: string | null;
};

export function normalizeTaskComment(c: any): TaskComment {
  if (!c) return c;
  const id = c.id ?? c.$id;
  const rawUser = c.user || {};
  const userId = rawUser.id ?? c.userId ?? c.user_id ?? '';
  const userName = rawUser.name ?? c.userName ?? c.user_name ?? `User ${userId}`;
  const userEmail = rawUser.email ?? c.userEmail ?? c.user_email ?? '';
  const userAvatarUrl = rawUser.avatarUrl ?? rawUser.avatar_url ?? c.userAvatarUrl ?? c.user_avatar_url ?? null;

  const user: TaskCommentUser = {
    id: userId,
    name: userName,
    email: userEmail,
    avatarUrl: userAvatarUrl,
    avatar_url: userAvatarUrl,
  };

  return {
    ...c,
    id,
    $id: id,
    taskId: c.taskId ?? c.task_id,
    task_id: c.task_id ?? c.taskId,
    userId,
    user_id: userId,
    content: c.content || '',
    mentions: Array.isArray(c.mentions) ? c.mentions : [],
    createdAt: c.createdAt ?? c.created_at,
    updatedAt: c.updatedAt ?? c.updated_at,
    created_at: c.created_at ?? c.createdAt,
    updated_at: c.updated_at ?? c.updatedAt,
    user,
    userName,
    user_name: userName,
    userEmail,
    user_email: userEmail,
    userAvatarUrl,
    user_avatar_url: userAvatarUrl,
  };
}

export function normalizeTask(t: any): PopulatedTask {
  if (!t) return t;
  const id = t.id ?? t.$id;
  const rawAssignees: Member[] = Array.isArray(t.assignees) ? t.assignees.map(normalizeMember) : [];
  const rawAssigneeIds: string[] = Array.isArray(t.assigneeIds ?? t.assignee_ids)
    ? (t.assigneeIds ?? t.assignee_ids)
    : rawAssignees.length > 0
      ? rawAssignees.map((m) => m.id)
      : [];

  return {
    ...t,
    id,
    $id: id,
    priority: t.priority || TaskPriority.MEDIUM,
    labels: Array.isArray(t.labels) ? t.labels : [],
    assigneeIds: rawAssigneeIds,
    assignee_ids: rawAssigneeIds,
    assignees: rawAssignees,
    projectId: t.projectId ?? t.project_id,
    project_id: t.project_id ?? t.projectId,
    workspaceId: t.workspaceId ?? t.workspace_id,
    workspace_id: t.workspace_id ?? t.workspaceId,
    dueDate: t.dueDate ?? t.due_date,
    due_date: t.due_date ?? t.dueDate,
    description: t.description || undefined,
    project: t.project ? normalizeProject(t.project) : t.project,
    workspace: t.workspace
      ? {
          ...t.workspace,
          id: t.workspace.id ?? t.workspace.$id ?? t.workspaceId,
          $id: t.workspace.$id ?? t.workspace.id ?? t.workspaceId,
          imageUrl: t.workspace.imageUrl ?? t.workspace.image_url,
          image_url: t.workspace.image_url ?? t.workspace.imageUrl,
        }
      : undefined,
    $createdAt: t.$createdAt ?? t.created_at,
    $updatedAt: t.$updatedAt ?? t.updated_at,
  };
}
