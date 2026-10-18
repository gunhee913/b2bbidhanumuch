'use client';

import { cn } from '@/lib/utils';

export const GIFT_STEPS = [
  { id: 'box', no: 1, label: '박스' },
  { id: 'parts', no: 2, label: '구성' },
  { id: 'products', no: 3, label: '상품' },
  { id: 'quote', no: 4, label: '견적' },
] as const;

export type GiftWizardStep = (typeof GIFT_STEPS)[number]['id'];

/** 선물세트 4단계 · 이전 단계와 열린 단계만 누를 수 있다 */
export function GiftStepBar({
  step,
  enabled,
  onGo,
}: {
  step: GiftWizardStep;
  enabled: Record<GiftWizardStep, boolean>;
  onGo: (next: GiftWizardStep) => void;
}) {
  const current = GIFT_STEPS.findIndex((item) => item.id === step);
  return (
    <ol className="flex items-center gap-2">
      {GIFT_STEPS.map((item, index) => {
        const active = step === item.id;
        const done = current > index;
        return (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 ? <span className="h-px w-8 bg-line" aria-hidden /> : null}
            <button
              type="button"
              disabled={!enabled[item.id]}
              onClick={() => onGo(item.id)}
              className={cn(
                'inline-flex items-center gap-2 text-[13px] font-semibold',
                active ? 'text-content' : done ? 'text-content-soft' : 'text-content-faint',
                !enabled[item.id] && 'cursor-not-allowed opacity-40',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px]',
                  active || done ? 'bg-ink text-white' : 'bg-surface-accent text-content-faint',
                )}
              >
                {item.no}
              </span>
              {item.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
