'use client';

import { Check, CheckCircle2, Loader2, Sparkles, User, Users } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { ResponsiveModal } from '@/components/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { transcriptionApi } from '../api/transcription-api';

interface SpeakerIdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  meetingId: string;
  speakers: string[];
  members: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function SpeakerIdentificationModal({
  isOpen,
  onClose,
  workspaceId,
  meetingId,
  speakers,
  members,
  onSuccess,
}: SpeakerIdentificationModalProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Distinct speaker labels to assign
  const distinctSpeakers = Array.from(new Set(speakers)).filter(
    (s) => s.toLowerCase().startsWith('speaker') || s.toLowerCase() === 'unknown',
  );

  const colors = [
    'bg-purple-500/10 text-purple-600 border-purple-200',
    'bg-blue-500/10 text-blue-600 border-blue-200',
    'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    'bg-amber-500/10 text-amber-600 border-amber-200',
    'bg-rose-500/10 text-rose-600 border-rose-200',
  ];

  const handleSelect = (speakerLabel: string, memberName: string) => {
    setMappings((prev) => ({
      ...prev,
      [speakerLabel]: memberName,
    }));
  };

  const handleConfirm = async () => {
    if (Object.keys(mappings).length === 0) {
      toast.error('Vui lòng chọn ít nhất một thành viên để gán danh tính');
      return;
    }

    setIsSubmitting(true);
    try {
      await transcriptionApi.confirmSpeakers(workspaceId, meetingId, mappings);
      toast.success('Đã xác nhận diễn giả và cập nhật Ngân hàng Giọng nói Centroid!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Lỗi khi cập nhật danh tính diễn giả');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Who is speaking? (Định danh Người nói)"
      description="Gán danh tính thành viên cho các đoạn hội thoại chưa nhận diện để cập nhật Voicebank."
    >
      <div className="p-6 max-h-[85vh] overflow-y-auto space-y-5">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">Who is speaking? (Định danh Người nói)</h2>
            <p className="text-sm text-muted-foreground">
              Gán danh tính thành viên thực tế cho các đoạn thoại. Hệ thống sẽ học vector giọng nói để tự động nhận dạng các lần họp sau.
            </p>
          </div>
        </div>

        {distinctSpeakers.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-semibold text-sm">Tất cả diễn giả đã được nhận dạng chính xác</h4>
            <p className="text-xs text-muted-foreground">Không có nhãn Speaker lạ cần định danh thủ công.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Danh sách diễn giả cần xác thực ({distinctSpeakers.length})
            </p>

            <div className="space-y-3">
              {distinctSpeakers.map((spk, idx) => {
                const colorClass = colors[idx % colors.length];
                return (
                  <div
                    key={spk}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${colorClass}`}>{spk}</span>
                      <span className="text-xs text-muted-foreground">thuộc về thành viên:</span>
                    </div>

                    <div className="w-full sm:w-60">
                      <Select value={mappings[spk] || ''} onValueChange={(val) => handleSelect(spk, val)}>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Chọn thành viên..." />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.name} className="text-xs">
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Học tăng cường trực tuyến (Centroid Voicebank):</strong> Sau khi bấm xác nhận, hệ thống tự động cập nhật vector trọng
            tâm 192 chiều của thành viên để nhận diện tự động trong các cuộc họp kế tiếp.
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || distinctSpeakers.length === 0}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang cập nhật...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Xác nhận & Cập nhật Voicebank
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
