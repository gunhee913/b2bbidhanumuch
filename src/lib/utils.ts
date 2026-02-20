import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1++ 등급일 때만 근내지방도 표시 (예: "1++A" + 9 → "1++A(9)") */
export function formatGrade(grade: string, marblingScore?: number | null): string {
  if (!grade) return '-';
  if (grade.startsWith('1++') && marblingScore && marblingScore > 0) return `${grade}(${marblingScore})`;
  return grade;
}
