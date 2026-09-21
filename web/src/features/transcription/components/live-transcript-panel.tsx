'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Search,
  ArrowDown,
  Copy,
  PlusCircle,
  Radio,
  Clock,
  User,
  Check,
  Mic,
  Square,
  Loader2,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TranscriptSegment } from '../types';
import { useGetTranscripts } from '../api/use-get-transcripts';
import { useTranscriptionSubscriber } from '../api/use-transcription-subscriber';
import { useDirectMicStreaming } from '../hooks/use-direct-mic-streaming';

interface LiveTranscriptPanelProps {
  workspaceId: string;
  meetingId: string;
  currentTimeMs?: number;
  onSeek?: (timeMs: number) => void;
  onInsertToEditor?: (text: string) => void;
  className?: string;
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  workspaceId,
  meetingId,
  currentTimeMs = 0,
  onSeek,
  onInsertToEditor,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial history from REST API
  const { data: transcriptsData, isLoading } = useGetTranscripts(workspaceId, meetingId);

  // 2. Real-time updates from WebSocket
  const subscriber = useTranscriptionSubscriber({
    workspaceId,
    meetingId,
    initialSegments: transcriptsData?.segments,
  });

  // 3. Direct browser microphone streaming for live testing
  const {
    isRecording,
    isInitializing,
    startRecording,
    stopRecording,
  } = useDirectMicStreaming({
    workspaceId,
    meetingId,
    onSessionCreated: (session) => {
      if (session.subscriber_ticket) {
        subscriber.connectToSession(session.session_id, session.subscriber_ticket);
      }
    },
  });

