export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Meeting {
  id: string;
  workspace_id: string;
  title: string;
  start_time: string;
  end_time: string;
  participants: string[];
  report: Record<string, any>;
  status: MeetingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}
