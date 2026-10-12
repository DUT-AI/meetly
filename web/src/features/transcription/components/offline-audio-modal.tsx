'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileAudio,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  UploadCloud,
  User,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';

import { ResponsiveModal } from '@/components/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { transcriptionApi } from '../api/transcription-api';

interface OfflineAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  meetingId: string;
  onSuccess?: () => void;
}

export function OfflineAudioModal({ isOpen, onClose, workspaceId, meetingId, onSuccess }: OfflineAudioModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [processedResult, setProcessedResult] = useState<any | null>(null);

  const steps = [
    { title: 'Chuẩn bị âm thanh', desc: 'Lọc tạp âm và phân đoạn giọng nói' },
    { title: 'Chuyển thành văn bản', desc: 'Nhận dạng giọng nói tiếng Việt với độ chính xác cao' },
    { title: 'Nhận diện người nói', desc: 'Tự động gán tên theo mẫu giọng đã lưu' },
    { title: 'Tổng hợp việc cần làm', desc: 'Tự động trích xuất các công việc và người phụ trách' },
  ];

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Không thể truy cập microphone. Vui lòng kiểm tra quyền trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleProcess = async () => {
    let fileToUpload: File | null = selectedFile;

    if (activeTab === 'record') {
      if (!recordedBlob) {
        toast.error('Vui lòng thu âm trước khi xử lý');
        return;
      }
      const isMp4 = recordedBlob.type.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      fileToUpload = new File([recordedBlob], `offline_meeting_rec_${Date.now()}.${ext}`, {
        type: recordedBlob.type || 'audio/webm',
      });
    }

    if (!fileToUpload) {
      toast.error('Vui lòng chọn hoặc thu âm file cuộc họp');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);

    try {
      const res = await transcriptionApi.uploadOfflineAudio(workspaceId, meetingId, fileToUpload);
      setCurrentStep(4);
      setProcessedResult(res);
      toast.success('Đã xử lý xong cuộc họp và trích xuất thành công các công việc cần làm!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Lỗi khi xử lý file cuộc họp offline.';
      toast.error(errorMsg);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setRecordedBlob(null);
    setProcessedResult(null);
    setIsProcessing(false);
    setCurrentStep(0);
    setRecordingSeconds(0);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Ghi Âm & Phân Tích Cuộc Họp"
      description="Tải lên hoặc thu âm cuộc họp để hệ thống phân tích nội dung và trích xuất việc cần làm."
    >
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5 border-b pb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Ghi Âm & Phân Tích Cuộc Họp
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                Tự động hóa
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Tải file ghi âm hoặc thu âm trực tiếp cuộc họp. Hệ thống sẽ tự động chuyển thành văn bản, nhận diện người nói và tổng hợp việc cần làm.
            </p>
          </div>
        </div>

        {!isProcessing && !processedResult && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> Tải file âm thanh (.mp3, .wav)
              </TabsTrigger>
              <TabsTrigger value="record" className="flex items-center gap-2">
                <Mic className="w-4 h-4" /> Thu âm trực tiếp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                aria-label="Tải lên tệp âm thanh cuộc họp"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 hover:border-blue-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 bg-muted/20 hover:bg-blue-500/5 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.webm"
                  className="hidden"
                />
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                  <FileAudio className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Sẵn sàng xử lý
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-foreground text-sm">Nhấn để chọn file ghi âm cuộc họp</p>
                    <p className="text-xs text-muted-foreground mt-1">Hỗ trợ các định dạng .WAV, .MP3, .M4A (tối đa 250MB)</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="record" className="space-y-4">
              <div className="border rounded-2xl p-8 text-center bg-muted/10 flex flex-col items-center justify-center min-h-[180px]">
                {isRecording ? (
                  <div className="space-y-4">
                    <div className="relative inline-flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-red-400 opacity-75"></span>
                      <div className="relative w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg">
                        <Mic className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-bold text-red-500 tracking-wider">{formatSec(recordingSeconds)}</div>
                    <p className="text-xs text-muted-foreground">Đang thu âm âm thanh phòng họp trực tiếp...</p>
                    <Button variant="destructive" onClick={stopRecording} className="gap-2">
                      <Square className="w-4 h-4 fill-current" /> Dừng thu âm
                    </Button>
                  </div>
                ) : recordedBlob ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm">Đã thu âm xong ({formatSec(recordingSeconds)})</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={startRecording} className="gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Thu lại
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                      <Mic className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">Bấm nút bên dưới để bắt đầu thu âm cuộc họp offline</p>
                    <Button onClick={startRecording} className="gap-2">
                      <Play className="w-4 h-4 fill-current" /> Bắt đầu ghi âm
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Hủy bỏ
              </Button>
              <Button
                onClick={handleProcess}
                disabled={(!selectedFile && !recordedBlob) || isRecording}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
              >
                Bắt đầu phân tích cuộc họp
              </Button>
            </div>
          </Tabs>
        )}

        {isProcessing && !processedResult && (
          <div className="py-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-600 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="font-bold text-lg">Đang Phân Tích Cuộc Họp</h3>
              <p className="text-xs text-muted-foreground">
                Hệ thống đang tiến hành chuyển giọng nói thành văn bản và tổng hợp nội dung cuộc họp...
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {steps.map((s, idx) => {
                const stepNum = idx + 1;
                const isDone = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : isCurrent
                          ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                          : 'opacity-50 border-muted'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-muted-foreground/40 flex items-center justify-center text-[10px] text-muted-foreground">
                          {stepNum}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold">{s.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {processedResult && (
          <div className="space-y-5 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">Xử Lý Cuộc Họp Hoàn Tất</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Đã chuyển thành văn bản {processedResult.segments_count} đoạn hội thoại, nhận diện {processedResult.speakers?.length || 0} người nói và tổng
                  hợp {processedResult.extracted_tasks?.length || 0} công việc cần làm.
                </p>
              </div>
            </div>

            {/* Extracted Tasks Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Công Việc Cần Làm Tự Động Trích Xuất ({processedResult.extracted_tasks?.length || 0})</span>
                <Badge variant="secondary" className="text-[10px]">
                  Tự động tổng hợp
                </Badge>
              </h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {processedResult.extracted_tasks?.map((task: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border bg-card hover:border-blue-500/40 transition-colors shadow-sm space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{task.task_title}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <strong className="text-foreground">{task.assignee}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>{task.deadline || 'Chưa rõ hạn'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3 text-purple-500" />
                        {Math.floor(task.source_timestamp_ms / 60000)}m{Math.floor((task.source_timestamp_ms % 60000) / 1000)}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button variant="outline" onClick={handleReset}>
                Xử lý file khác
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Đóng & Xem Biên Bản Cuộc Họp
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
