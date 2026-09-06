export type NotificationItem = {
  id: string;
  userId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatarUrl?: string | null;
  workspaceId?: string | null;
  type: string;
  title: string;
  content: string;
  entityType: string;
  entityId: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export function normalizeNotification(n: any): NotificationItem {
  return {
    id: n.id,
    userId: n.user_id ?? n.userId,
    actorId: n.actor_id ?? n.actorId ?? null,
    actorName: n.actor_name ?? n.actorName ?? null,
    actorAvatarUrl: n.actor_avatar_url ?? n.actorAvatarUrl ?? null,
    workspaceId: n.workspace_id ?? n.workspaceId ?? null,
    type: n.type,
    title: n.title,
    content: n.content,
    entityType: n.entity_type ?? n.entityType,
    entityId: n.entity_id ?? n.entityId,
    actionUrl: n.action_url ?? n.actionUrl ?? null,
    isRead: Boolean(n.is_read ?? n.isRead),
    readAt: n.read_at ?? n.readAt ?? null,
    createdAt: n.created_at ?? n.createdAt,
    updatedAt: n.updated_at ?? n.updatedAt,
  };
}
