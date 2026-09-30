"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncatedText,
} from "@/components/ui/tooltip";
import type { LiveListing } from "../api";
import { TraceInfoLink } from "./ListingInfoSection";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

/**
 * 판정 항목별 해석 힌트 · 축산물품질평가원 소도체 등급 판정 기준 요약.
 * 숫자만 보고 의미를 모르는 사용자를 위해 hover 시 1~2줄로 노출.
 */
export const JUDGMENT_HINTS: Record<
  string,
  { range: string; reading: string }
> = {
  근내지방: {
    range: "No.1 ~ 9",
    reading: "높을수록 마블링 풍부 · 7~9 → 1++ · 6 → 1+ · 4~5 → 1",
  },
  육색: {
    range: "No.1 ~ 7",
    reading: "3~5 정상 범위 · 낮을수록 밝은 선홍색",
  },
  지방색: {
    range: "No.1 ~ 7",
    reading: "1~6 정상 범위 · 낮을수록 백색 · 7은 황색지방",
  },
  조직감: {
    range: "1 ~ 3",
    reading: "1 우수 · 2 보통 · 3 미흡 · 결·탄력 기준",
  },
  성숙도: {
    range: "1 ~ 9",
    reading: "낮을수록 어린 개체 · 뼈·연골 골화 정도 기준",
  },
};

/**
 * 개체 스펙 시트 · 우측 상세 패널(340~380px)과 개체 뷰어 다이얼로그 공용.
 *
 * 정렬 축은 하나(좌측) · 섹션 리듬은 hairline + `px-4 py-3` 으로 통일.
 * 1. **판정 5칸 표** · 근내지방 · 육색 · 지방색 · 조직감 · 성숙도
 *    사이드바 사진 카드의 5칸과 같은 항목·순서. 셀에 hairline 세로선을 넣어 "표" 로 읽히게.
 * 2. **지육 4칸 표** · 경락단가 · 도체중 · 등지방 · 등심면적 (단위 있는 값끼리)
 *    등급 히어로는 두지 않는다 — 부르는 쪽 헤더에 이미 `1++A(9)` 가 있다.
 * 3. **개체·도축·유통 KV** · 라벨 고정폭 + 값 좌측. 이력조회는 텍스트 링크.
 */
