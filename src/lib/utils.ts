import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 한국 시간 기준 오늘 (YYYY-MM-DD). toISOString() 은 UTC 라 서버·브라우저 어디서든 09:00 전엔 전날이 된다 */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 1++ 등급일 때만 근내지방도 표시 (예: "1++A" + 9 → "1++A(9)") */
export function formatGrade(grade: string, marblingScore?: number | null): string {
  if (!grade) return '-';
  if (grade.startsWith('1++') && marblingScore && marblingScore > 0) return `${grade}(${marblingScore})`;
  return grade;
}
