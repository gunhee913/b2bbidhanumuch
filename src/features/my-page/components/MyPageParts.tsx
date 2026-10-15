"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

/**
 * 마이페이지 공용 조각 · 카드 · 켜고 끄는 스위치 · 큰 숫자.
 *
 * 경매장 패널 토큰(`SURFACE_SHELL_CLASS` · `content*` · `line*`)을 그대로 쓴다. 다른
 * 화면과 같은 테두리·같은 글자여야 「같은 서비스의 내 방」 으로 읽힌다.
 */

/** 카드 · 머리줄(제목 · 오른쪽 손잡이) + 본문 */
export function MyPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  /** 제목 아래 한 줄 · 이 카드가 무엇을 말하는지 */
  description?: string;
  /** 머리줄 오른쪽 · 「전체 보기」 「엑셀」 같은 것 */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col", SURFACE_SHELL_CLASS, className)}>
      <header className="flex items-start justify-between gap-3 border-b border-line-soft px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold text-content">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[11.5px] text-content-faint">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-1.5">{action}</div>
        ) : null}
      </header>
      <div className={cn("min-h-0", bodyClassName)}>{children}</div>
    </section>
  );
}

/** 카드 안 빈 상태 · 한 줄 */
export function MyPanelEmpty({ text }: { text: string }) {
  return (
    <p className="px-4 py-10 text-center text-[12.5px] text-content-faint">
      {text}
    </p>
  );
}

/** 카드 머리의 작은 글자 단추 · 「전체 보기 ›」 같은 것 */
export const PANEL_ACTION_CLASS =
  "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-content-mid transition-colors hover:bg-surface-accent hover:text-content disabled:opacity-50";

/**
 * 켜고 끄는 스위치 · 누르는 즉시 저장되는 자리에 쓴다.
 *
 * 저장 단추를 두지 않는 것은 토스 설정 화면과 같은 약속이다 — 스위치를 올렸는데 아래
 * 「저장」 을 안 눌러 안 바뀐 채 나가는 일이 가장 흔한 실수라서다.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 읽어 줄 이름 · 옆 글자가 따로 있어도 스위치 자체가 말할 수 있어야 한다 */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-inverse" : "bg-surface-strong",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/** 설정 줄 · 왼쪽 이름과 설명, 오른쪽 스위치나 값 */
export function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-content">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11.5px] text-content-faint">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** 이름 · 값 한 줄 (`dl` 안) */
export function InfoRow({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-[12.5px] text-content-faint">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-[13px] font-semibold text-content",
          numeric && "tabular-nums",
        )}
      >
        {value ?? <span className="text-content-ghost">-</span>}
      </dd>
    </div>
  );
}

/** 큰 숫자 · 라벨 위, 수 아래 · 단위는 한 단 작게 */
export function StatValue({
  label,
  value,
  unit = "원",
  tone = "default",
  size = "md",
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "won" | "lost" | "muted";
  size?: "md" | "lg";
  /** 수 아래 한 줄 · 「오늘 +1,200,000」 같은 것 */
  hint?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-content-faint">
        {label}
      </span>
      <span
        className={cn(
          "font-bold tabular-nums leading-none",
          size === "lg" ? "text-[28px]" : "text-[20px]",
          tone === "won" && "text-won",
          tone === "lost" && "text-lost",
          tone === "muted" && "text-content-mid",
          tone === "default" && "text-content",
        )}
      >
        {value}
        {unit ? (
          <span
            className={cn(
              "ml-0.5 font-semibold text-content-faint",
              size === "lg" ? "text-[15px]" : "text-[12px]",
            )}
          >
            {unit}
          </span>
        ) : null}
      </span>
      {hint ? (
        <span className="text-[11.5px] tabular-nums text-content-faint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** 표 공용 · 머리 · 셀 */
export const MY_TABLE_CLASS =
  "w-full table-fixed text-[13px] text-content [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11.5px] [&_th]:font-semibold [&_th]:text-content-faint [&_td]:px-3 [&_td]:py-2.5 [&_tbody_tr]:border-t [&_tbody_tr]:border-line-soft";

export const formatWon = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}`;

/** 부호 붙은 금액 · 입금은 +, 나머지는 − */
export const formatSignedWon = (value: number, positive: boolean) =>
  `${positive ? "+" : "−"}${formatWon(Math.abs(value))}`;
