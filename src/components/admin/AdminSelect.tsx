'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_INPUT } from './buttonStyles';

export interface AdminSelectOption {
  value: string;
  label: string;
}

interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly AdminSelectOption[];
  'aria-label'?: string;
  /** 값이 비어 있을 때 보이는 글자 · 고르기 전 상태가 있는 폼에서 */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 관리자 화면 드롭다운 · 브라우저 기본 `<select>` 는 OS 모양(어두운 메뉴·둥근 모서리)이라
 * 흰 바탕·2px 모서리인 나머지 입력칸과 겹치지 않는다. 열린 목록도 입력칸과 같은 결로 그린다.
 * 트리거는 `ADMIN_INPUT` 과 같은 32px 라서 날짜 입력·버튼과 한 줄에 선다.
 */
export function AdminSelect({ value, onChange, options, placeholder, disabled, className, 'aria-label': ariaLabel }: AdminSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          ADMIN_INPUT,
          'inline-flex items-center justify-between gap-2 pr-2 text-left hover:border-slate-400 data-[state=open]:border-slate-900 data-[placeholder]:text-slate-400 disabled:cursor-default [&>span]:truncate',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex h-8 cursor-default select-none items-center rounded-[1px] pl-2.5 pr-8 text-[13px] text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 data-[state=checked]:font-medium data-[state=checked]:text-slate-900"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
