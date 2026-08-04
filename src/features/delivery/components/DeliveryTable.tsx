"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  formatWeightKg,
  formatWon,
  formatWonPerKg,
} from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";
import { EntityDetailDialog } from "@/features/live-auction/components/EntityDetailDialog";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import { PartnerCombobox } from "./PartnerCombobox";

export interface DeliveryTableProps {
  parts: WinningPart[];
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  dirtyAssignments: Record<string, string | null>;
  onChange: (partId: string, partnerId: string | null) => void;
  isLoading: boolean;
}

/**
 * 배송지시 테이블.
 *
 * - 저장 완료된 부위는 거래처 셀이 잠긴 상태로 표시 (딜러는 수정 불가)
 * - 미배정 행은 인라인 combobox 로 즉시 선택 · dirty 상태 시각화
 * - 낙찰가/낙찰금액/상장정보를 함께 노출해 배정 판단 문맥 제공
 * - 상단 필터: 가공업체 · 부위 · 등급 · 거래처 (`CompactFilterPill` 통일)
 */
export function DeliveryTable({
  parts,
  partners,
  savedAssignments,
  dirtyAssignments,
  onChange,
  isLoading,
}: DeliveryTableProps) {
  const { data: session } = useSession();
  const dealerId =
    session?.dealer?.id ?? session?.employee?.dealerId ?? null;

  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [partFilter, setPartFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [partnerFilter, setPartnerFilter] = useState<string>("");

  const [detailTarget, setDetailTarget] = useState<{
    listingNo: string;
    partNo: number | null;
  } | null>(null);

  const sorted = useMemo(
    () =>
      [...parts].sort((a, b) => {
        if (a.listingDate !== b.listingDate) {
          return a.listingDate < b.listingDate ? 1 : -1;
        }
        if (a.listingNo !== b.listingNo) {
          return a.listingNo.localeCompare(b.listingNo);
        }
        return a.partNo - b.partNo;
      }),
    [parts],
  );

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of sorted) {
      if (p.companyName) set.add(p.companyName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [sorted]);

  const partOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of sorted) {
      if (p.partName) set.add(p.partName);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "ko", { numeric: true }),
    );
  }, [sorted]);

  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of sorted) {
      const g = formatGradeLabel(
        p.grade,
        p.marbling > 0 ? p.marbling : null,
      );
      if (g) set.add(g);
    }
    return Array.from(set).sort();
  }, [sorted]);

  const partnerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of sorted) {
      const name = savedAssignments[p.partId]?.partnerName;
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [sorted, savedAssignments]);

  const filtered = useMemo(() => {
    return sorted.filter((p) => {
      if (companyFilter && p.companyName !== companyFilter) return false;
      if (partFilter && p.partName !== partFilter) return false;
      if (gradeFilter) {
        const g = formatGradeLabel(
          p.grade,
          p.marbling > 0 ? p.marbling : null,
        );
        if (g !== gradeFilter) return false;
      }
      if (partnerFilter) {
        const name = savedAssignments[p.partId]?.partnerName ?? "";
        if (name !== partnerFilter) return false;
      }
      return true;
    });
  }, [
    sorted,
    companyFilter,
    partFilter,
    gradeFilter,
    partnerFilter,
    savedAssignments,
  ]);

  const hasActiveFilter =
    companyFilter !== "" ||
    partFilter !== "" ||
    gradeFilter !== "" ||
    partnerFilter !== "";

  const resetFilters = () => {
    setCompanyFilter("");
    setPartFilter("");
    setGradeFilter("");
    setPartnerFilter("");
  };

  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2">
        <CompactFilterPill
          label="가공업체"
          value={companyFilter}
          onChange={setCompanyFilter}
          options={companyOptions}
        />
        <CompactFilterPill
          label="부위"
          value={partFilter}
          onChange={setPartFilter}
          options={partOptions}
        />
        <CompactFilterPill
          label="등급"
          value={gradeFilter}
          onChange={setGradeFilter}
          options={gradeOptions}
        />
        <CompactFilterPill
          label="거래처"
          value={partnerFilter}
          onChange={setPartnerFilter}
          options={partnerOptions}
        />
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            초기화
          </button>
        ) : null}
        <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-slate-500">
          총 {filtered.length}
          {hasActiveFilter ? (
            <span className="text-slate-400"> / {sorted.length}</span>
          ) : null}
          건
        </span>
      </div>

      <table className="w-full table-fixed text-sm">
        {/*
         * 컬럼 폭 설계 (11열) · 컨테이너 1176px (max-w-1240 · px-8) 에 정확히 맞춤:
         * - 전 컬럼 center 정렬 통일 · 격자 리듬 깔끔
         * - 거래처 · 200 → 160 (combobox 최소 요건 충족)
         * - 남는 폭은 다른 컬럼들에 균등 재분배 · sum = 1176
         */}
        <colgroup>
          <col className="w-[84px]" />
          <col className="w-[84px]" />
          <col className="w-[116px]" />
          <col className="w-[128px]" />
          <col className="w-[116px]" />
          <col className="w-[84px]" />
          <col className="w-[84px]" />
          <col className="w-[112px]" />
          <col className="w-[128px]" />
          <col className="w-[160px]" />
          <col className="w-[80px]" />
        </colgroup>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              낙찰일자
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              공판장
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              가공업체
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              상장번호
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              부위
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              등급
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              중량
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              낙찰단가
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              낙찰금액
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              배정 거래처
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              상태
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows colSpan={11} rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyRow
              colSpan={11}
              message={
                hasActiveFilter
                  ? "필터 조건에 해당하는 낙찰 부위가 없습니다."
                  : "조회기간 내 낙찰 부위가 없습니다."
              }
            />
          ) : (
            filtered.map((part) => {
              const saved = savedAssignments[part.partId] || null;
              const dirty = dirtyAssignments[part.partId];
              const isDirty = dirty !== undefined;
              const currentPartnerId =
                isDirty ? dirty : (saved?.partnerId ?? null);
              const isAssigned = !!saved;
              return (
                <DeliveryRow
                  key={part.partId}
                  part={part}
                  partners={partners}
                  savedName={saved?.partnerName ?? null}
                  currentPartnerId={currentPartnerId}
                  onChange={(v) => onChange(part.partId, v)}
                  isAssigned={isAssigned}
                  isDirty={isDirty}
                  onOpenDetail={() =>
                    setDetailTarget({
                      listingNo: part.listingNo,
                      partNo: part.partNo,
                    })
                  }
                />
              );
            })
          )}
        </tbody>
      </table>

      <EntityDetailDialog
        open={!!detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
        listingNo={detailTarget?.listingNo ?? null}
        focusPartNo={detailTarget?.partNo ?? null}
        dealerId={dealerId}
      />
    </div>
  );
}

