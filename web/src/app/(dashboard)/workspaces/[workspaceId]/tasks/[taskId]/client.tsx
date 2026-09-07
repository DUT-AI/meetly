'use client';

import { DottedSeparator } from '@/components/dotted-separator';
import { PageError } from '@/components/page-error';
import { PageLoader } from '@/components/page-loader';
import { AssetAttachmentSection } from '@/features/assets';
import { useGetTask } from '@/features/tasks/api/use-get-task';
import { TaskBreadcrumbs } from '@/features/tasks/components/task-breadcrumbs';
import { TaskComments } from '@/features/tasks/components/task-comments';
import { TaskOverview } from '@/features/tasks/components/task-overview';
import { useTaskId } from '@/features/tasks/hooks/use-task-id';

export const TaskIdClient = () => {
  const taskId = useTaskId();

  const { data: task, isLoading } = useGetTask({ taskId });

  if (isLoading) return <PageLoader />;

  if (!task) return <PageError message="Task not found." />;

  return (
    <div className="flex flex-col gap-y-6">
      <TaskBreadcrumbs project={task.project} task={task} />

      <DottedSeparator />

      <TaskOverview task={task} />

      <AssetAttachmentSection
        workspaceId={task.workspaceId}
        entityType="TASK"
        entityId={task.id || task.$id}
        title="Tài liệu & Tệp đính kèm"
      />

      <TaskComments taskId={task.id || task.$id} workspaceId={task.workspaceId} />
    </div>
  );
};
