'use client';

import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Printer,
  Save,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

import { PageError } from '@/components/page-error';
import { PageLoader } from '@/components/page-loader';
import { Button } from '@/components/ui/button';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { useGetMeeting } from '@/features/meetings/api/use-get-meeting';
import { useUpdateMeeting } from '@/features/meetings/api/use-update-meeting';
import { MeetingReportEditor } from '@/features/meetings/components/meeting-report-editor';
import {
  AudioTimelinePlayer,
  AudioTimelinePlayerRef,
  LiveTranscriptPanel,
  useGetTranscripts,
} from '@/features/transcription';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function MeetingReportPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const meetingId = params.meetingId as string;

  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeeting(workspaceId, meetingId);
  const { data: membersResponse } = useGetMembers({ workspaceId });
  const { mutate: updateMeeting, isPending: isSaving } = useUpdateMeeting(workspaceId);
  const { data: transcriptsData } = useGetTranscripts(workspaceId, meetingId);

  const [report, setReport] = useState<Record<string, any> | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const audioPlayerRef = useRef<AudioTimelinePlayerRef | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);

  if (isLoadingMeeting) return <PageLoader />;
  if (!meeting) return <PageError message="Không tìm thấy cuộc họp" />;

  const memberMap = Object.fromEntries(
    (membersResponse?.documents ?? []).map((m) => [m.$id, m])
  );

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
        onSuccess: () => {
          toast.success('Đã lưu biên bản cuộc họp');
        },
      }
    );
  };

  const handleInsertToEditor = (text: string) => {
    if (editorInstance) {
      editorInstance.chain().focus().insertContent(`<p>${text}</p>`).run();
      toast.success('Đã chèn nội dung vào biên bản');
    } else {
      toast.info('Trình soạn thảo chưa sẵn sàng');
    }
  };

  const handleSeek = (timeMs: number) => {
    audioPlayerRef.current?.seekTo(timeMs);
  };

  const durationMinutes = Math.round(
    (new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-200/60 font-sans">
      {/* ── Top Google Docs Navigation Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-2xs print:hidden no-print">
        <div className="flex items-center gap-4">
          <Link
            href={`/workspaces/${workspaceId}/meetings`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-all"
          >
            <ArrowLeft className="size-4" />
            Về Lịch cuộc họp
          </Link>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-blue-600 shrink-0" />
              <h1 className="text-sm font-extrabold text-slate-900 truncate max-w-md">
                {meeting.title}
              </h1>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Biên bản cuộc họp
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Tự động đồng bộ • {format(parseISO(meeting.start_time), 'dd/MM/yyyy HH:mm', { locale: vi })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 text-xs font-bold h-9"
          >
            <Printer className="size-3.5" />
            In / Xuất PDF
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl shadow-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-extrabold transition-all h-9"
          >
            <Save className="size-3.5" />
            {isSaving ? 'Đang lưu...' : 'Lưu biên bản'}
          </Button>
        </div>
      </div>

      {/* ── Main Google Docs Paper Workspace ── */}
      <div className="flex-1 w-full max-w-[1500px] mx-auto p-4 sm:p-8 flex justify-center items-start gap-6 print:p-0 print:m-0">
        {/* Center Google Docs Paper Sheet */}
        <div className="bg-white border border-slate-300/80 shadow-md rounded-xs w-full max-w-[850px] min-h-[1100px] p-8 sm:p-16 my-2 transition-all printable-paper">
          {/* Formal Document Title Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              BIÊN BẢN CUỘC HỌP CHÍNH THỨC
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">
              {meeting.title}
            </h1>

            {/* Formal Document Meta Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-200 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-slate-500" />
                <span>{format(parseISO(meeting.start_time), 'dd/MM/yyyy (EEEE)', { locale: vi })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-slate-500" />
                <span>
                  {format(parseISO(meeting.start_time), 'HH:mm')} → {format(parseISO(meeting.end_time), 'HH:mm')} ({durationMinutes}p)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-slate-500" />
                <span>{meeting.participants?.length || 0} Thành viên tham gia</span>
              </div>
            </div>
          </div>

          {/* TipTap Rich Text Editor Body */}
          <MeetingReportEditor
            initialContent={meeting.report || {}}
            onContentChange={(json) => setReport(json)}
            onEditorReady={(editor) => setEditorInstance(editor)}
          />
        </div>

        {/* Right Sidebar: Tabs for Transcript & Audio or Meeting Info */}
        <div className="w-[420px] hidden xl:flex flex-col gap-4 sticky top-20 print:hidden no-print">
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <TabsTrigger value="transcript" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Sparkles className="size-3.5" />
                Transcript & Âm thanh
              </TabsTrigger>
              <TabsTrigger value="attendees" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Users className="size-3.5" />
                Thành viên ({meeting.participants?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-3 flex flex-col gap-3">
              {transcriptsData?.recording_url && (
                <AudioTimelinePlayer
                  ref={audioPlayerRef}
                  audioUrl={transcriptsData.recording_url}
                  onTimeUpdate={setCurrentTimeMs}
                />
              )}
              <LiveTranscriptPanel
                workspaceId={workspaceId}
                meetingId={meetingId}
                currentTimeMs={currentTimeMs}
                onSeek={handleSeek}
                onInsertToEditor={handleInsertToEditor}
              />
            </TabsContent>

            <TabsContent value="attendees" className="mt-3">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Users className="size-4 text-blue-600" />
                  Thành viên tham dự ({meeting.participants?.length || 0})
                </h4>

                <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-1">
                  {(meeting.participants ?? []).map((pid) => {
                    const m = memberMap[pid];
                    if (!m) return null;
                    return (
                      <div key={pid} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <MemberAvatar name={m.name} image={m.avatar_url ?? m.avatarUrl} className="size-8 ring-2 ring-blue-100 shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 truncate">{m.name}</span>
                          <span className="text-[11px] text-slate-500 font-medium truncate">{m.email}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
