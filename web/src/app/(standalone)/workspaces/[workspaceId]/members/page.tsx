import { redirect } from 'next/navigation';

interface WorkspaceIdMembersPageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

const WorkspaceIdMembersPage = async ({ params }: WorkspaceIdMembersPageProps) => {
  const { workspaceId } = await params;
  redirect(`/workspaces/${workspaceId}/settings`);
};

export default WorkspaceIdMembersPage;
