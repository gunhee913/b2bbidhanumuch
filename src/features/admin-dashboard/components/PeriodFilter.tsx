'use client';

import { useState } from 'react';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { AdminDateInput } from '@/components/admin/AdminDateInput';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { isValidRange, PERIOD_PRESETS, presetForRange, rangeForPreset, type DateRange } from '../lib/period';

interface PeriodFilterProps {
  /** 지금 조회 중인 기간 */
  applied: DateRange;
  onApply: (range: DateRange) => void;
}

/** 기간 선택 · 프리셋은 즉시 반영, 직접 입력은 「조회」로 확정 */
export function PeriodFilter({ applied, onApply }: PeriodFilterProps) {
  const [draft, setDraft] = useState<DateRange>(applied);
  const activePreset = presetForRange(applied);
  const isDirty = draft.start !== applied.start || draft.end !== applied.end;
  const canApply = isDirty && isValidRange(draft);

  const applyPreset = (preset: (typeof PERIOD_PRESETS)[number]['value']) => {
    const next = rangeForPreset(preset);
    setDraft(next);
    onApply(next);
  };

  return (
    <div className="flex items-center gap-3">
      <AdminTabs label="조회 기간" value={activePreset} options={PERIOD_PRESETS} onChange={applyPreset} />

      <form
        className="flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canApply) onApply(draft);
        }}
      >
        <AdminDateInput aria-label="시작일" value={draft.start} max={draft.end} onChange={(start) => setDraft((prev) => ({ ...prev, start }))} />
        <span className="text-slate-400">~</span>
        <AdminDateInput aria-label="종료일" value={draft.end} min={draft.start} onChange={(end) => setDraft((prev) => ({ ...prev, end }))} />
        <button type="submit" disabled={!canApply} className={ADMIN_BUTTON.primary}>
          조회
        </button>
      </form>
    </div>
  );
}
