'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPickup } from '../../lib/stores';
import type { PickupInput, StoreSummary } from '../../types';
import { PickupScheduler, type PickupSelection } from './PickupScheduler';

interface PickupChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: StoreSummary | null;
  pickupAt: string | null;
  /** 변경 저장 · 실패하면 throw */
  onSubmit: (input: PickupInput) => Promise<unknown>;
  pending?: boolean;
}

/** 매장 수령 주문의 픽업 시간 변경 · 같은 매장 안에서 날짜·시간만 다시 고른다 */
export function PickupChangeDialog({ open, onOpenChange, store, pickupAt, onSubmit, pending = false }: PickupChangeDialogProps) {
  const [selection, setSelection] = useState<PickupSelection | null>(null);

  useEffect(() => {
    if (!open) setSelection(null);
  }, [open]);

  const save = async () => {
    if (!selection) return;
    try {
      await onSubmit({ storeId: selection.storeId, pickupAt: selection.pickupAt });
      toast.success(`픽업 시간을 ${formatPickup(selection.pickupAt)}로 바꿨어요.`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '변경하지 못했어요.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>픽업 시간 변경</DialogTitle>
          <DialogDescription>
            {store ? `${store.name} · ` : ''}
            현재 {pickupAt ? formatPickup(pickupAt) : '미지정'} · 픽업 전날까지 바꿀 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <PickupScheduler
          value={selection}
          onChange={setSelection}
          preferredStoreId={store?.id ?? null}
          currentPickupAt={pickupAt}
          lockStore={!!store}
          disabled={pending}
        />
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-[13.5px] font-semibold text-content-mid hover:bg-surface-muted"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!selection || pending}
            className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-[13.5px] font-bold text-white hover:bg-ink-hover disabled:opacity-50"
          >
            {pending ? '저장 중…' : '이 시간으로 변경'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
