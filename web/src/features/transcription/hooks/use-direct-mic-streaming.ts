'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { transcriptionApi } from '../api/transcription-api';

interface UseDirectMicStreamingProps {
  workspaceId: string;
  meetingId: string;
  onSessionCreated?: (session: any) => void;
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return input;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
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

export const useDirectMicStreaming = ({ workspaceId, meetingId, onSessionCreated }: UseDirectMicStreamingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const seqRef = useRef<number>(0);
  const sampleCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setIsInitializing(true);

      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Create transcription session on backend
      const session = await transcriptionApi.createSession(workspaceId, meetingId);
      if (!session || !session.producer_ticket) {
        throw new Error('Không nhận được vé ghi âm (producer_ticket) từ server');
      }
      sessionIdRef.current = session.session_id;
      setActiveSessionId(session.session_id);
      onSessionCreated?.(session);

      // 3. Connect Producer WebSocket
      const wsUrl = buildWsUrl(
        `/api/v1/transcription-sessions/${session.session_id}/audio?ticket=${encodeURIComponent(session.producer_ticket)}`,
      );

      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        let isOpened = false;
        ws.onopen = () => {
          isOpened = true;
          resolve();
        };
        ws.onerror = () => {
          if (!isOpened) {
            reject(new Error('Lỗi kết nối WebSocket tới Backend API. Vui lòng kiểm tra server backend đã chạy (port 8000).'));
          }
        };
        ws.onclose = (ev) => {
          if (!isOpened) {
            reject(new Error(`WebSocket bị đóng (Mã ${ev.code}: ${ev.reason || 'Server từ chối kết nối'})`));
          }
        };
      });

      // 4. Set up Web Audio API AudioContext with resume check
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let audioCtx: AudioContext;
      try {
        audioCtx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor with buffer size 4096
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Mute audio feedback to speakers while keeping node graph active
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      seqRef.current = 0;
      sampleCountRef.current = 0;
      startTimeRef.current = performance.now();

      const actualSampleRate = audioCtx.sampleRate;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const rawData = e.inputBuffer.getChannelData(0);
        const inputData = actualSampleRate !== 16000 ? downsampleTo16k(rawData, actualSampleRate) : rawData;

        // Convert Float32 to Int16 PCM (Little-Endian)
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const pcmBytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
        // 16-byte fixed header: version (u8), stream_id (u8), flags (u16 LE), seq (u32 LE), start_sample (u64 LE)
        const header = new ArrayBuffer(16);
        const view = new DataView(header);
        view.setUint8(0, 1); // version = 1
        view.setUint8(1, 2); // stream_id = 2 (MIC)
        view.setUint16(2, 0, true); // flags = 0
        view.setUint32(4, seqRef.current++, true); // seq
        view.setBigUint64(8, BigInt(sampleCountRef.current), true); // start_sample
        sampleCountRef.current += int16.length;

        const packet = new Uint8Array(16 + pcmBytes.byteLength);
        packet.set(new Uint8Array(header), 0);
        packet.set(pcmBytes, 16);
        wsRef.current.send(packet);
      };

      setIsRecording(true);
      toast.success('Đã bật Mic ghi âm trực tiếp! Hãy nói thử vào microphone.');
    } catch (err: any) {
      console.error('[Mic Streaming Error]:', err);
      toast.error(`Lỗi khi mở microphone: ${err.message || err}`);
      stopRecording();
    } finally {
      setIsInitializing(false);
    }
  }, [workspaceId, meetingId, onSessionCreated]);

  const stopRecording = useCallback(async () => {
    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          // Send EOS frame flag (flags = 0x01)
          const header = new ArrayBuffer(16);
          const view = new DataView(header);
          view.setUint8(0, 1);
          view.setUint8(1, 2); // MIC
          view.setUint16(2, 0x01, true); // EOS flag
          view.setUint32(4, seqRef.current++, true);
          view.setBigUint64(8, BigInt(sampleCountRef.current), true);
          wsRef.current.send(header);
        }
        wsRef.current.close();
        wsRef.current = null;
      }

      if (sessionIdRef.current) {
        await transcriptionApi.stopSession(sessionIdRef.current, sampleCountRef.current, seqRef.current);
        sessionIdRef.current = null;
      }
      setActiveSessionId(null);

      setIsRecording(false);
      toast.info('Đã dừng phiên ghi âm. Đang lưu bản ghi...');
      queryClient.invalidateQueries({ queryKey: ['transcripts', workspaceId, meetingId] });
    } catch (err: any) {
      console.error('[Stop Recording Error]:', err);
    } finally {
      setIsRecording(false);
    }
  }, [workspaceId, meetingId, queryClient]);

  return {
    isRecording,
    isInitializing,
    activeSessionId,
    startRecording,
    stopRecording,
  };
};
