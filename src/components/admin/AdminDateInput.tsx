'use client';

import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ADMIN_INPUT } from './buttonStyles';

interface AdminDateInputProps {
  /** 'yyyy-MM-dd' · 비어 있으면 자리글 */
  value: string;
  onChange: (value: string) => void;
  /** 'yyyy-MM-dd' · 이 날 이전은 고를 수 없다 (종료일의 하한) */
  min?: string;
  /** 'yyyy-MM-dd' · 이 날 이후는 고를 수 없다 (시작일의 상한) */
  max?: string;
  placeholder?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

const ISO = 'yyyy-MM-dd';

const parse = (value: string): Date | undefined => {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
};

/**
 * 달력 셀 · 켜진 날은 먹색 네모, 오늘은 테두리만. 모서리는 다른 입력칸과 같은 2px.
 * shadcn 달력의 `primary`/`accent` 토큰 대신 관리자 화면의 slate 로 덮어쓴다.
 */
const CALENDAR_CLASS_NAMES = {
  root: 'w-fit p-3 [--cell-size:2rem]',
  /* nav 와 월 표시를 같은 32px 줄에 겹친다 · 버튼까지 absolute 로 두면 nav 높이가 0 이 되어 버튼이 위로 튄다 */
  nav: 'absolute inset-x-0 top-0 flex h-8 w-full items-center justify-between',
  month_caption: 'flex h-8 items-center justify-center px-8',
  caption_label: 'select-none text-[13px] font-semibold text-slate-900',
  button_previous: 'flex h-8 w-8 items-center justify-center rounded-[2px] text-slate-500 hover:bg-slate-100 hover:text-slate-900 aria-disabled:opacity-30',
  button_next: 'flex h-8 w-8 items-center justify-center rounded-[2px] text-slate-500 hover:bg-slate-100 hover:text-slate-900 aria-disabled:opacity-30',
  weekday: 'flex-1 select-none text-[11px] font-medium text-slate-400',
  week: 'mt-1 flex w-full',
  today: 'rounded-[2px] bg-transparent text-slate-900 [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-slate-300',
  outside: 'text-slate-300 aria-selected:text-slate-300',
  disabled: 'text-slate-300 opacity-100',
  day_button:
    'h-8 w-8 rounded-[2px] text-[12px] font-normal tabular-nums text-slate-700 hover:bg-slate-100 hover:text-slate-900 data-[selected-single=true]:bg-slate-900 data-[selected-single=true]:text-white data-[selected-single=true]:hover:bg-slate-900',
};

/**
 * 관리자 날짜 입력 · 브라우저 기본 `<input type="date">` 는 OS 달력이 떠 다른 입력칸과 결이 다르다.
 * 입력칸 모양의 버튼을 누르면 같은 결의 달력이 아래로 열리고, 날을 고르면 바로 닫힌다.
 * 값은 그대로 ISO 문자열이라 부르는 쪽(`DateRange`, 폼 상태)은 손댈 것이 없다.
 */
export function AdminDateInput({ value, onChange, min, max, placeholder = '날짜 선택', disabled, className, 'aria-label': ariaLabel }: AdminDateInputProps) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const minDate = parse(min ?? '');
  const maxDate = parse(max ?? '');

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          ADMIN_INPUT,
          'inline-flex w-[136px] items-center justify-between gap-2 tabular-nums hover:border-slate-400 data-[state=open]:border-slate-900 disabled:cursor-default',
          !selected && 'text-slate-400',
          className,
        )}
      >
        {selected ? format(selected, 'yyyy.MM.dd') : placeholder}
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-[2px] border border-slate-200 bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <Calendar
            mode="single"
            locale={ko}
            selected={selected}
            defaultMonth={selected ?? maxDate ?? minDate ?? new Date()}
            disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, ISO));
              setOpen(false);
            }}
            classNames={CALENDAR_CLASS_NAMES}
            formatters={{ formatCaption: (date) => format(date, 'yyyy년 M월', { locale: ko }) }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
