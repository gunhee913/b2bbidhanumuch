"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, ChevronDown, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { formatTraceNo } from "@/features/live-auction/components/ListingInfoSection";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import { computeEntityProgress, type DeliveryEntity } from "../lib/groupByEntity";
import { PartnerCombobox } from "./PartnerCombobox";

export interface DeliveryEntityCardProps {
  entity: DeliveryEntity;
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  dirtyAssignments: Record<string, string | null>;
  /** 부위 필터 · 비어 있으면 전체 */
  partFilter: string;
  open: boolean;
  onToggle: () => void;
  onChangePart: (partId: string, partnerId: string | null) => void;
  /** 이 개체의 미배정(저장 전) 부위 전체에 같은 거래처 적용 */
  onApplyAll: (partIds: string[], partnerId: string) => void;
  onOpenPhotos: () => void;
}

/**
 * 배송지시 · 개체 카드.
 *
 * - 헤더 2줄 · ① 상장번호 · 등급 · 업체 · 성별/개월/도체중 + 우측 내 낙찰 요약 ② 등급판정 7항목 + 이력번호
 * - 본문 · 내 낙찰 부위만 (부위 · 중량 · 단가 · 금액 | 거래처 · 대표 · 주소) · 단위는 헤더
 *   - 대표·주소 · 저장 완료면 저장 스냅샷, 저장 전이면 선택한 거래처 마스터
 *   - 저장 완료 행 · 좌측 sky 바 + 거래처명 읽기 전용
 *   - 변경(dirty) 행 · amber 틴트 · 콤보박스
 *   - 미배정 행 · 콤보박스
 * - 푸터 · `미배정 n건 → [거래처] 전체 적용` + 소계
 * - 배정이 모두 끝난 개체는 접혀서 시작 (부모가 결정) · 헤더에 ✓
 */
