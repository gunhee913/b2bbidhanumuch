'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIM_SLICE_FEE_PER_KG, TRIM_SLICE_LABEL } from '../../lib/pools';
import { formatWon } from '../../lib/slots';

interface TrimSliceOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 중량 감소 동의 · 옵션이 켜진 뒤에만 묻는다 */
  consented?: boolean;
  onConsentChange?: (consented: boolean) => void;
  disabled?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

export const TRIM_SLICE_CONSENT_ERROR = '근막 제거로 중량이 줄 수 있음에 동의해주세요.';

/** 손질 옵션 체크 · 켜면 아래에 중량 감소 동의를 받는다 */
export function TrimSliceOption({
  checked,
  onChange,
  consented = false,
  onConsentChange,
  disabled = false,
  size = 'md',
  className,
}: TrimSliceOptionProps) {
  const sm = size === 'sm';

  const toggle = (next: boolean) => {
    if (disabled) return;
    onChange(next);
    if (!next) onConsentChange?.(false);
  };

  return (
    <div className={className}>
      <label
        className={cn(
          'flex cursor-pointer select-none items-center justify-between gap-3 rounded-sm border transition-colors',
          sm ? 'px-3 py-2' : 'px-4 py-3',
          checked ? 'border-ink bg-surface-accent/60' : 'border-line bg-surface hover:bg-surface-accent/40',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => toggle(e.target.checked)} className="sr-only" />
          <span
            aria-hidden
            className={cn(
              'flex shrink-0 items-center justify-center rounded-sm border',
              sm ? 'h-4 w-4' : 'h-5 w-5',
              checked ? 'border-ink bg-ink text-white' : 'border-line bg-surface',
            )}
          >
            {checked ? <Check className={sm ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={3} /> : null}
          </span>
          <span className="min-w-0">
            <span className={cn('block font-semibold leading-tight text-content', sm ? 'text-[12.5px]' : 'text-[13.5px]')}>{TRIM_SLICE_LABEL}</span>
            {sm ? <span className="block text-[11.5px] tabular-nums text-content-faint">+{formatWon(TRIM_SLICE_FEE_PER_KG)}/kg</span> : null}
          </span>
        </span>
        {!sm ? (
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-content-mid">
            +{formatWon(TRIM_SLICE_FEE_PER_KG)}
            <span className="font-medium text-content-faint">/kg</span>
          </span>
        ) : null}
      </label>
      {checked ? (
        <label className={cn('mt-2 flex cursor-pointer items-start gap-2', disabled && 'cursor-not-allowed opacity-50')}>
          <input
            type="checkbox"
            checked={consented}
            disabled={disabled}
            onChange={(e) => onConsentChange?.(e.target.checked)}
            className="sr-only"
          />
          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
              consented ? 'border-ink bg-ink text-white' : 'border-line bg-surface',
            )}
          >
            {consented ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          <span className="text-[12.5px] leading-snug text-content-mid">
            <span className="font-semibold text-content">동의하기</span>
            {' · 근막 제거 시 중량 감소할 수 있음(10%가량)'}
          </span>
        </label>
      ) : null}
    </div>
  );
}
