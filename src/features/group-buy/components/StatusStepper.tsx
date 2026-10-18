'use client';

import { Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsumerStatus } from '../types';
import { CONSUMER_STEPS, consumerStepIndex } from '../constants/status';

/**
 * 주문 진행 단계 · 모집중 → 모집완료 → 소분 가공 → 배송중 → 배송완료.
 * 취소된 주문은 단계 대신 취소 안내 한 줄.
 */
export function StatusStepper({ status, message }: { status: ConsumerStatus; message?: string | null }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-surface-muted px-5 py-4">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-content-faint" />
        <div>
          <p className="text-[14.5px] font-bold text-content">참여가 취소되었어요</p>
          {message ? <p className="mt-1 text-[13px] leading-relaxed text-content-soft">{message}</p> : null}
        </div>
      </div>
    );
  }

  const current = consumerStepIndex(status);

  return (
    <ol className="flex items-start">
      {CONSUMER_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === CONSUMER_STEPS.length - 1;
        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center text-center">
            {!last ? (
              <span
                aria-hidden
                className={cn('absolute left-1/2 top-4 h-0.5 w-full', i < current ? 'bg-ink' : 'bg-surface-strong')}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[12.5px] font-bold transition-colors',
                done
                  ? 'border-ink bg-ink text-white'
                  : active
                    ? 'border-ink bg-surface text-ink ring-4 ring-ink/10'
                    : 'border-line bg-surface text-content-ghost',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <p className={cn('mt-2.5 text-[13px] font-bold', active || done ? 'text-content' : 'text-content-ghost')}>{step.label}</p>
            <p className={cn('mt-0.5 px-2 text-[11.5px] leading-snug', active ? 'text-content-soft' : 'text-content-ghost')}>
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
