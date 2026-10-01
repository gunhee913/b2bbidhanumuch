"use client";

import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import {
  effectivePartnerId,
  UNASSIGNED_KEY,
  type PartGroup,
} from "../lib/groupWinningParts";
import { PartnerCombobox } from "./PartnerCombobox";

/** 행 표식 · 값은 부위 id · 커서가 짚은 줄을 찾아 굴릴 때 쓴다 */
const ROW_ATTR = "data-delivery-row";

export function scrollDeliveryRowIntoView(partId: string): boolean {
  const row = document.querySelector(`[${ROW_ATTR}="${CSS.escape(partId)}"]`);
  if (!row) return false;
  row.scrollIntoView({ block: "nearest" });
  return true;
}

const HEAD =
  "whitespace-nowrap border-b border-line bg-surface-muted px-2 py-1.5 text-[11.5px] font-medium text-content-faint";
const CELL = "whitespace-nowrap px-2 py-1 align-middle tabular-nums";
/** 낙찰 ↔ 배송 경계 · 경매장 표가 「내 입찰 | 결과」 를 가르는 것과 같은 문법 */
const GROUP_START = "border-l border-l-line pl-3";

export interface DeliveryPartTableProps {
  groups: PartGroup[];
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  dirtyAssignments: Record<string, string | null>;
  cursorPartId: string | null;
  onCursor: (partId: string) => void;
  onAssign: (partId: string, partnerId: string | null) => void;
  onAssignGroup: (partIds: string[], partnerId: string | null) => void;
  isLoading: boolean;
}

/**
 * 오른쪽 표 · 왼쪽 열은 「얼마에 땄나」, 오른쪽 열은 「어디로 가나」.
 *
 * 경매장 표와 같은 문법이다 — 거기서 「내 입찰 | 결과」 를 세로선으로 가르듯 여기선
 * 「낙찰 | 배송」 을 가른다. 화면을 갈아탔다는 느낌 없이 한 문장이 끝까지 이어진다.
 *
 * 저장된 행도 잠그지 않는다. 예전 화면은 저장되면 칸을 읽기 전용으로 바꿔서, 거래처를
 * 잘못 넣으면 고칠 길이 화면에 없었다 — API 는 처음부터 수정을 받고 있었는데도.
 */
export function DeliveryPartTable({
  groups,
  partners,
  savedAssignments,
  dirtyAssignments,
  cursorPartId,
  onCursor,
  onAssign,
  onAssignGroup,
  isLoading,
}: DeliveryPartTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-7 animate-pulse rounded bg-surface-accent"
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="px-6 py-16 text-center text-[13px] text-content-faint">
        이 기간에 낙찰받은 부위가 없습니다.
      </p>
    );
  }

  return (
    <table className="w-full table-fixed text-[12.5px] font-semibold text-content">
      <colgroup>
        <col className="w-[100px]" />
        <col className="w-[88px]" />
        <col className="w-[84px]" />
        <col className="w-[72px]" />
        <col className="w-[56px]" />
        <col className="w-[78px]" />
        <col className="w-[88px]" />
        <col className="w-[156px]" />
        <col className="w-[64px]" />
        <col className="w-[104px]" />
        {/* 주소만 남는 폭을 가져간다 · 길이를 미리 못 박을 수 없는 유일한 칸이다 */}
        <col />
      </colgroup>
      <thead className="sticky top-0 z-10">
        <tr>
          <th className={cn(HEAD, "text-left")}>접수번호</th>
          <th className={cn(HEAD, "text-left")}>상장업체</th>
          <th className={cn(HEAD, "text-left")}>부위</th>
          <th className={cn(HEAD, "text-left")}>등급</th>
          <th className={cn(HEAD, "text-right")}>중량</th>
          <th className={cn(HEAD, "text-right")}>낙찰단가</th>
          <th className={cn(HEAD, "text-right")}>낙찰금액</th>
          <th className={cn(HEAD, GROUP_START, "text-left")}>거래처</th>
          <th className={cn(HEAD, "text-left")}>대표</th>
          <th className={cn(HEAD, "text-left")}>연락처</th>
          <th className={cn(HEAD, "text-left")}>주소</th>
        </tr>
      </thead>

      {groups.map((group) => (
        <tbody key={group.key}>
          <GroupHead
            group={group}
            partners={partners}
            savedAssignments={savedAssignments}
            dirtyAssignments={dirtyAssignments}
            onAssignGroup={onAssignGroup}
          />
          {group.rows.map((part) => (
            <PartRow
              key={part.partId}
              part={part}
              partners={partners}
              saved={savedAssignments[part.partId] ?? null}
              partnerId={effectivePartnerId(
                part.partId,
                savedAssignments,
                dirtyAssignments,
              )}
              dirty={dirtyAssignments[part.partId] !== undefined}
              isCursor={part.partId === cursorPartId}
              onCursor={() => onCursor(part.partId)}
              onAssign={(v) => onAssign(part.partId, v)}
            />
          ))}
        </tbody>
      ))}
    </table>
  );
}

/**
 * 묶음 머리 · 여기서 고르면 묶음이 통째로 간다.
 *
 * 예전엔 이 조작이 카드 푸터에 숨어 있었고 **미배정만** 대상이었다. 머리로 올리고
 * 이미 정해진 것까지 덮게 했다 — 「등심은 전부 A집으로 다시」 가 한 번에 돼야 한다.
 */
