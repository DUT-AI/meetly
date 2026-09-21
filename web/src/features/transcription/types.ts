export interface TranscriptWord {
  word: string;
  start_ms: number;
  end_ms: number;
  score: number;
}

export interface TranscriptSegment {
  id: string;
  session_id: string;
  utterance_id: string;
  revision: number;
  start_ms: number;
  end_ms: number;
  text: string;
  translation?: string | null;
  words?: TranscriptWord[];
  speaker_label: 'LOCAL_USER' | 'REMOTE_SPEAKER' | 'UNKNOWN' | string;
  confidence: number;
  is_final: boolean;
}

export interface TranscriptionSession {
  session_id: string;
  meeting_id: string;
  workspace_id: string;
  status: 'CREATED' | 'STREAMING' | 'FINALIZING' | 'RECORDED' | 'COMPLETED' | 'FAILED' | string;
  source_type: string;
  sample_rate: number;
  producer_ticket?: string;
  subscriber_ticket?: string;
  ticket_expires_in?: number;
}

export interface MeetingTranscriptsResponse {
  session: TranscriptionSession | null;
  recording_url: string | null;
  segments: TranscriptSegment[];
}

export interface LiveTranscriptEvent {
  type: 'transcript.partial' | 'transcript.final' | 'session.status_changed';
  session_id: string;
  utterance_id?: string;
  segment_id?: string;
  revision?: number;
  start_ms?: number;
  end_ms?: number;
  text?: string;
  translation?: string | null;
  words?: TranscriptWord[];
  speaker_label?: string;
  confidence?: number;
  is_final?: boolean;
  status?: string;
}
