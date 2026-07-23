"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  formatWeightKg,
  formatWon,
  formatWonPerKg,
} from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
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
 */
export function DeliveryTable({
  parts,
  partners,
  savedAssignments,
  dirtyAssignments,
  onChange,
  isLoading,
}: DeliveryTableProps) {
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

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[1080px] table-fixed text-sm">
        <colgroup>
          <col className="w-[86px]" />
          <col className="w-[68px]" />
          <col className="w-[124px]" />
          <col className="w-[110px]" />
          <col className="w-[62px]" />
          <col className="w-[62px]" />
          <col className="w-[108px]" />
          <col className="w-[112px]" />
          <col className="w-[220px]" />
          <col className="w-[74px]" />
        </colgroup>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-3 py-2.5 text-left">
              낙찰일자
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-left">
              공판장
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-left">
              상장번호
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-left">
              부위
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              등급
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-right">
              중량
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-right">
              낙찰단가
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-right">
              낙찰금액
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-left">
              배정 거래처
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              상태
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows colSpan={10} rows={6} />
          ) : sorted.length === 0 ? (
            <EmptyRow colSpan={10} />
          ) : (
            sorted.map((part) => {
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
                />
              );
            })
          )}
        </tbody>
      </table>
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
}: {
  part: WinningPart;
  partners: Partner[];
  savedName: string | null;
  currentPartnerId: string | null;
  onChange: (partnerId: string | null) => void;
  isAssigned: boolean;
  isDirty: boolean;
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
      <td className="whitespace-nowrap px-3 py-2.5 text-left align-middle text-[12px] tabular-nums text-slate-600">
        {displayDate}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-left align-middle text-[12px] font-semibold text-slate-700">
        {houseShort}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-left align-middle">
        <Link
          href={`/auction/${part.listingNo}`}
          className="text-[12px] font-bold -tracking-[0.02em] tabular-nums text-sky-700 hover:underline"
        >
          {part.listingPartNo || part.listingNo}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-left align-middle text-[13px] font-semibold text-slate-900">
        {part.partName}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-semibold tabular-nums text-slate-800">
        {gradeLabel}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-xs tabular-nums text-slate-700">
        {formatWeightKg(part.weight)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] tabular-nums text-slate-700">
        {formatWonPerKg(part.bidPrice)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] font-bold tabular-nums text-sky-700">
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

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-[13px] text-slate-400"
      >
        조회기간 내 낙찰 부위가 없습니다.
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
