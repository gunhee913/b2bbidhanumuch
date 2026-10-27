/**
 * 관리자 화면 버튼 · 세 단계만 둔다.
 * primary 먹색(주 동작) · secondary 흰 바탕 테두리(보조) · ghost 글자만(표 안 작은 동작)
 */
const BASE =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] text-[12px] font-medium transition-colors disabled:cursor-default';

export const ADMIN_BUTTON = {
  primary: `${BASE} h-8 bg-slate-900 px-3.5 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400`,
  secondary: `${BASE} h-8 border border-slate-200 bg-white px-3 text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700`,
  danger: `${BASE} h-8 border border-rose-200 bg-white px-3 text-rose-600 hover:border-rose-600 disabled:opacity-40 disabled:hover:border-rose-200`,
  /** 표 안 · 24px */
  small: `${BASE} h-6 border border-slate-200 bg-white px-2 text-[11px] text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-40`,
  smallPrimary: `${BASE} h-6 bg-slate-900 px-2.5 text-[11px] text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400`,
} as const;

export const ADMIN_INPUT =
  'h-8 rounded-[2px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-400';

/** type="number" 입력 · 브라우저 증감 버튼을 숨긴다 (관리자는 키보드로 친다) */
export const ADMIN_NUMBER_INPUT = `${ADMIN_INPUT} tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
