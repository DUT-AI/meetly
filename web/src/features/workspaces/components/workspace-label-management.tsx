'use client';

import { Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateLabel } from '@/features/workspaces/api/use-create-label';
import { useDeleteLabel } from '@/features/workspaces/api/use-delete-label';
import { useGetLabels } from '@/features/workspaces/api/use-get-labels';
import { useUpdateLabel } from '@/features/workspaces/api/use-update-label';
import type { WorkspaceLabel } from '@/features/workspaces/types';
import { useConfirm } from '@/hooks/use-confirm';

interface WorkspaceLabelManagementProps {
  workspaceId: string;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const WorkspaceLabelManagement = ({ workspaceId }: WorkspaceLabelManagementProps) => {
  const { data: labels, isLoading } = useGetLabels({ workspaceId });
  const { mutate: createLabel, isPending: isCreating } = useCreateLabel({ workspaceId });
  const { mutate: updateLabel, isPending: isUpdating } = useUpdateLabel({ workspaceId });
  const { mutate: deleteLabel, isPending: isDeleting } = useDeleteLabel({ workspaceId });

  const [ConfirmDialog, confirmDelete] = useConfirm(
    'Xóa nhãn công việc',
    'Bạn có chắc chắn muốn xóa nhãn này? Nhãn sẽ không còn hiển thị trên các công việc.',
    'destructive',
  );

  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[5]);
  const [editingLabel, setEditingLabel] = useState<WorkspaceLabel | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    createLabel(
      { name: newLabelName.trim(), color: newLabelColor },
      {
        onSuccess: () => {
          setNewLabelName('');
          setNewLabelColor(PRESET_COLORS[5]);
        },
      },
    );
  };

  const handleStartEdit = (label: WorkspaceLabel) => {
    setEditingLabel(label);
    setEditingName(label.name);
    setEditingColor(label.color);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabel || !editingName.trim()) return;

    updateLabel(
      {
        labelId: editingLabel.id,
        data: { name: editingName.trim(), color: editingColor },
      },
      {
        onSuccess: () => {
          setEditingLabel(null);
        },
      },
    );
  };

  const handleDelete = async (labelId: string) => {
    const ok = await confirmDelete();
    if (!ok) return;

    deleteLabel({ labelId });
  };

  return (
    <>
      <ConfirmDialog />
      <Card className="size-full border-none shadow-none">
        <CardHeader className="p-7">
          <CardTitle className="text-xl font-bold">Quản lý nhãn công việc (Labels)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Định nghĩa các nhãn dán cho công việc trong phòng ban để dễ dàng phân loại và theo dõi.
          </p>
        </CardHeader>

        <div className="px-7">
          <DottedSeparator />
        </div>

        <CardContent className="p-7 space-y-6">
          {/* Form thêm nhãn mới */}
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border p-4 bg-muted/20">
            <h4 className="text-sm font-semibold">Tạo nhãn mới</h4>

            <div className="flex flex-col gap-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tên nhãn</label>
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Ví dụ: Bug, Frontend, Feature, Khẩn cấp, Thiết kế..."
                  disabled={isCreating}
                  className="w-full bg-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        className={`size-6 rounded-full border-2 transition-transform cursor-pointer ${newLabelColor === c ? 'scale-125 border-neutral-900 shadow-md' : 'border-transparent hover:scale-110'
                          }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isCreating || !newLabelName.trim()} size="sm" className="gap-x-1.5 shrink-0 self-end sm:self-auto">
                  {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Thêm nhãn
                </Button>
              </div>
            </div>
          </form>

          {/* Danh sách nhãn hiện tại */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Danh sách nhãn ({labels?.length || 0})</h4>

            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : !labels || labels.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Chưa có nhãn nào trong phòng ban này.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/10 transition"
                  >
                    {editingLabel?.id === label.id ? (
                      <form onSubmit={handleSaveEdit} className="w-full flex flex-col gap-2.5">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-9 text-sm w-full bg-white"
                          placeholder="Tên nhãn..."
                          autoFocus
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditingColor(c)}
                                className={`size-5 rounded-full border-2 cursor-pointer ${editingColor === c ? 'scale-125 border-neutral-900 shadow-sm' : 'border-transparent'
                                  }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button type="submit" size="xs" disabled={isUpdating || !editingName.trim()}>
                              Lưu
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="xs"
                              onClick={() => setEditingLabel(null)}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => handleStartEdit(label)}
                          >
                            <Edit2 className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(label.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
