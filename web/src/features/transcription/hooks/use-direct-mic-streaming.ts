'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { transcriptionApi } from '../api/transcription-api';
import { useQueryClient } from '@tanstack/react-query';

interface UseDirectMicStreamingProps {
  workspaceId: string;
  meetingId: string;
}

export const useDirectMicStreaming = ({ workspaceId, meetingId }: UseDirectMicStreamingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
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

      // 3. Connect Producer WebSocket
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const cleanHost = apiBase.replace(/^https?:\/\//, '').split('/')[0];
      const protocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${cleanHost}/api/v1/transcription-sessions/${session.session_id}/audio?ticket=${encodeURIComponent(session.producer_ticket)}`;

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
            reject(new Error('Lỗi kết nối WebSocket (Handshake thất bại với Backend API)'));
          }
        };
        ws.onclose = (ev) => {
          if (!isOpened) {
            reject(new Error(`WebSocket bị đóng (Code ${ev.code}: ${ev.reason || 'Server từ chối kết nối'})`));
          }
        };
      });

      // 4. Set up Web Audio API AudioContext at 16kHz
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor with buffer size 4096 (~256ms at 16kHz)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      seqRef.current = 0;
      sampleCountRef.current = 0;
      startTimeRef.current = performance.now();

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM (Little-Endian)
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const pcmBytes = new Uint8Array(int16.buffer);
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

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      toast.success('Đã bật Mic ghi âm trực tiếp! Hãy nói thử vào microphone.');
    } catch (err: any) {
      console.error('[Mic Streaming Error]:', err);
      toast.error(`Lỗi khi mở microphone: ${err.message || err}`);
      stopRecording();
    } finally {
      setIsInitializing(false);
    }
  }, [workspaceId, meetingId]);

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
    startRecording,
    stopRecording,
  };
};
