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
  Sparkles,
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
    { title: 'Tiền xử lý & VAD', desc: 'Silero VAD tách khoảng lặng và phân đoạn phát ngôn' },
    { title: 'Faster-Whisper ASR', desc: 'Nhận dạng giọng nói tiếng Việt độ chính xác cao (>95%)' },
    { title: 'Định danh Diễn giả', desc: 'So khớp Cosine Similarity với Ngân hàng Giọng nói Centroid' },
    { title: 'Trích xuất Action Items', desc: 'Mô hình Meetly Qwen2.5-3B (SFT + GRPO) tự động bóc tách việc' },
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

  const audioPreviewUrl = React.useMemo(() => {
    if (!recordedBlob) return null;
    return URL.createObjectURL(recordedBlob);
  }, [recordedBlob]);

  const handleProcess = async () => {
    let fileToUpload: File | null = selectedFile;

    if (activeTab === 'record') {
      if (!recordedBlob) {
        toast.error('Vui lòng thu âm trước khi xử lý');
        return;
      }
      if (recordingSeconds < 2) {
        toast.warning('Đoạn thu âm quá ngắn (dưới 2 giây). Vui lòng thu âm tối thiểu 3-5 giây và nói rõ ràng.');
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

    // Simulate animated step transitions for realistic AI processing visualization
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1800);

    try {
      const res = await transcriptionApi.uploadOfflineAudio(workspaceId, meetingId, fileToUpload);
      clearInterval(stepInterval);
      setCurrentStep(4);
      setProcessedResult(res);
      toast.success('Đã xử lý xong cuộc họp offline và trích xuất thành công các Action Items!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      clearInterval(stepInterval);
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
      title="Họp Offline & Trích Xuất Nhiệm Vụ"
      description="Tải lên hoặc thu âm âm thanh cuộc họp offline để hệ thống phân tích và trích xuất Action Items."
    >
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5 border-b pb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Họp Offline & Trích Xuất Nhiệm Vụ Tự Động
              <Badge variant="outline" className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200 text-xs">
                <Sparkles className="w-3 h-3 mr-1 inline" /> Qwen2.5-3B + Voicebank
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Tải file ghi âm hoặc thu âm trực tiếp cuộc họp phòng họp. Hệ thống tự động nhận dạng diễn giả và bóc tách Action Items.
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
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 hover:border-blue-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 bg-muted/20 hover:bg-blue-500/5 group"
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
                    {audioPreviewUrl && (
                      <div className="w-full max-w-xs mx-auto py-1">
                        <audio src={audioPreviewUrl} controls className="w-full h-8" />
                      </div>
                    )}
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
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
              >
                <Sparkles className="w-4 h-4" />
                Bắt đầu Xử lý với Meetly AI
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
              <h3 className="font-bold text-lg">Đang Phân Tích Cuộc Họp Offline</h3>
              <p className="text-xs text-muted-foreground">
                Hệ thống đang chạy qua chuỗi xử lý GPU (Faster-Whisper, Voicebank, và Qwen2.5-3B)
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
                <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">Xử Lý Hoàn Tất Bằng Meetly AI Pipeline</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Đã bóc băng {processedResult.segments_count} phân đoạn, định danh {processedResult.speakers?.length || 0} người nói và tự
                  động trích xuất {processedResult.extracted_tasks?.length || 0} Action Items.
                </p>
              </div>
            </div>

            {/* Extracted Tasks Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Action Items Tự Động Trích Xuất ({processedResult.extracted_tasks?.length || 0})</span>
                <Badge variant="secondary" className="text-[10px]">
                  Qwen2.5-3B Fine-Tuned
                </Badge>
              </h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {processedResult.extracted_tasks?.map((task: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border bg-card hover:border-blue-500/40 transition-colors shadow-sm space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{task.task_title}</p>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 flex-shrink-0">
                        {(task.confidence * 100).toFixed(0)}% tin cậy
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <strong className="text-foreground">{task.assignee}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>{task.deadline || 'Chưa rõ'}</span>
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
