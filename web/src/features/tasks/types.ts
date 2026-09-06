import { type Member, normalizeMember } from '@/features/members/types';
import type { Project } from '@/features/projects/types';

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
  assigneeId: string;
  assignee_id?: string;
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

import type { WorkspaceInfo } from '@/features/workspaces/types';

export type PopulatedTask = Task & {
  project: Project;
  assignee: Member;
  workspace?: WorkspaceInfo;
};

export function normalizeTask(t: any): PopulatedTask {
  if (!t) return t;
  const id = t.id ?? t.$id;
  return {
    ...t,
    id,
    $id: id,
    priority: t.priority || TaskPriority.MEDIUM,
    labels: Array.isArray(t.labels) ? t.labels : [],
    assigneeId: t.assigneeId ?? t.assignee_id,
    assignee_id: t.assignee_id ?? t.assigneeId,
    projectId: t.projectId ?? t.project_id,
    project_id: t.project_id ?? t.projectId,
    workspaceId: t.workspaceId ?? t.workspace_id,
    workspace_id: t.workspace_id ?? t.workspaceId,
    dueDate: t.dueDate ?? t.due_date,
    due_date: t.due_date ?? t.dueDate,
    description: t.description || undefined,
    project: t.project,
    assignee: t.assignee ? normalizeMember(t.assignee) : t.assignee,
    workspace: t.workspace,
    $createdAt: t.$createdAt ?? t.created_at,
    $updatedAt: t.$updatedAt ?? t.updated_at,
  };
}
