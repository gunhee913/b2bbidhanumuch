import { differenceInSeconds, format, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = parseISO(iso);
  if (!isValid(d)) return '-';
  return format(d, 'M월 d일 (EEE) HH:mm', { locale: ko });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = parseISO(iso);
  if (!isValid(d)) return '-';
  return format(d, 'yyyy.MM.dd HH:mm', { locale: ko });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, 'yyyy.MM.dd', { locale: ko });
}

export interface Remaining {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOver: boolean;
  /** 24시간 미만 */
  isUrgent: boolean;
}

export function remainingUntil(iso: string, now = new Date()): Remaining {
  const target = parseISO(iso);
  const total = isValid(target) ? Math.max(0, differenceInSeconds(target, now)) : 0;
  return {
    totalSeconds: total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    isOver: total <= 0,
    isUrgent: total > 0 && total < 86400,
  };
}

export function formatRemaining(r: Remaining): string {
  if (r.isOver) return '마감';
  if (r.days > 0) return `${r.days}일 ${r.hours}시간 남음`;
  if (r.hours > 0) return `${r.hours}시간 ${r.minutes}분 남음`;
  return `${r.minutes}분 ${String(r.seconds).padStart(2, '0')}초 남음`;
}

/** 등급 문자열(예: 1++A(9)) → 간결한 표시(1++) */
export function shortGrade(grade: string | null | undefined): string {
  if (!grade) return '-';
  const m = grade.match(/^(1\+\+|1\+|1|2|3|D)/);
  return m ? m[1] : grade;
}

/** 근내지방도 · 등급 문자열 끝의 `(9)` 에서 꺼내거나 별도 점수 사용 */
function marblingOf(grade: string | null | undefined, marblingScore: number | null | undefined): number | null {
  const score = marblingScore ?? Number(grade?.match(/\((\d)\)/)?.[1] ?? NaN);
  return Number.isFinite(score) ? score : null;
}

/**
 * 소비자용 등급 표기 · 1++ 만 근내지방도를 붙인다 (`1++(9)`), 그 아래는 `1+등급` · `1등급` · `2등급`.
 * 1++ 안에서는 7·8·9 차이가 가격에 바로 반영되지만 그 아래 등급에서 점수는 소비자에게 의미가 적다.
 */
export function gradeWithMarbling(grade: string | null | undefined, marblingScore: number | null | undefined): string {
  const short = shortGrade(grade);
  if (short === '-') return '-';
  if (short !== '1++') return `${short}등급`;
  const score = marblingOf(grade, marblingScore);
  return score === null ? short : `${short}(${score})`;
}

const GRADE_BASE_RANK: Record<string, number> = { '1++': 300, '1+': 200, '1': 100, '2': 50, '3': 20, D: 0 };

/** 정렬용 점수 · 높을수록 좋은 등급 · 1++ 는 근내지방도까지 반영 (1++(9) > 1++(8) > 1+ > 1 > 2) */
export function gradeRank(grade: string | null | undefined, marblingScore: number | null | undefined): number {
  const short = shortGrade(grade);
  const base = GRADE_BASE_RANK[short] ?? -1;
  return short === '1++' ? base + (marblingOf(grade, marblingScore) ?? 0) : base;
}

/** 이력번호 002 1234 5678 90 처럼 띄어쓰기 */
export function formatTraceNo(trace: string | null | undefined): string {
  if (!trace) return '-';
  const digits = trace.replace(/\D/g, '');
  if (digits.length !== 12) return trace;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)} ${digits.slice(11)}`;
}

export function phoneMask(phone: string): string {
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
}
