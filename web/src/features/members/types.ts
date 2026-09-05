export enum MemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export type Member = {
  id: string;
  $id: string;
  workspaceId: string;
  workspace_id?: string;
  userId: string;
  user_id?: string;
  name: string;
  email: string;
  role: MemberRole;
  $createdAt?: string;
  $updatedAt?: string;
  created_at?: string;
  updated_at?: string;
};

export function normalizeMember(m: any): Member {
  if (!m) return m;
  const id = m.id ?? m.$id;
  return {
    ...m,
    id,
    $id: id,
    workspaceId: m.workspaceId ?? m.workspace_id,
    workspace_id: m.workspace_id ?? m.workspaceId,
    userId: m.userId ?? m.user_id,
    user_id: m.user_id ?? m.userId,
    name: m.name ?? '',
    email: m.email ?? '',
    role: m.role as MemberRole,
    $createdAt: m.$createdAt ?? m.created_at,
    $updatedAt: m.$updatedAt ?? m.updated_at,
  };
}
