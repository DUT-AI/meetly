import { useEffect, useRef, useState } from 'react';

import { LiveTranscriptEvent, TranscriptSegment } from '../types';
import { transcriptionApi } from './transcription-api';

interface UseTranscriptionSubscriberProps {
  workspaceId: string;
  meetingId: string;
  initialSegments?: TranscriptSegment[];
  activeSessionId?: string | null;
}

const buildWsUrl = (pathWithQuery: string): string => {
  let host = 'localhost:8000';
  let isHttps = false;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    host =
      hostname !== 'localhost' && hostname !== '127.0.0.1'
        ? `${hostname}:8000`
        : process.env.NEXT_PUBLIC_API_BASE_URL
          ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).host
          : 'localhost:8000';
    isHttps = window.location.protocol === 'https:';
  } else {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      try {
        const parsed = new URL(apiBase);
        host = parsed.host;
        isHttps = parsed.protocol === 'https:';
      } catch {
        host = 'localhost:8000';
      }
    }
  }
  const protocol = isHttps ? 'wss:' : 'ws:';
  return `${protocol}//${host}${pathWithQuery}`;
};

export const useTranscriptionSubscriber = ({
  workspaceId,
  meetingId,
  initialSegments = [],
  activeSessionId,
}: UseTranscriptionSubscriberProps) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>(initialSegments);
  const [partialText, setPartialText] = useState<string>('');
  const [partialTranslation, setPartialTranslation] = useState<string>('');
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

  const attachWsListeners = (ws: WebSocket) => {
    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: LiveTranscriptEvent = JSON.parse(event.data);
        if (data.type === 'transcript.partial') {
          setPartialText(data.text || '');
          setPartialTranslation(data.translation || '');
          setPartialSpeaker(data.speaker_label || 'UNKNOWN');
        } else if (data.type === 'transcript.final') {
          setPartialText('');
          setPartialTranslation('');
          setPartialSpeaker('');
          const newSegment: TranscriptSegment = {
            id: data.segment_id || `seg_${Date.now()}`,
            session_id: data.session_id,
            utterance_id: data.utterance_id || `utt_${Date.now()}`,
            revision: data.revision || 1,
            start_ms: data.start_ms || 0,
            end_ms: data.end_ms || 0,
            text: data.text || '',
            translation: data.translation || null,
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
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  };

  const connectToSession = (sessionId: string, subscriberTicket: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const wsUrl = buildWsUrl(`/api/v1/transcription-sessions/${sessionId}/events?ticket=${encodeURIComponent(subscriberTicket)}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    attachWsListeners(ws);
  };

  useEffect(() => {
    let isCancelled = false;

    const connectSubscriber = async () => {
      try {
        const session = await transcriptionApi.getCurrentSession(workspaceId, meetingId);
        if (!session || isCancelled) return;

        setSessionStatus(session.status);

        if (!session.subscriber_ticket) return;

        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }

        const wsUrl = buildWsUrl(
          `/api/v1/transcription-sessions/${session.session_id}/events?ticket=${encodeURIComponent(session.subscriber_ticket)}`,
        );
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        attachWsListeners(ws);
      } catch (err) {
        console.warn('[Subscriber] Could not initialize live transcript subscriber:', err);
      }
    };

    connectSubscriber();

    // Periodically poll for newly started sessions (e.g. from Chrome Extension) when not connected
    const pollInterval = setInterval(() => {
      if (!isCancelled && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        connectSubscriber();
      }
    }, 4000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [workspaceId, meetingId, activeSessionId]);

  return {
    segments,
    partialText,
    partialTranslation,
    partialSpeaker,
    isConnected,
    sessionStatus,
    connectToSession,
  };
};
