'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildSlotZones } from '../lib/slots';

interface SlotPickerProps {
  slotCount: number;
  /** 좌·우 분할(안심·채끝·부채) 판정용 */
  partName?: string;
  soldSlotNos: number[];
  selected: number[];
  onChange: (next: number[]) => void;
  /** 주문 상세처럼 보기만 할 때 */
  readOnly?: boolean;
  /** 읽기 전용에서 강조할 구좌(내 구좌) */
  highlight?: number[];
  maxSelectable?: number;
}

/**
 * 위치 선택 구좌 선택기 · 1번(상단) → N번(하단).
 * 긴 부위를 상·중·하 세 구간으로 묶어 보여준다.
 */
export function SlotPicker({ slotCount, partName, soldSlotNos, selected, onChange, readOnly = false, highlight = [], maxSelectable }: SlotPickerProps) {
  const sold = new Set(soldSlotNos);
  const picked = new Set(selected);
  const mine = new Set(highlight);
  const zones = buildSlotZones(slotCount, partName);

  const toggle = (n: number) => {
    if (readOnly || sold.has(n)) return;
    if (picked.has(n)) {
      onChange(selected.filter((s) => s !== n));
      return;
    }
    if (maxSelectable && selected.length >= maxSelectable) return;
    onChange([...selected, n].sort((a, b) => a - b));
  };

  return (
    <div>
      <div className="space-y-2.5">
        {zones.map((zone) => (
          <div key={zone.key} className="flex items-center gap-3">
            <div className="w-[88px] shrink-0">
              <p className="text-[13px] font-bold text-content">{zone.label}</p>
              <p className="text-[11px] leading-tight text-content-faint">{zone.description}</p>
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {zone.slotNos.map((n) => {
                const isSold = sold.has(n);
                const isPicked = picked.has(n);
                const isMine = mine.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={readOnly || isSold}
                    onClick={() => toggle(n)}
                    aria-pressed={isPicked}
                    aria-label={`${n}번 구좌 ${isSold ? '(마감)' : isPicked ? '(선택됨)' : ''}`}
                    className={cn(
                      'flex h-10 min-w-[40px] items-center justify-center rounded-lg border text-[13.5px] font-bold tabular-nums transition-all',
                      isMine
                        ? 'border-ink bg-ink text-white'
                        : isPicked
                          ? 'border-ink bg-ink text-white shadow-sm'
                          : isSold
                            ? 'cursor-not-allowed border-line-soft bg-surface-accent text-content-ghost line-through'
                            : readOnly
                              ? 'border-line bg-surface text-content-faint'
                              : 'border-line bg-surface text-content-mid hover:border-content-ghost hover:bg-surface-muted',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!readOnly ? (
        <div className="mt-3 flex items-center gap-4 text-[11.5px] text-content-faint">
          <Legend className="border-line bg-surface" label="선택 가능" />
          <Legend className="border-ink bg-ink" label="내 선택" />
          <Legend className="border-line-soft bg-surface-accent" label="마감" />
        </div>
      ) : null}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block h-3 w-3 rounded border', className)} />
      {label}
    </span>
  );
}

/** 위치 선택을 쓰지 않는 상품의 수량 선택 */
export function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
      <div>
        <p className="text-[13.5px] font-bold text-content">수량</p>
        <p className="text-[12px] text-content-faint">최대 {max}구좌까지 선택할 수 있어요</p>
      </div>
      <div className="inline-flex items-center rounded-lg border border-line">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="수량 줄이기"
          className="flex h-10 w-10 items-center justify-center text-content-mid hover:bg-surface-muted disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center text-[16px] font-bold tabular-nums text-content">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="수량 늘리기"
          className="flex h-10 w-10 items-center justify-center text-content-mid hover:bg-surface-muted disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
