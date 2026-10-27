'use client';

import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ADMIN_BUTTON } from './buttonStyles';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 되돌리기 어려운 동작 · 확인 버튼을 붉게 */
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** `window.confirm` 대신 쓰는 확인창 · 관리자 화면 공통 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onCancel()}>
      <DialogContent className="max-w-[420px] rounded-[2px] p-6">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-[16px] font-semibold text-slate-900">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-[13px] leading-[1.6] text-slate-600">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:space-x-0">
          <button type="button" onClick={onCancel} disabled={isPending} className={ADMIN_BUTTON.secondary}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(destructive ? `${ADMIN_BUTTON.primary} bg-rose-600 hover:bg-rose-700` : ADMIN_BUTTON.primary)}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
