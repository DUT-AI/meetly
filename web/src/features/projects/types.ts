export type Project = {
  id: string;
  $id: string;
  name: string;
  workspaceId: string;
  workspace_id?: string;
  imageUrl?: string;
  image_url?: string;
  imageId?: string;
  $createdAt?: string;
  $updatedAt?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProjectAnalytics = {
  taskCount: number;
  taskDifference: number;
  assignedTaskCount: number;
  assignedTaskDifference: number;
  completedTaskCount: number;
  completedTaskDifference: number;
  incompleteTaskCount: number;
  incompleteTaskDifference: number;
  overdueTaskCount: number;
  overdueTaskDifference: number;
};

export function normalizeProject(p: any): Project {
  if (!p) return p;
  const id = p.id ?? p.$id;
  const img = (p.imageUrl ?? p.image_url) || undefined;
  return {
    ...p,
    id,
    $id: id,
    workspaceId: p.workspaceId ?? p.workspace_id,
    workspace_id: p.workspace_id ?? p.workspaceId,
    imageUrl: img,
    image_url: img,
    $createdAt: p.$createdAt ?? p.created_at,
    $updatedAt: p.$updatedAt ?? p.updated_at,
  };
}

export function normalizeProjectAnalytics(a: any): ProjectAnalytics {
  if (!a) {
    return {
      taskCount: 0,
      taskDifference: 0,
      assignedTaskCount: 0,
      assignedTaskDifference: 0,
      completedTaskCount: 0,
      completedTaskDifference: 0,
      incompleteTaskCount: 0,
      incompleteTaskDifference: 0,
      overdueTaskCount: 0,
      overdueTaskDifference: 0,
    };
  }
  return {
    taskCount: a.taskCount ?? a.task_count ?? 0,
    taskDifference: a.taskDifference ?? a.task_difference ?? 0,
    assignedTaskCount: a.assignedTaskCount ?? a.assigned_task_count ?? 0,
    assignedTaskDifference: a.assignedTaskDifference ?? a.assigned_task_difference ?? 0,
    completedTaskCount: a.completedTaskCount ?? a.completed_task_count ?? 0,
    completedTaskDifference: a.completedTaskDifference ?? a.completed_task_difference ?? 0,
    incompleteTaskCount: a.incompleteTaskCount ?? a.incomplete_task_count ?? 0,
    incompleteTaskDifference: a.incompleteTaskDifference ?? a.incomplete_task_difference ?? 0,
    overdueTaskCount: a.overdueTaskCount ?? a.overdue_task_count ?? 0,
    overdueTaskDifference: a.overdueTaskDifference ?? a.overdue_task_difference ?? 0,
  };
}
