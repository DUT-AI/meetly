import { useEffect, useRef, useState } from 'react';
import { LiveTranscriptEvent, TranscriptSegment } from '../types';
import { transcriptionApi } from './transcription-api';

interface UseTranscriptionSubscriberProps {
  workspaceId: string;
  meetingId: string;
  initialSegments?: TranscriptSegment[];
}

export const useTranscriptionSubscriber = ({
  workspaceId,
  meetingId,
  initialSegments = [],
}: UseTranscriptionSubscriberProps) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>(initialSegments);
  const [partialText, setPartialText] = useState<string>('');
  const [partialSpeaker, setPartialSpeaker] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [sessionStatus, setSessionStatus] = useState<string>('IDLE');

  const wsRef = useRef<WebSocket | null>(null);

  // Sync initial segments when loaded
  useEffect(() => {
    if (initialSegments.length > 0) {
      setSegments(initialSegments);
    }
  }, [initialSegments]);

  useEffect(() => {
    let isCancelled = false;

    const connectSubscriber = async () => {
      try {
        const session = await transcriptionApi.getCurrentSession(workspaceId, meetingId);
        if (!session || isCancelled) return;

        setSessionStatus(session.status);

        if (!session.subscriber_ticket) return;

        const apiBase =
          process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
        const cleanHost = apiBase.replace(/^https?:\/\//, '').split('/')[0];
        const protocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';

        const wsUrl = `${protocol}//${cleanHost}/api/v1/transcription-sessions/${session.session_id}/events?ticket=${session.subscriber_ticket}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isCancelled) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: LiveTranscriptEvent = JSON.parse(event.data);
            if (data.type === 'transcript.partial') {
              setPartialText(data.text || '');
              setPartialSpeaker(data.speaker_label || 'UNKNOWN');
            } else if (data.type === 'transcript.final') {
              setPartialText('');
              setPartialSpeaker('');
              const newSegment: TranscriptSegment = {
                id: data.segment_id || `seg_${Date.now()}`,
                session_id: data.session_id,
                utterance_id: data.utterance_id || `utt_${Date.now()}`,
                revision: data.revision || 1,
                start_ms: data.start_ms || 0,
                end_ms: data.end_ms || 0,
                text: data.text || '',
                words: data.words || [],
                speaker_label: data.speaker_label || 'UNKNOWN',
                confidence: data.confidence || 1.0,
                is_final: true,
              };

              setSegments((prev) => {
                const filtered = prev.filter((s) => s.utterance_id !== newSegment.utterance_id);
                return [...filtered, newSegment].sort((a, b) => a.start_ms - b.start_ms);
              });
            } else if (data.type === 'session.status_changed') {
              if (data.status) setSessionStatus(data.status);
            }
          } catch (err) {
            console.error('[Subscriber] Error parsing live event:', err);
          }
        };

        ws.onclose = () => {
          if (!isCancelled) setIsConnected(false);
        };

        ws.onerror = () => {
          if (!isCancelled) setIsConnected(false);
        };
      } catch (err) {
        console.warn('[Subscriber] Could not initialize live transcript subscriber:', err);
      }
    };

    connectSubscriber();

    return () => {
      isCancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [workspaceId, meetingId]);

  return {
    segments,
    partialText,
    partialSpeaker,
    isConnected,
    sessionStatus,
  };
};