function DeliveryRow({
  part,
  partners,
  savedName,
  currentPartnerId,
  onChange,
  isAssigned,
  isDirty,
  onOpenDetail,
}: {
  part: WinningPart;
  partners: Partner[];
  savedName: string | null;
  currentPartnerId: string | null;
  onChange: (partnerId: string | null) => void;
  isAssigned: boolean;
  isDirty: boolean;
  onOpenDetail: () => void;
}) {
  const gradeLabel = formatGradeLabel(
    part.grade,
    part.marbling > 0 ? part.marbling : null,
  );

  const displayDate = part.listingDate
    ? format(new Date(part.listingDate), "yy.MM.dd")
    : "-";
  const houseShort = part.slaughterHouse || "-";

  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors",
        isDirty ? "bg-amber-50/40" : "hover:bg-slate-50/60",
      )}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] tabular-nums text-slate-600">
        {displayDate}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-semibold text-slate-700">
        {houseShort}
      </td>
      <td
        className="truncate px-3 py-2.5 text-center align-middle text-[12px] text-slate-700"
        title={part.companyName || undefined}
      >
        {part.companyName || "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle">
        <ListingButton
          label={part.listingPartNo || part.listingNo}
          onClick={onOpenDetail}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[13px] font-semibold text-slate-900">
        {part.partName}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-semibold tabular-nums text-slate-800">
        {gradeLabel}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-xs tabular-nums text-slate-700">
        {formatWeightKg(part.weight)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] tabular-nums text-slate-700">
        {formatWonPerKg(part.bidPrice)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-bold tabular-nums text-sky-700">
        {formatWon(part.bidAmount)}
      </td>
      <td className="px-3 py-2.5 align-middle">
        {isAssigned ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-8 min-w-0 flex-1 items-center rounded bg-slate-50 px-2 text-[12px] font-bold text-slate-700">
              <span className="truncate">{savedName || "-"}</span>
            </span>
          </div>
        ) : (
          <PartnerCombobox
            partners={partners}
            value={currentPartnerId}
            onChange={onChange}
          />
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle">
        <StatusBadge
          state={
            isAssigned
              ? "assigned"
              : isDirty && currentPartnerId
                ? "dirty"
                : "unassigned"
          }
        />
      </td>
    </tr>
  );
}

/**
 * 상장번호 버튼 · 클릭 시 `EntityDetailDialog` 를 연다.
 *
 * 페이지 이동 없이 배송지시 컨텍스트를 유지한 채 개체 상세를 확인할 수 있음.
 */
function ListingButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-bold -tracking-[0.02em] tabular-nums text-sky-700 hover:underline"
    >
      {label}
    </button>
  );
}

function StatusBadge({
  state,
}: {
  state: "assigned" | "unassigned" | "dirty";
}) {
  if (state === "assigned") {
    return (
      <span className="inline-flex h-5 items-center rounded-sm bg-sky-100 px-1.5 text-[10px] font-bold leading-none text-sky-700">
        등록완료
      </span>
    );
  }
  if (state === "dirty") {
    return (
      <span className="inline-flex h-5 items-center rounded-sm bg-amber-100 px-1.5 text-[10px] font-bold leading-none text-amber-700">
        저장 필요
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center rounded-sm bg-slate-100 px-1.5 text-[10px] font-bold leading-none text-slate-500">
      미등록
    </span>
  );
}

function EmptyRow({
  colSpan,
  message = "조회기간 내 낙찰 부위가 없습니다.",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-[13px] text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

function SkeletonRows({
  colSpan,
  rows,
}: {
  colSpan: number;
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td colSpan={colSpan} className="px-3 py-3">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
