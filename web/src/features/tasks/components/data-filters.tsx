import { Folder, ListChecks, UserIcon } from 'lucide-react';

import { DatePicker } from '@/components/date-picker';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { useGetProjects } from '@/features/projects/api/use-get-projects';
import { useTaskFilters } from '@/features/tasks/hooks/use-task-filters';
import { TaskStatus } from '@/features/tasks/types';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';

interface DataFiltersProps {
  hideProjectFilter?: boolean;
}

export const DataFilters = ({ hideProjectFilter }: DataFiltersProps) => {
  const workspaceId = useWorkspaceId();

  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const isLoading = isLoadingProjects || isLoadingMembers;

  const projectOptions = projects?.documents.map((project) => ({
    value: project.$id,
    label: project.name,
    imageUrl: project.imageUrl,
  }));

  const memberOptions = members?.documents.map((member) => ({
    value: member.$id || member.id,
    label: member.name,
    imageUrl: member.avatarUrl || member.avatar_url || undefined,
  }));

  const [{ status, assigneeId, projectId, dueDate }, setFilters] = useTaskFilters();

  const onStatusChange = (value: string) => {
    setFilters({ status: value === 'all' ? null : (value as TaskStatus) });
  };

  const onAssigneeChange = (value: string) => {
    setFilters({ assigneeId: value === 'all' ? null : (value as string) });
  };

  const onProjectChange = (value: string) => {
    setFilters({ projectId: value === 'all' ? null : (value as string) });
  };

  if (isLoading) return null;

  return (
    <div className="flex flex-col gap-2 lg:flex-row">
      <Select defaultValue={status ?? undefined} value={status ?? 'all'} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 w-full lg:w-auto">
          <div className="flex items-center pr-2">
            <ListChecks className="mr-2 size-4" />
            <SelectValue placeholder="All statuses" />
          </div>
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectSeparator />

          <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
          <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
          <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
          <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
          <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue={assigneeId ?? undefined} value={assigneeId ?? 'all'} onValueChange={onAssigneeChange}>
        <SelectTrigger className="h-8 w-full lg:w-auto">
          <div className="flex items-center pr-2">
            <UserIcon className="mr-2 size-4" />
            <SelectValue placeholder="All assignees" />
          </div>
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          <SelectSeparator />

          {memberOptions?.map((member) => (
            <SelectItem key={member.value} value={member.value}>
              <div className="flex items-center gap-x-2">
                <MemberAvatar className="size-5" name={member.label} image={member.imageUrl} />
                <span>{member.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hideProjectFilter && (
        <Select defaultValue={projectId ?? undefined} value={projectId ?? 'all'} onValueChange={onProjectChange}>
          <SelectTrigger className="h-8 w-full lg:w-auto">
            <div className="flex items-center pr-2">
              <Folder className="mr-2 size-4" />
              <SelectValue placeholder="All projects" />
            </div>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectSeparator />

            {projectOptions?.map((project) => (
              <SelectItem key={project.value} value={project.value}>
                <div className="flex items-center gap-x-2">
                  <ProjectAvatar className="size-5" name={project.label} image={project.imageUrl} />
                  <span>{project.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <DatePicker
        placeholder="Due date"
        className="h-8 w-full lg:w-auto"
        value={dueDate ? new Date(dueDate) : undefined}
        onChange={(date) => {
          setFilters({
            dueDate: date ? date.toISOString() : null,
          });
        }}
        showReset
      />
    </div>
  );
};
