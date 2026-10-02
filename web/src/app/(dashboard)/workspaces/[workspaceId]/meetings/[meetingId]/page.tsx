'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  Mic,
  Printer,
  Puzzle,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PageError } from '@/components/page-error';
import { PageLoader } from '@/components/page-loader';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { meetingApi } from '@/features/meetings/api/meeting-api';
import { useGetMeeting } from '@/features/meetings/api/use-get-meeting';
import { useUpdateMeeting } from '@/features/meetings/api/use-update-meeting';
import { MeetingReportEditor } from '@/features/meetings/components/meeting-report-editor';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import {
  AudioTimelinePlayer,
  AudioTimelinePlayerRef,
  LiveTranscriptPanel,
  OfflineAudioModal,
  SpeakerIdentificationModal,
  VoicebankModal,
  useGetTranscripts,
} from '@/features/transcription';
import { cn } from '@/lib/utils';

export default function MeetingReportPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const meetingId = params.meetingId as string;

  const queryClient = useQueryClient();
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [isVoicebankModalOpen, setIsVoicebankModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeeting(workspaceId, meetingId);
  const { data: membersResponse } = useGetMembers({ workspaceId });
  const { mutate: updateMeeting, isPending: isSaving } = useUpdateMeeting(workspaceId);
  const { data: transcriptsData } = useGetTranscripts(workspaceId, meetingId);

  const [pendingInsertion, setPendingInsertion] = useState<string | null>(null);

  const handleOfflineSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['meeting', workspaceId, meetingId] });
    queryClient.invalidateQueries({ queryKey: ['transcripts', workspaceId, meetingId] });
    setActiveTab('report');
  };

  const [activeTab, setActiveTab] = useState<string>('transcript');
  const [report, setReport] = useState<Record<string, any> | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const audioPlayerRef = useRef<AudioTimelinePlayerRef | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const serverUrl =
    typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://meetly.dutai.io.vn';

  const handleEditorReady = useCallback((editor: any) => {
    setEditorInstance(editor);
  }, []);

  const handleContentChange = useCallback((json: Record<string, any>) => {
    setReport(json);
  }, []);

  const [isSyncingTasks, setIsSyncingTasks] = useState(false);

  // Process pending insertion once editor instance is mounted and ready
  useEffect(() => {
    if (editorInstance && pendingInsertion && meeting?.id) {
      editorInstance.chain().focus('end').insertContent(pendingInsertion).run();
      const updatedJson = editorInstance.getJSON();
      setReport(updatedJson);
      updateMeeting({
        meetingId: meeting.id,
        payload: {
          report: updatedJson,
        },
      });
      setPendingInsertion(null);
      toast.success('Đã chèn nội dung vào biên bản cuộc họp');
    }
  }, [editorInstance, pendingInsertion, meeting?.id, updateMeeting]);

  const handleSyncTasks = async () => {
    if (!meeting?.id) return;
    try {
      setIsSyncingTasks(true);
      const res = await meetingApi.syncMeetingTasks(workspaceId, meeting.id);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['meeting', workspaceId, meetingId] });
      const count = res?.synced_count ?? res?.data?.length ?? 0;
      if (count > 0) {
        toast.success(`Đã đồng bộ ${count} công việc vào mục "Việc phòng ban"!`);
      } else {
        toast.info('Các công việc trong biên bản đã có trên bảng Việc phòng ban.');
      }
    } catch (err: any) {
      toast.error('Không thể đồng bộ công việc: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setIsSyncingTasks(false);
    }
  };

  if (isLoadingMeeting) return <PageLoader />;
  if (!meeting) return <PageError message="Không tìm thấy cuộc họp" />;

  const memberMap = Object.fromEntries((membersResponse?.documents ?? []).map((m) => [m.$id, m]));
  const detectedSpeakers = Array.from(new Set((transcriptsData?.segments ?? []).map((s) => s.speaker_label).filter(Boolean)));
  const formattedMembers = (membersResponse?.documents ?? []).map((m) => ({
    id: m.userId || m.$id,
    name: m.name,
  }));

  const handleSave = () => {
    const reportData = report ?? meeting.report ?? {};
    updateMeeting(
      {
        meetingId: meeting.id,
        payload: {
          report: reportData,
        },
      },
      {
        onSuccess: async () => {
          toast.success('Đã lưu biên bản cuộc họp');
          // Auto sync tasks to department board
          try {
            const res = await meetingApi.syncMeetingTasks(workspaceId, meeting.id);
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            if (res?.synced_count > 0) {
              toast.success(`Đã tự động tạo ${res.synced_count} công việc vào "Việc phòng ban"!`);
            }
          } catch {
            // silent ignore on auto-sync background
          }
        },
      },
    );
  };

  const handleInsertToEditor = (text: string) => {
    if (!text || !text.trim()) return;

    // Convert multi-line transcript turns into clean HTML paragraphs
    const paragraphs = text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const htmlToInsert = paragraphs || `<p>${text}</p>`;

    // Switch to Report tab so the user sees the inserted transcript immediately
    setActiveTab('report');

    if (editorInstance) {
      editorInstance.chain().focus('end').insertContent(htmlToInsert).run();
      const updatedJson = editorInstance.getJSON();
      setReport(updatedJson);

      // Auto-save to database so refreshing the page preserves the content
      updateMeeting({
        meetingId: meeting.id,
        payload: {
          report: updatedJson,
        },
      });
      toast.success('Đã chèn nội dung vào biên bản cuộc họp');
    } else {
      setPendingInsertion(htmlToInsert);
      toast.info('Đang chuyển sang tab Biên bản cuộc họp...');
    }
  };

  const handleSeek = (timeMs: number) => {
    audioPlayerRef.current?.seekTo(timeMs);
  };

  const durationMinutes = Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000);

  const segmentCount = transcriptsData?.segments?.length || 0;

  const getMeetingStatus = () => {
    const status = (meeting.status || '').toUpperCase();
    if (status === 'SCHEDULED' || status === 'UPCOMING') {
      return { label: 'Sắp diễn ra', className: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
    if (status === 'IN_PROGRESS' || status === 'ONGOING' || status === 'STREAMING') {
      return { label: 'Đang diễn ra', className: 'text-emerald-700 bg-emerald-50 border-emerald-200 animate-pulse' };
    }
    if (status === 'COMPLETED' || status === 'FINISHED' || status === 'ENDED') {
      return { label: 'Đã kết thúc', className: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
    if (status === 'CANCELLED') {
      return { label: 'Đã hủy', className: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (meeting.status) {
      return { label: meeting.status, className: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
    const now = new Date().getTime();
    const start = new Date(meeting.start_time).getTime();
    const end = new Date(meeting.end_time).getTime();
    if (now < start) {
      return { label: 'Sắp diễn ra', className: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
    if (now >= start && now <= end) {
      return { label: 'Đang diễn ra', className: 'text-emerald-700 bg-emerald-50 border-emerald-200 animate-pulse' };
    }
    return { label: 'Đã kết thúc', className: 'text-slate-600 bg-slate-100 border-slate-200' };
  };

  const meetingStatus = getMeetingStatus();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Đã sao chép ${key}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* ── Top Navigation Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 print:hidden no-print">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspaces/${workspaceId}/meetings`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 transition-all shadow-2xs"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Về Lịch cuộc họp</span>
          </Link>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 truncate max-w-lg">{meeting.title}</h1>
              <span className={cn('text-[11px] font-bold border px-2.5 py-0.5 rounded-full shrink-0', meetingStatus.className)}>
                {meetingStatus.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-slate-400" />
                {format(parseISO(meeting.start_time), 'dd/MM/yyyy', { locale: vi })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-slate-400" />
                {format(parseISO(meeting.start_time), 'HH:mm')} - {format(parseISO(meeting.end_time), 'HH:mm')} ({durationMinutes} phút)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          <Button
            size="sm"
            onClick={() => setIsOfflineModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1.5 text-xs font-bold h-9 shadow-md shadow-blue-500/20"
          >
            <Mic className="size-3.5" />
            <span>Họp Offline / Ghi Âm</span>
            <Badge variant="secondary" className="text-[9px] bg-white/20 text-white border-0 py-0 px-1">
              AI 3B
            </Badge>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSpeakerModalOpen(true)}
            className="rounded-xl border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-50 gap-1.5 text-xs font-bold h-9 shadow-2xs"
          >
            <Users className="size-3.5 text-purple-600" />
            <span className="hidden sm:inline">Phân Vai Diễn Giả</span>
            <span className="sm:hidden">Diễn Giả</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVoicebankModalOpen(true)}
            className="rounded-xl border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 gap-1.5 text-xs font-bold h-9 shadow-2xs"
          >
            <Sparkles className="size-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Voicebank</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExtensionModalOpen(true)}
            className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 text-xs font-bold h-9 shadow-2xs"
          >
            <Puzzle className="size-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cấu hình Extension</span>
            <span className="sm:hidden">Extension</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 text-xs font-bold h-9 bg-white shadow-2xs"
          >
            <Printer className="size-3.5" />
            <span>In / Xuất PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncTasks}
            disabled={isSyncingTasks}
            className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 gap-1.5 text-xs font-bold h-9 shadow-2xs"
          >
            <CheckSquare className="size-3.5 text-emerald-600" />
            <span>{isSyncingTasks ? 'Đang đồng bộ...' : 'Đồng bộ Việc phòng ban'}</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl shadow-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-extrabold transition-all h-9 px-4"
          >
            <Save className="size-3.5" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu biên bản'}</span>
          </Button>
        </div>
      </div>

      {/* ── Main Tabbed Content Workspace ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-6">
        {/* Top-Level Large Tab Switcher */}
        <div className="flex items-center justify-between print:hidden no-print">
          <TabsList className="p-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xs h-auto flex flex-wrap gap-1">
            <TabsTrigger
              value="transcript"
              className="rounded-xl text-xs sm:text-sm font-extrabold gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all shadow-2xs"
            >
              <Sparkles className="size-4" />
              <span>Transcript & Bóc băng trực tiếp</span>
              {segmentCount > 0 && (
                <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  {segmentCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="report"
              className="rounded-xl text-xs sm:text-sm font-extrabold gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all shadow-2xs"
            >
              <FileText className="size-4" />
              <span>Biên bản cuộc họp (Report)</span>
            </TabsTrigger>

            <TabsTrigger
              value="attendees"
              className="rounded-xl text-xs sm:text-sm font-extrabold gap-2 px-4 sm:px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all shadow-2xs"
            >
              <Users className="size-4" />
              <span>Thành viên ({meeting.participants?.length || 0})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab 1: Large Dedicated Full-Width Transcript View ── */}
        <TabsContent value="transcript" forceMount={true} className={cn('m-0 flex flex-col gap-4', activeTab !== 'transcript' && 'hidden')}>
          <LiveTranscriptPanel
            workspaceId={workspaceId}
            meetingId={meetingId}
            currentTimeMs={currentTimeMs}
            onSeek={handleSeek}
            onInsertToEditor={handleInsertToEditor}
            className="w-full"
          />
        </TabsContent>

        {/* ── Tab 2: Google Docs Paper Meeting Report Editor ── */}
        <TabsContent
          value="report"
          forceMount={true}
          className={cn('m-0 flex justify-center items-start', activeTab !== 'report' && 'hidden')}
        >
          <div className="bg-white border border-slate-300/90 shadow-md rounded-xs w-full max-w-[900px] min-h-[1100px] p-8 sm:p-16 my-2 transition-all printable-paper">
            {/* Formal Document Title Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-8">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">BIÊN BẢN CUỘC HỌP CHÍNH THỨC</div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">{meeting.title}</h1>

              {/* Formal Document Meta Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-200 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-slate-500" />
                  <span>{format(parseISO(meeting.start_time), 'dd/MM/yyyy (EEEE)', { locale: vi })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-slate-500" />
                  <span>
                    {format(parseISO(meeting.start_time), 'HH:mm')} → {format(parseISO(meeting.end_time), 'HH:mm')} ({durationMinutes}p)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-slate-500" />
                  <span>{meeting.participants?.length || 0} Thành viên tham gia</span>
                </div>
              </div>
            </div>

            {/* TipTap Rich Text Editor Body */}
            <MeetingReportEditor
              initialContent={meeting.report || {}}
              onContentChange={handleContentChange}
              onEditorReady={handleEditorReady}
            />
          </div>
        </TabsContent>

        {/* ── Tab 3: Attendees & Participants Grid ── */}
        <TabsContent value="attendees" forceMount={true} className={cn('m-0', activeTab !== 'attendees' && 'hidden')}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="size-5 text-blue-600" />
                  Danh sách thành viên tham gia cuộc họp
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tổng cộng {meeting.participants?.length || 0} thành viên được mời vào cuộc họp này.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(meeting.participants ?? []).map((pid) => {
                const m = memberMap[pid];
                if (!m) return null;
                return (
                  <div
                    key={pid}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <MemberAvatar name={m.name} image={m.avatar_url ?? m.avatarUrl} className="size-11 ring-2 ring-blue-100 shrink-0" />
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-sm font-bold text-slate-900 truncate">{m.name}</span>
                        <span className="text-xs text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1">
                          <Mail className="size-3 text-slate-400" />
                          {m.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Có mặt
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Chrome Extension Configuration Modal ── */}
      <ResponsiveModal
        open={isExtensionModalOpen}
        onOpenChange={setIsExtensionModalOpen}
        title="Cấu hình Meetly Chrome Extension"
        description="Thông tin kết nối cuộc họp Google Meet với Meetly"
      >
        <div className="bg-white p-6 rounded-2xl flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Puzzle className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Kết nối Google Meet Extension</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dán các thông tin dưới đây vào Popup Extension trên Google Meet để tự động ghi âm & bóc băng
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Máy chủ Meetly (API):</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={serverUrl}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 w-full select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(serverUrl, 'Server URL')}
                  className="h-8.5 px-3 shrink-0 rounded-xl border-slate-200 gap-1 text-xs font-medium hover:bg-slate-100"
                >
                  {copiedKey === 'Server URL' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>Sao chép</span>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Workspace ID:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={workspaceId}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 w-full select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(workspaceId, 'Workspace ID')}
                  className="h-8.5 px-3 shrink-0 rounded-xl border-slate-200 gap-1 text-xs font-medium hover:bg-slate-100"
                >
                  {copiedKey === 'Workspace ID' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>Sao chép</span>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Meeting ID:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={meetingId}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 w-full select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(meetingId, 'Meeting ID')}
                  className="h-8.5 px-3 shrink-0 rounded-xl border-slate-200 gap-1 text-xs font-medium hover:bg-slate-100"
                >
                  {copiedKey === 'Meeting ID' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>Sao chép</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-1">💡 3 Bước ghi âm Google Meet:</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-800">
              <li>
                Mở icon <strong>Meetly</strong> trên thanh tiện ích Chrome.
              </li>
              <li>
                Dán <strong>Workspace ID</strong> & <strong>Meeting ID</strong> ở trên vào Extension Popup.
              </li>
              <li>
                Vào phòng họp Google Meet và bấm <strong>Bắt đầu ghi âm</strong> trên bảng điều khiển nổi.
              </li>
            </ol>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={() => setIsExtensionModalOpen(false)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5"
            >
              Đóng
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* ── Offline Meeting Modals ── */}
      <OfflineAudioModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        workspaceId={workspaceId}
        meetingId={meetingId}
        onSuccess={handleOfflineSuccess}
      />

      <SpeakerIdentificationModal
        isOpen={isSpeakerModalOpen}
        onClose={() => setIsSpeakerModalOpen(false)}
        workspaceId={workspaceId}
        meetingId={meetingId}
        speakers={detectedSpeakers}
        members={formattedMembers}
        onSuccess={handleOfflineSuccess}
      />

      <VoicebankModal
        isOpen={isVoicebankModalOpen}
        onClose={() => setIsVoicebankModalOpen(false)}
        workspaceId={workspaceId}
        members={formattedMembers}
      />
    </div>
  );
}