function GroupHead({
  group,
  partners,
  savedAssignments,
  dirtyAssignments,
  onAssignGroup,
}: {
  group: PartGroup;
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  dirtyAssignments: Record<string, string | null>;
  onAssignGroup: (partIds: string[], partnerId: string | null) => void;
}) {
  const partIds = group.rows.map((r) => r.partId);
  const undecided = partIds.filter(
    (id) => !effectivePartnerId(id, savedAssignments, dirtyAssignments),
  ).length;

  return (
    <tr className="border-b border-line-soft bg-surface-muted/60">
      <td colSpan={7} className="px-2 py-1.5">
        <span className="flex items-baseline gap-2">
          <span className="text-[13px] font-bold text-content">
            {group.title}
          </span>
          {group.subtitle ? (
            <span className="text-[11.5px] font-semibold tabular-nums text-content-mid">
              {group.subtitle}
            </span>
          ) : null}
          <span className="text-[11px] tabular-nums text-content-faint">
            {group.rows.length}건 · {group.totalWeight.toFixed(1)}kg ·{" "}
            {formatKrw(group.totalAmount)}원
          </span>
          {/* 거래처별의 「미정」 묶음은 제목이 이미 그 말이라 꼬리표를 달지 않는다 */}
          {undecided > 0 && group.key !== UNASSIGNED_KEY ? (
            <span className="text-[11px] font-semibold tabular-nums text-lost">
              미정 {undecided}
            </span>
          ) : null}
        </span>
      </td>
      <td colSpan={4} className={cn("px-2 py-1", GROUP_START)}>
        <span className="flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] text-content-faint">일괄</span>
          <span className="w-[156px]">
            <PartnerCombobox
              partners={partners}
              value={null}
              onChange={(id) => onAssignGroup(partIds, id)}
              placeholder="이 묶음 전체"
            />
          </span>
        </span>
      </td>
    </tr>
  );
}

function PartRow({
  part,
  partners,
  saved,
  partnerId,
  dirty,
  isCursor,
  onCursor,
  onAssign,
}: {
  part: WinningPart;
  partners: Partner[];
  saved: AssignmentInfo | null;
  partnerId: string | null;
  /** 저장 전 손댄 줄인가 · 저장 바가 셀 대상 */
  dirty: boolean;
  isCursor: boolean;
  onCursor: () => void;
  onAssign: (partnerId: string | null) => void;
}) {
  /*
   * 대표·연락처는 저장된 것이면 그때 찍힌 값, 고르는 중이면 거래처 마스터에서 가져온다.
   * 저장 뒤에 거래처가 이사를 가도 그날 보낸 주소는 그대로 남아야 한다.
   */
  const chosen = partnerId
    ? (partners.find((p) => p.id === partnerId) ?? null)
    : null;
  const useSnapshot = !dirty && saved?.partnerId === partnerId;
  const representative = useSnapshot
    ? saved.representative
    : (chosen?.representative ?? "");
  const phone = useSnapshot ? saved.phone : (chosen?.phone ?? "");
  const address = useSnapshot ? saved.address : (chosen?.address ?? "");

  return (
    <tr
      {...{ [ROW_ATTR]: part.partId }}
      onMouseEnter={onCursor}
      onFocus={onCursor}
      aria-selected={isCursor}
      className={cn(
        "cursor-pointer border-b border-line-soft transition-colors",
        isCursor ? "bg-surface-accent" : "hover:bg-surface-muted",
      )}
    >
      <td className={cn(CELL, "text-left text-[11.5px] text-content-soft")}>
        {part.listingPartNo ||
          `${part.listingNo}-${String(part.partNo).padStart(2, "0")}`}
      </td>
      <td
        className={cn(
          CELL,
          "truncate text-left text-[11.5px] font-medium",
          part.companyName ? "text-content-mid" : "text-content-ghost",
        )}
        title={part.companyName || undefined}
      >
        {part.companyName || "-"}
      </td>
      <td className={cn(CELL, "truncate text-left")}>{part.partName}</td>
      <td className={cn(CELL, "text-left text-content-mid")}>
        {formatGradeLabel(part.grade, part.marbling > 0 ? part.marbling : null)}
      </td>
      <td className={cn(CELL, "text-right text-content-mid")}>
        {part.weight.toFixed(1)}
      </td>
      <td className={cn(CELL, "text-right text-content-mid")}>
        {formatKrw(part.bidPrice)}
      </td>
      <td className={cn(CELL, "text-right font-bold")}>
        {formatKrw(part.bidAmount)}
      </td>
      <td className={cn(CELL, GROUP_START, "relative")}>
        {/* 저장 바가 「변경 n건」 이라고만 하면 그 n 건이 어디인지 찾을 길이 없다 */}
        {dirty ? (
          <span
            aria-label="저장 전"
            className="absolute inset-y-0 left-0 w-[2px] bg-pending"
          />
        ) : null}
        <PartnerCombobox
          partners={partners}
          value={partnerId}
          onChange={onAssign}
        />
      </td>
      <td
        className={cn(
          CELL,
          "truncate text-left",
          representative ? "text-content-mid" : "text-content-ghost",
        )}
      >
        {representative || "-"}
      </td>
      <td
        className={cn(
          CELL,
          "truncate text-left",
          phone ? "text-content-mid" : "text-content-ghost",
        )}
      >
        {phone || "-"}
      </td>
      {/* 주소는 길어서 거의 늘 잘린다 · 전체는 짚으면 뜬다 */}
      <td
        className={cn(
          CELL,
          "truncate text-left text-[11.5px] font-medium",
          address ? "text-content-soft" : "text-content-ghost",
        )}
        title={address || undefined}
      >
        {address || "-"}
      </td>
    </tr>
  );
}
