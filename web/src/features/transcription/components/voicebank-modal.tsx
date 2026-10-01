'use client';

import {
  CheckCircle2,
  Database,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  User,
  Users,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ResponsiveModal } from '@/components/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { transcriptionApi } from '../api/transcription-api';

interface VoicebankModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  members: Array<{ id: string; name: string }>;
}

export function VoicebankModal({
  isOpen,
  onClose,
  workspaceId,
  members,
}: VoicebankModalProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Enrollment state
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const res = await transcriptionApi.getVoicebank(workspaceId);
      setProfiles(res || []);
    } catch (err) {
      toast.error('Không thể tải danh sách Ngân hàng Giọng nói');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen, workspaceId]);

  const startRecording = async () => {
    if (!selectedMemberId) {
      toast.error('Vui lòng chọn thành viên trước khi thu âm mẫu giọng');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 6) {
            stopRecording();
            return 6;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error('Không thể truy cập microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleEnroll = async () => {
    if (!selectedMemberId || !recordedBlob) {
      toast.error('Vui lòng chọn thành viên và thu âm mẫu giọng');
      return;
    }

    const member = members.find((m) => m.id === selectedMemberId);
    const memberName = member?.name || 'Thành viên';

    const file = new File([recordedBlob], `voice_sample_${selectedMemberId}.wav`, {
      type: 'audio/wav',
    });

    setIsEnrolling(true);
    try {
      await transcriptionApi.enrollVoice(workspaceId, selectedMemberId, memberName, file);
      toast.success(`Đã đăng ký thành công mẫu giọng nói cho "${memberName}"!`);
      setRecordedBlob(null);
      setRecordingSeconds(0);
      fetchProfiles();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Lỗi khi đăng ký mẫu giọng.');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Ngân Hàng Giọng Nói Thành Viên"
      description="Quản lý và đăng ký vector đặc trưng giọng nói (Centroid Voicebank) của thành viên workspace."
    >
      <div className="p-6 max-h-[85vh] overflow-y-auto space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Ngân Hàng Giọng Nói Thành Viên (Centroid Voicebank)
            </h2>
            <p className="text-sm text-muted-foreground">
              Lưu trữ vector âm học (192-dim ECAPA-TDNN) đại diện cho giọng nói của từng thành viên trong Workspace để nhận diện tự động.
            </p>
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-indigo-600" />
            Đăng Ký Mẫu Giọng Nói Mới (5 giây)
          </h4>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Chọn thành viên:</label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Chọn thành viên để thu âm..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-card rounded-xl border text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Mẫu câu đọc thử:</p>
            <p className="italic">
              &quot;Tôi là thành viên của Meetly, đang thực hiện đăng ký mẫu nhận diện giọng nói cho các cuộc họp offline.&quot;
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            {isRecording ? (
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-xs font-mono font-bold text-red-500">
                  Đang thu: 00:0{recordingSeconds} / 00:06
                </span>
                <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1.5 h-8">
                  <Square className="w-3.5 h-3.5 fill-current" /> Dừng
                </Button>
              </div>
            ) : recordedBlob ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã thu {recordingSeconds}s
                </Badge>
                <Button size="sm" variant="ghost" onClick={startRecording} className="h-8 gap-1 text-xs">
                  <RotateCcw className="w-3 h-3" /> Thu lại
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={startRecording} disabled={!selectedMemberId} className="gap-1.5 h-8">
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu đọc mẫu (5s)
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleEnroll}
              disabled={!recordedBlob || isEnrolling}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8"
            >
              {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Lưu Vector Centroid
            </Button>
          </div>
        </div>

        {/* Existing Profiles List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Hồ Sơ Giọng Nói Đã Lưu ({profiles.length})
            </h4>
            <Badge variant="outline" className="text-[10px]">
              pgvector 192-dim
            </Badge>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-600" />
              Đang tải danh sách hồ sơ...
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-6 text-center bg-muted/10 rounded-2xl text-xs text-muted-foreground">
              Chưa có thành viên nào đăng ký mẫu giọng. Hãy thu âm mẫu đầu tiên ở trên!
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                      {p.member_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{p.member_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Vector: {p.vector_dimension} chiều • Cập nhật: {new Date(p.updated_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {p.sample_count} mẫu tích lũy
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
