'use client';

import { cn } from '@/lib/utils';
import { buildSlotZones, calcSlotPrice, calcSlotWeight, formatKg, formatWon } from '../../lib/slots';

interface SlotPreviewProps {
  partWeight: number;
  /** 좌·우 분할(안심·채끝·부채) 판정용 */
  partName?: string;
  slotCount: number | null;
  pricePerKg: number | null;
  positional: boolean;
  soldSlotNos?: number[];
}

/** 관리자 설정 시트의 실시간 미리보기 · 분할 수·단가를 바꾸면 바로 구좌 중량/구좌가가 바뀐다 */
export function SlotPreview({ partWeight, partName, slotCount, pricePerKg, positional, soldSlotNos = [] }: SlotPreviewProps) {
  const count = slotCount && slotCount > 0 ? Math.min(100, Math.floor(slotCount)) : 0;
  const slotWeight = count ? calcSlotWeight(partWeight, count) : 0;
  const slotPrice = count && pricePerKg ? calcSlotPrice(pricePerKg, slotWeight) : 0;
  const sold = new Set(soldSlotNos);
  const zones = buildSlotZones(count, partName);

  return (
    <div className="border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="부위 중량" value={formatKg(partWeight)} />
        <Metric label="구좌 중량" value={count ? formatKg(slotWeight) : '-'} />
        <Metric label="구좌가" value={slotPrice ? formatWon(slotPrice) : '-'} emphasize />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
        <span>소비자 표기 · 100g당 {pricePerKg ? `${Math.round(pricePerKg / 10).toLocaleString()}원` : '-'}</span>
        <span>총 {count}구좌 · 합계 {slotPrice ? formatWon(slotPrice * count) : '-'}</span>
      </div>

      {count > 0 ? (
        <div className="mt-3 space-y-1.5">
          {zones.map((zone) => (
            <div key={zone.key} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-600">{positional ? zone.label : ''}</span>
              <div className="flex flex-1 flex-wrap gap-1">
                {zone.slotNos.map((n) => (
                  <span
                    key={n}
                    className={cn(
                      'flex h-6 min-w-[24px] items-center justify-center rounded border px-1 text-[10.5px] font-semibold tabular-nums',
                      sold.has(n) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600',
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {sold.size > 0 ? <p className="text-[10.5px] text-gray-400">진한 칸 = 이미 판매된 구좌 ({sold.size}개)</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-gray-400">분할 수를 입력하면 구좌 배치가 표시됩니다.</p>
      )}
    </div>
  );
}

function Metric({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="bg-white px-2.5 py-2 ring-1 ring-gray-200">
      <p className="text-[10.5px] text-gray-500">{label}</p>
      <p className={cn('mt-0.5 tabular-nums', emphasize ? 'text-sm font-bold text-gray-900' : 'text-xs font-semibold text-gray-800')}>{value}</p>
    </div>
  );
}
