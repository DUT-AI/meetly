'use client';

import {
  ArrowDown,
  Check,
  Clock,
  Copy,
  Download,
  Filter,
  Headphones,
  Languages,
  Loader2,
  Mic,
  PlusCircle,
  Radio,
  Search,
  Sparkles,
  Square,
  User,
  Volume2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { useGetTranscripts } from '../api/use-get-transcripts';
import { useTranscriptionSubscriber } from '../api/use-transcription-subscriber';
import { useDirectMicStreaming } from '../hooks/use-direct-mic-streaming';
import { TranscriptSegment } from '../types';
import { AudioTimelinePlayer, AudioTimelinePlayerRef } from './audio-timeline-player';

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
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('ALL');
  const [showTranslation, setShowTranslation] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<AudioTimelinePlayerRef | null>(null);
  const [activePlayerTimeMs, setActivePlayerTimeMs] = useState<number>(currentTimeMs);

  // 1. Initial history from REST API
  const { data: transcriptsData, isLoading } = useGetTranscripts(workspaceId, meetingId);

  // 2. Real-time updates from WebSocket
  const subscriber = useTranscriptionSubscriber({
    workspaceId,
    meetingId,
    initialSegments: transcriptsData?.segments,
  });

  // 3. Direct browser microphone streaming
  const { isRecording, isInitializing, startRecording, stopRecording } = useDirectMicStreaming({
    workspaceId,
    meetingId,
    onSessionCreated: (session) => {
      if (session.subscriber_ticket) {
        subscriber.connectToSession(session.session_id, session.subscriber_ticket);
      }
    },
  });

  const { segments: liveSegments, partialText, partialTranslation, partialSpeaker, isConnected, sessionStatus } = subscriber;

  // Extract unique speakers list for filtering
  const uniqueSpeakers = useMemo(() => {
    const set = new Set<string>();
    liveSegments.forEach((s) => {
      if (s.speaker_label) set.add(s.speaker_label);
    });
    return Array.from(set);
  }, [liveSegments]);

  // Filtered segments
  const filteredSegments = useMemo(() => {
    return liveSegments.filter((s) => {
      const matchesSearch =
        !searchQuery.trim() ||
        s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.translation && s.translation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.speaker_label && s.speaker_label.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSpeaker = selectedSpeaker === 'ALL' || s.speaker_label === selectedSpeaker;

      return matchesSearch && matchesSpeaker;
    });
  }, [liveSegments, searchQuery, selectedSpeaker]);

  // Auto-scroll to bottom when new segments or partial text arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
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
        avatarChar: '?',
        isLocal: false,
        bgGradient: 'from-slate-500 to-slate-700',
        badgeClass: 'text-slate-700 bg-slate-100 border-slate-200',
        cardBorder: 'border-slate-200',
      };
    }
    if (label === 'LOCAL_USER') {
      return {
        name: 'Bạn (Microphone)',
        avatarChar: 'B',
        isLocal: true,
        bgGradient: 'from-purple-600 to-indigo-600',
        badgeClass: 'text-purple-700 bg-purple-50 border-purple-200 font-semibold',
        cardBorder: 'border-purple-200/80 bg-purple-50/20',
      };
    }
    if (label === 'REMOTE_SPEAKER') {
      return {
        name: 'Người tham gia',
        avatarChar: 'P',
        isLocal: false,
        bgGradient: 'from-blue-600 to-cyan-600',
        badgeClass: 'text-blue-700 bg-blue-50 border-blue-200 font-medium',
        cardBorder: 'border-blue-200/80 bg-blue-50/20',
      };
    }
    // Dynamic name from Google Meet (e.g. "Phước Nguyễn")
    return {
      name: label,
      avatarChar: label.charAt(0).toUpperCase(),
      isLocal: false,
      bgGradient: 'from-emerald-600 to-teal-600',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold',
      cardBorder: 'border-emerald-200/80 bg-emerald-50/20',
    };
  };

  const handleCopySingle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Đã sao chép đoạn hội thoại');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (liveSegments.length === 0) return;
    const formatted = liveSegments
      .map(
        (s) =>
          `[${formatMs(s.start_ms)}] ${getSpeakerDisplay(s.speaker_label).name}:\n${s.text}${
            s.translation ? `\n(Dịch EN: ${s.translation})` : ''
          }`,
      )
      .join('\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    toast.success('Đã sao chép toàn bộ transcript vào clipboard');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (liveSegments.length === 0) {
      toast.info('Chưa có nội dung transcript để tải xuống');
      return;
    }
    const formatted = liveSegments
      .map(
        (s) =>
          `[${formatMs(s.start_ms)} - ${formatMs(s.end_ms)}] ${
            getSpeakerDisplay(s.speaker_label).name
          }:\n${s.text}${s.translation ? `\n-> Translation: ${s.translation}` : ''}\n`,
      )
      .join('\n');

    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_transcript_${meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống file transcript .txt');
  };

  const handleInsertAll = () => {
    if (!onInsertToEditor || liveSegments.length === 0) return;
    const formatted = liveSegments
      .map(
        (s) =>
          `[${formatMs(s.start_ms)}] ${getSpeakerDisplay(s.speaker_label).name}: ${s.text}${
            s.translation ? `\n   -> ${s.translation}` : ''
          }`,
      )
      .join('\n\n');
    onInsertToEditor(formatted);
  };

  const handleInternalSeek = (startMs: number) => {
    setActivePlayerTimeMs(startMs);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(startMs);
    }
    onSeek?.(startMs);
  };

  const hasSession = !!transcriptsData?.session || liveSegments.length > 0;
  const recordingUrl = transcriptsData?.recording_url;

  return (
    <div className={cn('flex flex-col bg-transparent rounded-2xl min-h-[680px] w-full gap-4', className)}>
      {/* ── 1. Top Action & Status Control Bar ── */}
      <div className="p-4 bg-white rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status & Metrics */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-2xs">
            <span
              className={cn(
                'size-2.5 rounded-full',
                isConnected
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500 animate-pulse'
                  : isRecording
                    ? 'bg-amber-500 animate-pulse'
                    : hasSession
                      ? 'bg-blue-500'
                      : 'bg-slate-300',
              )}
            />
            <span className="text-xs font-bold text-slate-800">
              {isConnected
                ? 'WebSocket Realtime Kết nối'
                : isRecording
                  ? 'Đang phát sóng ghi âm...'
                  : hasSession
                    ? 'Đã tải dữ liệu hội thoại'
                    : 'Chưa bắt đầu phiên'}
            </span>
          </div>

          <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 bg-slate-50 border-slate-200 text-slate-700">
            {liveSegments.length} câu thoại
          </Badge>

          {sessionStatus && sessionStatus !== 'IDLE' && (
            <Badge
              variant="secondary"
              className={cn(
                'text-[11px] uppercase font-bold px-2.5 py-1 tracking-wider',
                sessionStatus === 'STREAMING'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse'
                  : 'bg-blue-100 text-blue-800 border-blue-200',
              )}
            >
              {sessionStatus}
            </Badge>
          )}
        </div>

        {/* Right Controls: Direct Mic, Copy, Download, Insert */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Mic Streaming Action */}
          {isRecording ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="h-9 text-xs font-bold gap-2 px-4 rounded-xl shadow-xs animate-pulse bg-red-600 hover:bg-red-700"
            >
              <Square className="size-3.5 fill-current" />
              Dừng ghi âm Mic
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isInitializing}
              onClick={startRecording}
              className="h-9 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-2 px-4 rounded-xl shadow-2xs"
            >
              {isInitializing ? (
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
              ) : (
                <Mic className="size-3.5 text-emerald-600" />
              )}
              Bật Mic thu âm trực tiếp
            </Button>
          )}

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Translation Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTranslation(!showTranslation)}
            className={cn(
              'h-9 text-xs font-bold gap-1.5 px-3 rounded-xl border-slate-200',
              showTranslation ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-600 hover:bg-slate-100',
            )}
            title="Bật/Tắt hiển thị bản dịch tiếng Anh"
          >
            <Languages className="size-3.5 text-indigo-600" />
            <span>{showTranslation ? 'Bản dịch EN: Bật' : 'Bản dịch EN: Tắt'}</span>
          </Button>

          {/* Copy All */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            disabled={liveSegments.length === 0}
            className="h-9 text-xs font-bold text-slate-700 hover:bg-slate-100 border-slate-200 gap-1.5 px-3 rounded-xl"
            title="Sao chép toàn bộ nội dung transcript"
          >
            {copiedAll ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-slate-600" />}
            <span>{copiedAll ? 'Đã chép' : 'Sao chép tất cả'}</span>
          </Button>

          {/* Download TXT */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTxt}
            disabled={liveSegments.length === 0}
            className="h-9 text-xs font-bold text-slate-700 hover:bg-slate-100 border-slate-200 gap-1.5 px-3 rounded-xl"
            title="Tải transcript về máy (.txt)"
          >
            <Download className="size-3.5 text-slate-600" />
            <span>Tải .TXT</span>
          </Button>

          {/* Insert All to Editor */}
          {onInsertToEditor && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInsertAll}
              disabled={liveSegments.length === 0}
              className="h-9 text-xs font-bold text-blue-700 hover:bg-blue-50 border-blue-200 gap-1.5 px-3.5 rounded-xl shadow-2xs"
              title="Chèn toàn bộ hội thoại vào biên bản cuộc họp"
            >
              <PlusCircle className="size-3.5 text-blue-600" />
              <span>Chèn vào biên bản</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Audio Timeline Player Bar (If audio recording is available) ── */}
      {recordingUrl && (
        <div className="p-4 bg-slate-900 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
            <Headphones className="size-4 text-blue-400" />
            <span>Phát lại ghi âm đồng bộ dòng thoại:</span>
          </div>
          <AudioTimelinePlayer
            ref={audioPlayerRef}
            audioUrl={recordingUrl}
            onTimeUpdate={(t) => {
              setActivePlayerTimeMs(t);
              onSeek?.(t);
            }}
          />
        </div>
      )}

      {/* ── 3. Filters & Search Bar Row ── */}
      <div className="p-3.5 bg-white rounded-2xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm từ khóa trong transcript hoặc bản dịch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs bg-slate-50/80 border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Speaker Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="size-3" />
            Lọc:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSpeaker('ALL')}
            className={cn(
              'text-xs font-bold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap',
              selectedSpeaker === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            )}
          >
            Tất cả ({liveSegments.length})
          </button>
          {uniqueSpeakers.map((spk) => {
            const spkInfo = getSpeakerDisplay(spk);
            const count = liveSegments.filter((s) => s.speaker_label === spk).length;
            return (
              <button
                key={spk}
                type="button"
                onClick={() => setSelectedSpeaker(spk)}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap',
                  selectedSpeaker === spk
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                )}
              >
                {spkInfo.name} ({count})
              </button>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'h-8 px-2.5 rounded-xl text-xs font-bold gap-1 ml-auto shrink-0',
              autoScroll ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'text-slate-400 hover:text-slate-600',
            )}
            title={autoScroll ? 'Đang tự cuộn theo lời thoại mới' : 'Bật tự cuộn'}
          >
            <ArrowDown className="size-3.5" />
            <span className="hidden sm:inline">Tự cuộn</span>
          </Button>
        </div>
      </div>

      {/* ── 4. Main Conversational Transcript Stream ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3.5 max-h-[720px] min-h-[450px] pr-1">
        {/* Empty State: Not recording & No session */}
        {!hasSession && !isLoading && !isRecording && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-full gap-4 max-w-lg mx-auto">
            <div className="size-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <Radio className="size-8" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Chưa có phiên bóc băng trực tiếp</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bạn có thể bấm nút <b>"Bật Mic thu âm trực tiếp"</b> ở trên để nói thử vào microphone và xem AI chuyển giọng nói thành văn
                bản thời gian thực kèm dịch tiếng Anh, hoặc sử dụng <b>Meetly Extension</b> khi họp trên Google Meet.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isInitializing}
              onClick={startRecording}
              className="mt-2 h-10 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-2 px-5 rounded-xl shadow-xs"
            >
              <Mic className="size-4 text-emerald-600" />
              Bật Mic thu âm ngay
            </Button>
          </div>
        )}

        {/* Empty State: Recording active but no speech captured yet */}
        {isRecording && liveSegments.length === 0 && !partialText && (
          <div className="flex flex-col items-center justify-center p-16 text-center text-slate-500 h-full gap-3 max-w-md mx-auto">
            <div className="size-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-pulse shadow-sm">
              <Mic className="size-8 animate-bounce" />
            </div>
            <h4 className="text-sm font-extrabold text-emerald-800">Đang lắng nghe Microphone...</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hãy nói một câu tiếng Việt vào mic. Hệ thống sẽ ngay lập tức nhận diện và hiển thị chữ chạy trực tiếp ra màn hình!
            </p>
          </div>
        )}

        {/* Filter Zero State */}
        {filteredSegments.length === 0 && hasSession && !partialText && (
          <div className="text-center py-16 text-slate-400 text-xs">
            {searchQuery ? `Không tìm thấy kết quả nào khớp với "${searchQuery}"` : 'Chưa có câu thoại nào từ người nói này.'}
          </div>
        )}

        {/* Segment Cards List */}
        {filteredSegments.map((seg) => {
          const speaker = getSpeakerDisplay(seg.speaker_label);
          const isPlayingThis = activePlayerTimeMs >= seg.start_ms && activePlayerTimeMs <= seg.end_ms;

          return (
            <div
              key={seg.id}
              className={cn(
                'group relative rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs',
                isPlayingThis
                  ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/20 shadow-xs'
                  : 'bg-white hover:bg-slate-50/90 border-slate-200/80 hover:border-slate-300',
              )}
            >
              {/* Card Header: Avatar, Speaker Name, Timestamp, Actions */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  {/* Speaker Avatar Icon */}
                  <div
                    className={cn(
                      'size-7 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0',
                      speaker.bgGradient,
                    )}
                  >
                    {speaker.avatarChar}
                  </div>

                  {/* Speaker Name Badge */}
                  <span className={cn('px-2.5 py-0.5 rounded-lg border text-xs font-semibold', speaker.badgeClass)}>{speaker.name}</span>

                  {/* Interactive Audio Timestamp Chip */}
                  <button
                    type="button"
                    onClick={() => handleInternalSeek(seg.start_ms)}
                    className="flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-lg transition-all"
                    title="Bấm để phát âm thanh từ mốc thời gian này"
                  >
                    <Clock className="size-3" />
                    <span>{formatMs(seg.start_ms)}</span>
                  </button>
                </div>

                {/* Floating Quick Action Toolbar */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 border border-slate-200 p-0.5 rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleCopySingle(seg.text, seg.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all"
                    title="Sao chép câu nói"
                  >
                    {copiedId === seg.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>

                  {onInsertToEditor && (
                    <button
                      type="button"
                      onClick={() => {
                        onInsertToEditor(
                          `[${formatMs(seg.start_ms)}] ${speaker.name}: ${seg.text}${seg.translation ? `\n   -> ${seg.translation}` : ''}`,
                        );
                        toast.success('Đã chèn câu thoại vào biên bản');
                      }}
                      className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-all"
                      title="Chèn câu này vào biên bản cuộc họp"
                    >
                      <PlusCircle className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Main Vietnamese Transcript Text */}
              <p className="text-sm text-slate-900 leading-relaxed font-normal select-text">{seg.text}</p>

              {/* English Translation Sub-Box */}
              {showTranslation && seg.translation && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-xs text-indigo-800 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60">
                  <Languages className="size-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-[11px] text-indigo-500 uppercase tracking-wider block mb-0.5">
                      Bản dịch tiếng Anh
                    </span>
                    <p className="italic leading-relaxed">{seg.translation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Streaming Partial Speech Live Card ── */}
        {partialText && (
          <div className="rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/70 p-4 sm:p-5 flex flex-col gap-2 animate-pulse shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <Sparkles className="size-4 text-blue-600 animate-spin" />
              <span>Đang bóc băng trực tiếp ({getSpeakerDisplay(partialSpeaker).name})...</span>
            </div>
            <p className="text-sm font-semibold text-blue-950 italic leading-relaxed">"{partialText}"</p>
            {showTranslation && partialTranslation && (
              <div className="mt-1 pt-2 border-t border-blue-200/80 flex items-start gap-2 text-xs text-indigo-700 font-medium">
                <Languages className="size-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <span className="italic">{partialTranslation}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
