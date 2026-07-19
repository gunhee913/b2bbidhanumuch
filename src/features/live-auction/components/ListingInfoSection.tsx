"use client";

import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { LiveListing } from "../api";
import { cn } from "@/lib/utils";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

export interface ListingInfoSectionProps {
  listing: LiveListing;
  gradeLabel: string;
  className?: string;
}

/**
 * Trading Desk 스타일 상세 정보 블록.
 *
 * 가독성 개선 원칙:
 * - 섹션 헤더는 값 라벨과 확실히 차별화 (11px bold + 하단 hairline)
 * - 셀 사이 세로 divider 제거, 공백으로 구분
 * - 텍스트 셀은 좌측 정렬, 숫자 셀은 중앙 정렬
 * - 핵심 KPI (등급 · 근내지방 · 경락단가) 만 sky-600 emphasis
 */
export function ListingInfoSection({
  listing,
  gradeLabel,
  className,
}: ListingInfoSectionProps) {
  return (
    <div
      className={cn("flex h-full flex-col justify-between gap-2", className)}
    >
      <Section title="개체정보">
        <div className="grid grid-cols-[0.75fr_1fr_0.9fr_0.55fr_1.55fr] gap-x-3">
          <SpecCell label="가공업체">
            <span>{listing.companyName || "-"}</span>
          </SpecCell>
          <SpecCell label="축종 / 성별">
            <span>{listing.breed || "-"}</span>
            <span className="mx-1 text-slate-300">·</span>
            <span>{listing.gender || "-"}</span>
          </SpecCell>
          <SpecCell label="등급" emphasis>
            <span className="tabular-nums">{gradeLabel}</span>
          </SpecCell>
          <SpecCell label="개월령">
            {listing.monthAge ? (
              <>
                <span className="tabular-nums">{listing.monthAge}</span>
                <UnitSuffix>개월</UnitSuffix>
              </>
            ) : (
              "-"
            )}
          </SpecCell>
          <SpecCell label="이력번호">
            <span className="tabular-nums">
              {formatTraceNo(listing.traceNo)}
            </span>
          </SpecCell>
        </div>
      </Section>

      <Section title="품질정보">
        <div className="grid grid-cols-7 gap-x-3">
          <NumericCell label="등지방" value={listing.backFat} unit="mm" />
          <NumericCell label="등심면적" value={listing.eyeMuscle} unit="cm²" />
          <NumericCell
            label="근내지방"
            value={listing.marblingScore}
            emphasis
          />
          <NumericCell label="육색" value={listing.meatColor} />
          <NumericCell label="지방색" value={listing.fatColor} />
          <NumericCell label="조직감" value={listing.texture} />
          <NumericCell label="성숙도" value={listing.maturity} />
        </div>
      </Section>

      <Section title="도축정보">
        <div className="grid grid-cols-[1fr_1.2fr_0.85fr_0.7fr_1.45fr] gap-x-3">
          <SpecCell label="도축장">
            <span>{listing.slaughterHouse || "-"}</span>
          </SpecCell>
          <SpecCell label="도축일">
            <span className="tabular-nums">
              {formatDate(listing.slaughterDate)}
            </span>
          </SpecCell>
          <SpecCell label="도축번호">
            <span className="tabular-nums">{listing.slaughterNo || "-"}</span>
          </SpecCell>
          <SpecCell label="도체중">
            <span className="tabular-nums">
              {formatKg(listing.carcassWeight)}
            </span>
          </SpecCell>
          <SpecCell label="경락단가" emphasis>
            {listing.unitPrice ? (
              <>
                <span className="tabular-nums">
                  {NUMBER_FORMATTER.format(Math.round(listing.unitPrice))}
                </span>
                <UnitSuffix>원/kg</UnitSuffix>
              </>
            ) : (
              "-"
            )}
          </SpecCell>
        </div>
      </Section>

    </div>
  );
}

/**
 * 섹션 컨테이너.
 * - 헤더: 13px bold slate-900 + 하단 hairline (셀 라벨과 확실히 차별)
 * - 섹션 간: border-b hairline
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 py-3 first:pt-0 last:border-b-0">
      <h3 className="mb-2.5 border-b border-slate-200 pb-1.5 text-[11px] font-bold -tracking-[0.01em] text-slate-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * 텍스트 · 혼합값 셀. (개체정보 · 도축정보 · 가공정보)
 * - 라벨/값 모두 좌측 정렬 → 세로 스캔 쉬움
 * - emphasis: sky-600 · 17px · font-extrabold
 */
function SpecCell({
  label,
  children,
  emphasis,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          "min-h-[16px] whitespace-nowrap leading-none",
          emphasis
            ? "text-[14px] font-extrabold text-sky-600"
            : "text-[13px] font-bold text-slate-900",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * 순수 숫자 셀. (품질정보)
 * - 라벨/값 모두 중앙 정렬 → 짧은 정수/유닛 값이 시각적으로 균형 잡힘
 */
function NumericCell({
  label,
  value,
  unit,
  emphasis,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          "whitespace-nowrap leading-none tabular-nums",
          value == null
            ? "text-[15px] font-bold text-slate-300"
            : emphasis
              ? "text-[18px] font-extrabold text-sky-600"
              : "text-[15px] font-bold text-slate-900",
        )}
      >
        {value ?? "-"}
        {unit && value != null ? <UnitSuffix>{unit}</UnitSuffix> : null}
      </span>
    </div>
  );
}

/** 값 뒤에 붙는 단위 표기 (원/kg, mm, cm² 등). */
function UnitSuffix({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-0.5 text-[10px] font-medium text-slate-400">
      {children}
    </span>
  );
}

/**
 * 축산물 이력제(mtrace.go.kr) 개체 조회 링크.
 * - 이력번호가 있으면 해당 개체 조회로 이동
 * - 이력번호가 없거나 짧으면 mtrace 검색 페이지로 이동 (사용자가 직접 입력 가능)
 */
export function TraceInfoLink({
  traceNo,
}: {
  traceNo: string | null | undefined;
}) {
  const raw = (traceNo || "").replace(/[^0-9]/g, "");
  const digits = raw.length > 0 && !raw.startsWith("002") ? `002${raw}` : raw;
  const href =
    digits.length >= 10
      ? `https://www.mtrace.go.kr/mtracesearch/cattleNoSearch.do?cattleNo=${digits}`
      : "https://www.mtrace.go.kr/mtracesearch/cattleNoSearch.do";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      축산물 이력정보
    </a>
  );
}

/**
 * 국내 축산물 이력번호는 `002-XXXX-XXXX-X` 형식(국가코드 002 = 한국).
 * DB 값이 `002-` 접두어가 없으면 표시 시점에 붙여 준다.
 */
function formatTraceNo(traceNo: string | null | undefined): string {
  if (!traceNo) return "-";
  const trimmed = traceNo.trim();
  if (trimmed.startsWith("002-") || trimmed.startsWith("002 ")) {
    return trimmed;
  }
  return `002-${trimmed}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "yyyy.MM.dd");
  } catch {
    return "-";
  }
}

function formatKg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";
  return `${Math.round(value)}kg`;
}
