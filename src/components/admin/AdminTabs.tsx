'use client';

import { cn } from '@/lib/utils';

export interface AdminTabOption<T extends string = string> {
  value: T;
  label: string;
  /** 라벨 뒤에 흐리게 붙는 수 · 상태 탭의 건수처럼 */
  count?: number;
}

interface AdminTabsProps<T extends string> {
  /** 읽어 줄 이름 · 이 줄이 무엇을 고르는지 */
  label: string;
  /** null 이면 아무 칸도 켜지지 않는다 · 직접 입력한 기간처럼 프리셋에 없는 값 */
  value: T | null;
  options: readonly AdminTabOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * 관리자 화면 분절 탭 · 대시보드 기간 탭(연회색 판 위에 켜진 칸만 흰 칩)을 한곳으로 모았다.
 * 상태 탭이 먹색 채움, 기간 탭이 흰 칩으로 갈려 있어 같은 화면에서 두 가지 「켜짐」이 보였다.
 * 켜진 칩은 `ring` 으로 테두리를 세워 흰 바탕 패널 위에서도 윤곽이 남는다.
 */
export function AdminTabs<T extends string>({ label, value, options, onChange, className }: AdminTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex h-8 items-center gap-0.5 rounded-[2px] border border-slate-200 bg-slate-50 p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-full items-center gap-1.5 whitespace-nowrap rounded-[1px] px-2.5 text-[12px] font-medium transition-colors',
              active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className={cn('tabular-nums', active ? 'text-slate-500' : 'text-slate-400')}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