export function ListingSpecSheet({
  listing,
  children,
}: {
  listing: LiveListing;
  /** KV 목록 아래에 덧붙일 줄 · 뷰어의 부위 요약 등 */
  children?: ReactNode;
}) {
  const animalLine = [
    listing.breed,
    listing.gender,
    listing.monthAge != null ? `${listing.monthAge}개월` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const slaughterLine = [
    listing.slaughterHouse,
    formatDate(listing.slaughterDate),
    listing.slaughterNo ? `No.${listing.slaughterNo}` : null,
  ]
    .filter((v) => v && v !== "-")
    .join(" · ");

  return (
    <div className="flex flex-col">
      {/* 1. 판정 5칸 */}
      <div className="grid grid-cols-5 divide-x divide-line-soft border-y border-line-soft">
        <NumericCell label="근내지방" value={listing.marblingScore} />
        <NumericCell label="육색" value={listing.meatColor} />
        <NumericCell label="지방색" value={listing.fatColor} />
        <NumericCell label="조직감" value={listing.texture} />
        <NumericCell label="성숙도" value={listing.maturity} />
      </div>

      {/* 2. 지육 4칸 · 경락단가가 첫 칸 (여기서 가장 자주 보는 숫자) */}
      <div className="grid grid-cols-[1.25fr_1fr_1fr_1fr] divide-x divide-line-soft border-b border-line-soft">
        <NumericCell
          label="경락단가"
          value={
            listing.unitPrice
              ? NUMBER_FORMATTER.format(Math.round(listing.unitPrice))
              : null
          }
          unit="원/kg"
          emphasize
        />
        <NumericCell label="도체중" value={listing.carcassWeight} unit="kg" />
        <NumericCell label="등지방" value={listing.backFat} unit="mm" />
        <NumericCell label="등심면적" value={listing.eyeMuscle} unit="cm²" />
      </div>

      {/* 3. 개체·도축·유통 KV */}
      <dl className="flex flex-col gap-2 px-4 py-3">
        <InfoRow label="개체">{animalLine || "-"}</InfoRow>
        <InfoRow label="도축">{slaughterLine || "-"}</InfoRow>
        <InfoRow label="가공">
          {[listing.companyName, formatDate(listing.processDate)]
            .filter((v) => v && v !== "-")
            .join(" · ") || "-"}
        </InfoRow>
        {listing.processWeight ? (
          <InfoRow label="가공중량">{`${listing.processWeight}kg`}</InfoRow>
        ) : null}
        <InfoRow label="이력">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <TruncatedText
              value={formatTraceNo(listing.traceNo)}
              className="min-w-0 truncate tabular-nums"
            />
            <TraceInfoLink traceNo={listing.traceNo} asText />
          </span>
        </InfoRow>
        {children}
      </dl>
    </div>
  );
}

/**
 * 1열 정의 목록 행 · 라벨 고정폭(56px) + 값 좌측 정렬.
 * 값 열이 한 세로줄에 서서 위→아래 스캔이 빠르다.
 */
export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const stringValue = typeof children === "string" ? children : null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <dt className="w-14 shrink-0 text-[11px] font-medium text-content-faint">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[12px] font-semibold text-content">
        {stringValue ? (
          <TruncatedText
            value={stringValue}
            className="block truncate tabular-nums"
          />
        ) : (
          children
        )}
      </dd>
    </div>
  );
}

/**
 * 품질정보 셀 · 라벨 위 · 값 아래 세로 정렬.
 *
 * 좁은 폭에서 label:value 가로 배치보다 세로 배치가 스캔이 빠름
 * (모든 셀 값 자릿수를 시각적으로 정렬 가능).
 * `value` 는 숫자 또는 문자열(`"1++A(9)"` 같은 등급 라벨) 모두 지원.
 */
export function NumericCell({
  label,
  value,
  unit,
  emphasize = false,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  /** 표에서 가장 먼저 읽을 값 · 색만 한 단계 진하게 (크기는 동일) */
  emphasize?: boolean;
}) {
  const isEmpty =
    value == null || (typeof value === "string" && value.trim().length === 0);
  const hint = JUDGMENT_HINTS[label];

  const labelNode = (
    <span
      className={cn(
        "truncate text-[10px] font-medium leading-none text-content-faint",
        hint &&
          "cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2",
      )}
    >
      {label}
    </span>
  );

  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 px-3 py-2.5">
      {hint ? (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>{labelNode}</TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[220px] px-2.5 py-1.5 text-left"
          >
            <p className="text-[11px] font-bold">
              {label}{" "}
              <span className="font-medium text-primary-foreground/55">
                {hint.range}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-primary-foreground/80">
              {hint.reading}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        labelNode
      )}
      <span
        className={cn(
          "whitespace-nowrap text-[14px] font-bold leading-none tabular-nums",
          isEmpty
            ? "text-content-ghost"
            : emphasize
              ? "text-content"
              : "text-content",
        )}
      >
        {isEmpty ? "-" : value}
        {/* 단위는 숫자에 붙임 · `15mm` `98cm²` `520kg` · 경락단가 `원/kg` 와 동일 규칙 */}
        {unit && !isEmpty ? (
          <span className="text-[10px] font-medium text-content-faint">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function formatTraceNo(traceNo: string | null | undefined): string {
  if (!traceNo) return "-";
  const trimmed = traceNo.trim();
  if (trimmed.startsWith("002-") || trimmed.startsWith("002 ")) {
    return trimmed;
  }
  return `002-${trimmed}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "yyyy.MM.dd");
  } catch {
    return "-";
  }
}