export function DeliveryEntityCard({
  entity,
  partners,
  savedAssignments,
  dirtyAssignments,
  partFilter,
  open,
  onToggle,
  onChangePart,
  onApplyAll,
  onOpenPhotos,
}: DeliveryEntityCardProps) {
  const progress = useMemo(
    () => computeEntityProgress(entity, savedAssignments, dirtyAssignments),
    [entity, savedAssignments, dirtyAssignments],
  );
  const gradeLabel = formatGradeLabel(entity.grade, entity.marbling > 0 ? entity.marbling : null);
  const cover = entity.images[0] ?? null;

  const visibleParts = useMemo(
    () => (partFilter ? entity.parts.filter((p) => p.partName === partFilter) : entity.parts),
    [entity.parts, partFilter],
  );
  const applyTargets = useMemo(
    () => visibleParts.filter((p) => !savedAssignments[p.partId]).map((p) => p.partId),
    [visibleParts, savedAssignments],
  );

  const meta = [
    [entity.gender, entity.monthAge ? `${entity.monthAge}개월` : null].filter(Boolean).join(" "),
    entity.carcassWeight ? `도체중 ${entity.carcassWeight}kg` : null,
    entity.slaughterDate ? `도축일 ${entity.slaughterDate.slice(0, 10).replaceAll("-", ".")}` : null,
  ].filter(Boolean) as string[];

  const quality: [string, string][] = [
    ["근내지방", entity.marbling > 0 ? `${entity.marbling}` : "-"],
    ["육색", entity.meatColor > 0 ? `${entity.meatColor}` : "-"],
    ["지방색", entity.fatColor > 0 ? `${entity.fatColor}` : "-"],
    ["조직감", entity.texture > 0 ? `${entity.texture}` : "-"],
    ["성숙도", entity.maturity > 0 ? `${entity.maturity}` : "-"],
    ["등지방두께", entity.backFat > 0 ? `${entity.backFat}mm` : "-"],
    ["등심면적", entity.eyeMuscle > 0 ? `${entity.eyeMuscle}㎠` : "-"],
  ];

  return (
    <li
      className={cn(
        "border border-line bg-surface transition-colors",
        progress.done && !open && "border-slate-200/80 bg-slate-50/40",
        progress.pending > 0 && "border-amber-300",
      )}
    >
      {/* ── 헤더 ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-slate-50/70"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (cover) onOpenPhotos();
          }}
          disabled={!cover}
          aria-label="개체 사진 보기"
          className="relative h-12 w-12 shrink-0 overflow-hidden bg-surface-accent ring-1 ring-line enabled:hover:ring-sky-400 disabled:cursor-default"
        >
          {cover ? (
            <Image src={cover} alt={`${entity.listingNo} 등심 단면`} fill sizes="44px" className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-content-ghost">
              <ImageOff className="h-4 w-4" strokeWidth={1.5} />
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-tight">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-extrabold tabular-nums -tracking-[0.02em] text-content">
              {entity.listingNo}
            </span>
            <span className="text-[14px] font-bold tabular-nums text-content">{gradeLabel}</span>
            {entity.companyName ? (
              <span className="text-[12.5px] font-medium text-content-mid">{entity.companyName}</span>
            ) : null}
            {meta.length > 0 ? (
              <span className="text-[12.5px] tabular-nums text-content-mid">
                <span className="mx-1 text-content-ghost">·</span>
                {meta.join(" · ")}
              </span>
            ) : null}
          </div>
          <dl className="mt-0.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[12px] tabular-nums">
            {quality.map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="text-content-soft">{label}</dt>
                <dd className={cn("font-semibold text-content", label === "근내지방" && "text-content")}>
                  {value}
                </dd>
              </div>
            ))}
            {entity.traceNo ? (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-content-soft">이력번호</dt>
                <dd className="font-semibold text-content">{formatTraceNo(entity.traceNo)}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {/* 우측 · 내 낙찰 요약 + 진행 */}
        <div className="flex shrink-0 items-center gap-4 pt-0.5">
          <div className="text-right leading-tight">
            <div className="text-[12px] tabular-nums text-content-mid">
              내 낙찰 <b className="font-bold text-content">{entity.parts.length}</b>건
              <span className="mx-1.5 text-content-ghost">·</span>
              <b className="font-bold text-content">{formatKrw(entity.totalAmount)}</b>
              <span className="text-content-faint">원</span>
            </div>
            <div className="mt-0.5 text-[11.5px] tabular-nums">
              {progress.done ? (
                <span className="inline-flex items-center gap-1 font-bold text-sky-700">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  배정 완료
                </span>
              ) : (
                <>
                  {progress.saved > 0 ? (
                    <span className="text-content-soft">
                      완료 <b className="font-semibold text-content-mid">{progress.saved}</b>
                    </span>
                  ) : null}
                  {progress.pending > 0 ? (
                    <span className={cn(progress.saved > 0 && "ml-2", "text-amber-700")}>
                      저장 전 <b className="font-semibold">{progress.pending}</b>
                    </span>
                  ) : null}
                  {progress.unassigned > 0 ? (
                    <span className={cn((progress.saved > 0 || progress.pending > 0) && "ml-2", "text-rose-600")}>
                      미배정 <b className="font-bold">{progress.unassigned}</b>
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-content-faint transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </div>
      </div>

      {/* ── 본문 ── */}
      {open ? (
        <div className="border-t border-line-soft px-4 pb-3 pt-2">
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col className="w-[116px]" />
              <col className="w-[92px]" />
              <col className="w-[72px]" />
              <col className="w-[96px]" />
              <col className="w-[104px]" />
              <col className="w-[212px]" />
              <col className="w-[84px]" />
              <col />
            </colgroup>
            <thead className="text-[11px] font-semibold text-content-soft">
              <tr>
                <th className={cn(HEAD, "text-left")}>상장번호</th>
                <th className={cn(HEAD, "text-left")}>부위</th>
                <th className={cn(HEAD, "text-right")}>중량 (kg)</th>
                <th className={cn(HEAD, "text-right")}>낙찰단가 (원/kg)</th>
                <th className={cn(HEAD, "text-right")}>낙찰금액 (원)</th>
                <th className={cn(HEAD, GROUP_START, "text-left")}>배송 거래처</th>
                <th className={cn(HEAD, "text-left")}>대표</th>
                <th className={cn(HEAD, "text-left")}>주소</th>
              </tr>
            </thead>
            <tbody>
              {visibleParts.map((part) => (
                <PartRow
                  key={part.partId}
                  part={part}
                  partners={partners}
                  saved={savedAssignments[part.partId] ?? null}
                  dirtyValue={dirtyAssignments[part.partId]}
                  onChange={(v) => onChangePart(part.partId, v)}
                />
              ))}
              {visibleParts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[12px] text-content-faint">
                    필터에 해당하는 부위가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {/* 푸터 · 전체 적용 + 소계 */}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line-soft pt-2.5">
            {applyTargets.length > 0 ? (
              <div className="flex items-center gap-2 text-[12px] text-content-mid">
                <span>
                  이 개체 미배정{" "}
                  <b className="font-bold tabular-nums text-content">{applyTargets.length}</b>건
                </span>
                <span className="text-content-ghost">→</span>
                <div className="w-[220px]">
                  <PartnerCombobox
                    partners={partners}
                    value={null}
                    onChange={(id) => {
                      if (id) onApplyAll(applyTargets, id);
                    }}
                    placeholder="거래처 선택 · 전체 적용"
                  />
                </div>
              </div>
            ) : (
              <span className="text-[12px] text-content-faint">
                {progress.done ? "모든 부위 배정이 저장되었습니다." : "저장 전 변경 사항이 있습니다."}
              </span>
            )}
            <div className="text-[12px] tabular-nums text-content-soft">
              소계 <b className="font-bold text-content">{formatKrw(entity.totalAmount)}</b>
              <span className="text-content-faint">원</span>
              <span className="mx-1.5 text-content-ghost">·</span>
              {entity.totalWeight.toFixed(1)}
              <span className="text-content-faint">kg</span>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

const HEAD = "whitespace-nowrap border-b border-line px-2.5 py-1.5";
const CELL = "whitespace-nowrap px-2.5 py-1.5 align-middle tabular-nums";
/** 낙찰 정보 ↔ 배송 정보 그룹 경계 · 경매장 테이블과 같은 문법 */
const GROUP_START = "border-l border-line pl-4";

function PartRow({
  part,
  partners,
  saved,
  dirtyValue,
  onChange,
}: {
  part: WinningPart;
  partners: Partner[];
  saved: AssignmentInfo | null;
  dirtyValue: string | null | undefined;
  onChange: (partnerId: string | null) => void;
}) {
  const isSaved = !!saved;
  const isDirty = dirtyValue !== undefined;
  const currentPartnerId = isDirty ? dirtyValue : null;
  const pending = currentPartnerId ? partners.find((p) => p.id === currentPartnerId) ?? null : null;

  // 저장 완료면 저장된 스냅샷, 저장 전이면 선택한 거래처 마스터에서 가져온다
  const representative = saved?.representative ?? pending?.representative ?? "";
  const address = saved?.address ?? pending?.address ?? "";

  return (
    <tr
      className={cn(
        "border-b border-line-soft last:border-b-0",
        isSaved && "bg-sky-50/40",
        !isSaved && isDirty && "bg-amber-50/70",
      )}
    >
      <td className={cn(CELL, "text-left text-content-soft -tracking-[0.02em]")}>
        {part.listingPartNo || `${part.listingNo}-${String(part.partNo).padStart(2, "0")}`}
      </td>
      <td className={cn(CELL, "text-left font-semibold text-content")}>{part.partName}</td>
      <td className={cn(CELL, "text-right text-content-mid")}>{part.weight.toFixed(1)}</td>
      <td className={cn(CELL, "text-right text-content-mid")}>{formatKrw(part.bidPrice)}</td>
      <td className={cn(CELL, "text-right font-bold text-content")}>{formatKrw(part.bidAmount)}</td>
      <td className={cn(CELL, GROUP_START)}>
        {isSaved ? (
          <div className="flex h-7 items-center gap-2 border-l-[3px] border-sky-500 pl-2">
            <span className="truncate text-[12px] font-bold text-content">{saved.partnerName}</span>
            <span className="shrink-0 text-[10.5px] text-content-faint">등록완료</span>
          </div>
        ) : (
          <PartnerCombobox partners={partners} value={currentPartnerId} onChange={onChange} />
        )}
      </td>
      <td className={cn(CELL, "text-left", representative ? "text-content-mid" : "text-content-ghost")}>
        {representative || "-"}
      </td>
      <td
        className={cn(CELL, "min-w-0 truncate text-left", address ? "text-content-mid" : "text-content-ghost")}
        title={address || undefined}
      >
        {address || "-"}
      </td>
    </tr>
  );
}
