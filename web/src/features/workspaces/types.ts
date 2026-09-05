export type Workspace = {
  id: string;
  $id: string;
  name: string;
  imageUrl?: string;
  image_url?: string;
  imageId?: string;
  userId?: string;
  owner_id?: string;
  inviteCode?: string;
  invite_code?: string;
  $createdAt?: string;
  $updatedAt?: string;
  created_at?: string;
  updated_at?: string;
};

export type WorkspaceInfo = {
  id: string;
  $id: string;
  name: string;
  imageUrl?: string;
  image_url?: string;
};

export type WorkspaceAnalytics = {
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
  task_count?: number;
  task_difference?: number;
  assigned_task_count?: number;
  assigned_task_difference?: number;
  completed_task_count?: number;
  completed_task_difference?: number;
  incomplete_task_count?: number;
  incomplete_task_difference?: number;
  overdue_task_count?: number;
  overdue_task_difference?: number;
};

export function normalizeWorkspace(w: any): Workspace {
  if (!w) return w;
  const id = w.id ?? w.$id;
  const img = (w.imageUrl ?? w.image_url) || undefined;
  return {
    ...w,
    id,
    $id: id,
    imageUrl: img,
    image_url: img,
    userId: w.userId ?? w.owner_id,
    owner_id: w.owner_id ?? w.userId,
    inviteCode: w.inviteCode ?? w.invite_code,
    invite_code: w.invite_code ?? w.inviteCode,
    $createdAt: w.$createdAt ?? w.created_at,
    $updatedAt: w.$updatedAt ?? w.updated_at,
  };
}

export function normalizeWorkspaceAnalytics(a: any): WorkspaceAnalytics {
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
