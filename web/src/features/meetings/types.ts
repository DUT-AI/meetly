export interface Meeting {
  id: string;
  workspace_id: string;
  title: string;
  start_time: string;
  end_time: string;
  participants: string[];
  report: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}