  const {
    segments: liveSegments,
    partialText,
    partialTranslation,
    partialSpeaker,
    isConnected,
    sessionStatus,
  } = subscriber;
  // Filtered segments
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return liveSegments;
    const q = searchQuery.toLowerCase();
    return liveSegments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        (s.speaker_label && s.speaker_label.toLowerCase().includes(q))
    );
  }, [liveSegments, searchQuery]);

  // Auto-scroll to bottom when new segments or partial text arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveSegments.length, partialText, autoScroll]);

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getSpeakerDisplay = (label?: string) => {
    if (!label || label === 'UNKNOWN') {
      return {
        name: 'Người nói',
        isLocal: false,
        badgeClass: 'text-slate-600 bg-slate-100/90 border-slate-200/80',
      };
    }
    if (label === 'LOCAL_USER') {
      return {
        name: 'Bạn',
        isLocal: true,
        badgeClass: 'text-purple-700 bg-purple-100/80 border-purple-200 font-semibold',
      };
    }
    if (label === 'REMOTE_SPEAKER') {
      return {
        name: 'Người tham gia',
        isLocal: false,
        badgeClass: 'text-blue-700 bg-blue-100/80 border-blue-200 font-medium',
      };
    }
    // Dynamic name from Google Meet (e.g. "Phước Nguyễn")
    return {
      name: label,
      isLocal: false,
      badgeClass: 'text-indigo-700 bg-indigo-100/80 border-indigo-200 font-semibold',
    };
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertAll = () => {
    if (!onInsertToEditor || liveSegments.length === 0) return;
    const formatted = liveSegments
      .map(
        (s) =>
          `[${formatMs(s.start_ms)}] ${getSpeakerDisplay(s.speaker_label).name}: ${s.text}${
            s.translation ? `\n   -> ${s.translation}` : ''
          }`
      )
      .join('\n\n');
    onInsertToEditor(formatted);
  };

  const hasSession = !!transcriptsData?.session || liveSegments.length > 0;

  return (
    <div className={cn('flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden h-full min-h-[500px] max-h-[750px]', className)}>
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'size-2.5 rounded-full',
                isConnected
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500 animate-pulse'
                  : hasSession
                  ? 'bg-slate-400'
                  : 'bg-amber-400 animate-pulse'
              )}
            />
            <h3 className="text-xs font-bold text-slate-900">Transcript Cuộc họp</h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-white">
            {liveSegments.length} câu
          </Badge>
          {sessionStatus && sessionStatus !== 'IDLE' && (
            <Badge
              variant="secondary"
              className="text-[10px] uppercase font-semibold px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-100"
            >
              {sessionStatus}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Mic Recording Button */}
          {isRecording ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="h-7 text-[11px] font-bold gap-1 px-2.5 rounded-lg animate-pulse"
              title="Dừng ghi âm mic"
            >
              <Square className="size-3 fill-current" />
              Dừng mic
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isInitializing}
              onClick={startRecording}
              className="h-7 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1 px-2.5 rounded-lg shadow-2xs"
              title="Bật mic trình duyệt để nói và test bóc băng trực tiếp"
            >
              {isInitializing ? (
                <Loader2 className="size-3 animate-spin text-emerald-600" />
              ) : (
                <Mic className="size-3 text-emerald-600" />
              )}
              Thu âm thử
            </Button>
          )}

          {onInsertToEditor && liveSegments.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInsertAll}
              className="h-7 text-[11px] font-bold text-blue-700 hover:bg-blue-50 border-blue-200 gap-1 px-2 rounded-lg"
              title="Chèn toàn bộ hội thoại vào biên bản"
            >
              <PlusCircle className="size-3 text-blue-600" />
              Chèn tất cả
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'size-7 p-0 rounded-lg',
              autoScroll ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-600'
            )}
            title={autoScroll ? 'Đang tự cuộn theo giọng nói' : 'Bật tự cuộn'}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm trong transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-slate-50/70 border-slate-200 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      {/* Transcript Stream List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {!hasSession && !isLoading && !isRecording && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 h-full gap-3">
            <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Radio className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Chưa có phiên ghi âm trực tiếp</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                Bấm nút <b>"Thu âm thử"</b> ở trên để nói qua Mic bóc băng ngay, hoặc dùng <b>Meetly Chrome Extension</b> khi họp Google Meet.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isInitializing}
              onClick={startRecording}
              className="mt-1 h-8 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1.5 px-3 rounded-xl shadow-2xs"
            >
              <Mic className="size-3.5 text-emerald-600" />
              Bật Mic thu âm thử ngay
            </Button>
          </div>
        )}

        {isRecording && liveSegments.length === 0 && !partialText && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 h-full gap-2">
            <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-pulse">
              <Mic className="size-5" />
            </div>
            <p className="text-xs font-bold text-emerald-700">Đang lắng nghe từ Microphone...</p>
            <p className="text-[11px] text-slate-400 max-w-[240px]">
              Hãy nói một câu tiếng Việt vào mic, chữ sẽ chạy trực tiếp ra màn hình!
            </p>
          </div>
        )}

        {filteredSegments.length === 0 && hasSession && !partialText && (
          <div className="text-center py-12 text-slate-400 text-xs">
            {isLoading ? 'Đang tải transcript...' : 'Chưa có lời thoại nào được ghi nhận.'}
          </div>
        )}

        {filteredSegments.map((seg) => {
          const isActive =
            currentTimeMs >= seg.start_ms && currentTimeMs <= seg.end_ms;

          return (
            <div
              key={seg.id}
              className={cn(
                'group p-2.5 rounded-xl border transition-all text-left flex flex-col gap-1',
                isActive
                  ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                  : 'bg-slate-50/40 hover:bg-slate-100/60 border-slate-100'
              )}
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const speaker = getSpeakerDisplay(seg.speaker_label);
                    return (
                      <span
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px]',
                          speaker.badgeClass
                        )}
                      >
                        <User className="size-2.5 shrink-0" />
                        <span>{speaker.name}</span>
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => onSeek?.(seg.start_ms)}
                    className="font-mono text-[10px] text-blue-600 hover:underline bg-white px-1.5 py-0.5 rounded border border-slate-200"
                    title="Bấm để tua âm thanh tới thời điểm này"
                  >
                    {formatMs(seg.start_ms)}
                  </button>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(seg.text, seg.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-white"
                    title="Sao chép câu nói"
                  >
                    {copiedId === seg.id ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>

                  {onInsertToEditor && (
                    <button
                      type="button"
                      onClick={() =>
                        onInsertToEditor(
                          `[${formatMs(seg.start_ms)}] ${
                            getSpeakerDisplay(seg.speaker_label).name
                          }: ${seg.text}${seg.translation ? `\n   -> ${seg.translation}` : ''}`
                        )
                      }
                      className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100"
                      title="Chèn câu này vào biên bản"
                    >
                      <PlusCircle className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed select-text font-normal">
                {seg.text}
              </p>
              {seg.translation && (
                <div className="flex items-start gap-1.5 pt-1 mt-0.5 border-t border-slate-100/80 text-[11px] text-indigo-700 font-medium">
                  <Languages className="size-3 text-indigo-500 mt-0.5 shrink-0" />
                  <span className="italic leading-relaxed">{seg.translation}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming Partial Utterance */}
        {partialText && (
          <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col gap-1 animate-pulse">
            <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold">
              <Sparkles className="size-3" />
              <span>
                Đang nhận dạng ({getSpeakerDisplay(partialSpeaker).name})...
              </span>
            </div>
            <p className="text-xs text-blue-950 italic leading-relaxed">
              {partialText}
            </p>
            {partialTranslation && (
              <div className="flex items-start gap-1.5 pt-1 mt-0.5 border-t border-blue-100 text-[11px] text-indigo-700 font-medium">
                <Languages className="size-3 text-indigo-500 mt-0.5 shrink-0" />
                <span className="italic leading-relaxed">{partialTranslation}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
