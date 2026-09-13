import { useRouter } from 'next/navigation';

import { MemberAvatar } from '@/features/members/components/member-avatar';
import type { Member } from '@/features/members/types';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import type { Project } from '@/features/projects/types';
import { TaskStatus } from '@/features/tasks/types';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

interface EventCardProps {
  title: string;
  assignees?: Member[];
  project: Project;
  status: TaskStatus;
  id: string;
}

const statusColorMap: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'border-l-pink-500',
  [TaskStatus.TODO]: 'border-l-red-500',
  [TaskStatus.IN_PROGRESS]: 'border-l-yellow-500',
  [TaskStatus.IN_REVIEW]: 'border-l-blue-500',
  [TaskStatus.DONE]: 'border-l-emerald-500',
};

export const EventCard = ({ title, assignees, project, status, id }: EventCardProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    router.push(`/workspaces/${workspaceId}/tasks/${id}`);
  };

  const memberList = assignees || [];

  return (
    <div className="px-2">
      <button
        onClick={onClick}
        className={cn(
          'flex cursor-pointer flex-col gap-y-1.5 rounded-md border border-l-4 bg-white p-1.5 text-xs text-primary transition hover:opacity-75',
          statusColorMap[status],
        )}
      >
        <p>{title}</p>

        <div className="flex items-center gap-x-1">
          {memberList.length > 0 ? (
            <div className="flex items-center -space-x-1.5">
              {memberList.slice(0, 3).map((m) => (
                <MemberAvatar
                  key={m.id}
                  className="size-4 border border-white"
                  fallbackClassName="text-[8px]"
                  name={m.name || 'Member'}
                  image={m.avatar_url || (m as any)?.avatarUrl}
                />
              ))}
              {memberList.length > 3 && (
                <span className="text-[9px] font-semibold text-neutral-500 pl-1">
                  +{memberList.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-neutral-400 italic">Chưa giao</span>
          )}

          <div aria-hidden className="size-1 rounded-full bg-neutral-300" />
          <ProjectAvatar name={project?.name} image={project?.imageUrl} />
        </div>
      </button>
    </div>
  );
};
