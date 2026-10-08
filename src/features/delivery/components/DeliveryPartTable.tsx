"use client";

import { ArrowDown, ArrowUpDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { NoteMark } from "@/features/live-auction/components/SheetParts";
import { DELIVERY_DEADLINE_LABEL } from "../lib/deadline";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import {
  effectivePartnerId,
  UNASSIGNED_KEY,
  type PartGroup,
} from "../lib/groupWinningParts";
import { PartnerCombobox } from "./PartnerCombobox";

/** 행 표식 · 값은 부위 id · 커서가 짚은 줄을 찾아 굴릴 때 쓴다 */
const ROW_ATTR = "data-delivery-row";

/**
 * 표가 제 모습을 지키는 바닥 폭 · 고정 열 합 848 + 주소 110.
 *
 * 전에는 1036 이었다. 눈금 제한(`DeliveryRoom` 의 `maxPaneWidth`)이 표에 그만큼을
 * 떼어 주긴 하는데, 그건 **떼어 줄 것이 있을 때** 얘기다. 창이 1414(사진 370 + 눈금
 * 8 + 표 1036)보다 좁으면 사진판이 제 바닥에 걸려 더 못 양보하고, 거기서부터 표가
 * 판 안에서 가로로 밀렸다. 1440 노트북이 딱 그 밑이라 늘 가로 막대를 달고 있었다.
 *
 * 그래서 열마다 **실제로 들어가는 글자**로 다시 쟀다 (아래 각 열 주석). 눈대중으로
 * 올려 잡아 둔 여유가 열 곱하기 7~18px 씩 쌓여 78px 이었다. 이제 1336(≈1440 창)
 * 까지는 가로 막대가 안 생긴다.
 *
 * 그보다 좁아지면 표를 구겨 넣지 않고 판 안에서 가로로 민다. `table-fixed` 라 폭이
 * 줄면 모든 열이 같은 비율로 줄어드는데, 그러면 어느 열 하나가 못 읽게 되는 게 아니라
 * 열 전부가 조금씩 뭉개진다 — 밀어서 보는 편이 낫다.
 */
export const DELIVERY_TABLE_MIN_WIDTH = 958;

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
  /** 부위별 메모 · 모서리 자국용 (`DeliveryRoom` 이 들고 있는 것을 그대로 받는다) */
  getNote: (partId: string) => string | null;
  /** 상장일 마감이 지났는가 · 시간이 흐르면 바뀌므로 부르는 쪽이 지금 시각을 쥔다 */
  isLocked: (part: WinningPart) => boolean;
  onCursor: (partId: string) => void;
  onAssign: (partId: string, partnerId: string | null) => void;
  /** 거래처 머리글이 「미정 먼저」 로 켜져 있는가 */
  undecidedFirst: boolean;
  /** 없으면 머리글이 눌리지 않는다 · 거래처별은 묶음이 이미 미정을 맨 위에 둔다 */
  onToggleUndecidedFirst?: () => void;
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
  getNote,
  isLocked,
  onCursor,
  onAssign,
  undecidedFirst,
  onToggleUndecidedFirst,
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
    <table
      style={{ minWidth: DELIVERY_TABLE_MIN_WIDTH }}
      className="w-full table-fixed text-[12.5px] font-semibold text-content"
    >
      {/*
       * 폭은 저마다 **가장 긴 값 + 좌우 여백 16** 이다. 칸 글자 크기가 11.5 와 12.5
       * 두 가지라 글자 수가 같아도 폭이 다르다 — 접수번호(11.5)는 열세 자에 94 면
       * 되는데 연락처(12.5)는 같은 열세 자에 102 가 든다.
       */}
      <colgroup>
        {/* 「261002-101-02」 13자 · 11.5px */}
        <col className="w-[94px]" />
        {/* 「정직한고기」 다섯 자 · 11.5px · 더 길면 자른다 */}
        <col className="w-[76px]" />
        {/* 「토시·제비」 다섯 자 · 12.5px */}
        <col className="w-[80px]" />
        {/* 「1++A(9)」 */}
        <col className="w-[66px]" />
        {/* 숫자 세 열은 단위를 달고 있다 · 「10.1kg」 「95,204원」 「1,234,567원」 */}
        <col className="w-[60px]" />
        <col className="w-[72px]" />
        <col className="w-[92px]" />
        {/* 고르는 상자 · 거래처 이름 + 펼침 화살표 */}
        <col className="w-[150px]" />
        {/* 세 글자 이름 */}
        <col className="w-[56px]" />
        {/* 「010-1234-5678」 13자 · 12.5px */}
        <col className="w-[102px]" />
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
          <th
            className={cn(HEAD, GROUP_START, "text-left")}
            aria-sort={undecidedFirst ? "other" : undefined}
          >
            {onToggleUndecidedFirst ? (
              <PartnerSortButton
                active={undecidedFirst}
                onToggle={onToggleUndecidedFirst}
              />
            ) : (
              "거래처"
            )}
          </th>
          <th className={cn(HEAD, "text-left")}>대표</th>
          <th className={cn(HEAD, "text-left")}>연락처</th>
          <th className={cn(HEAD, "text-left")}>주소</th>
        </tr>
      </thead>

      {groups.map((group) => (
        <tbody key={group.key}>
          <GroupHead
            group={group}
            savedAssignments={savedAssignments}
            dirtyAssignments={dirtyAssignments}
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
              note={getNote(part.partId)}
              locked={isLocked(part)}
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
 * 거래처 머리글 · 누를 때마다 「기본 순서」 ↔ 「미정 먼저」.
 *
 * 가나다 정렬은 두지 않는다 — 거래처 이름으로 줄 세우는 일은 「거래처별」 묶기가 한다.
 * 다른 머리글은 눌리지 않으므로 이 칸만 화살표를 달아 눌린다는 것을 먼저 알린다.
 */
function PartnerSortButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const Icon = active ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={active ? "기본 순서로 되돌리기" : "미정을 맨 위로"}
      className="-mx-1 inline-flex items-center gap-1 rounded px-1 transition-colors hover:bg-surface-accent"
    >
      거래처
      <Icon
        className={cn(
          "h-3 w-3 shrink-0",
          active ? "text-content-mid" : "text-content-ghost",
        )}
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
  );
}

/** 묶음 머리 · 이름과 소계만 적는다 */
function GroupHead({
  group,
  savedAssignments,
  dirtyAssignments,
}: {
  group: PartGroup;
  savedAssignments: Record<string, AssignmentInfo>;
  dirtyAssignments: Record<string, string | null>;
}) {
  const undecided = group.rows.filter(
    (r) => !effectivePartnerId(r.partId, savedAssignments, dirtyAssignments),
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
      <td colSpan={4} className={cn("px-2 py-1", GROUP_START)} />
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
  note,
  locked,
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
  /** 이 부위에 남긴 메모 · 없으면 null · 모서리 자국을 띄우는 데만 쓴다 */
  note: string | null;
  /** 상장일 마감이 지났는가 · 중도매인은 이때부터 읽기만 한다 */
  locked: boolean;
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
  const partnerName = useSnapshot ? saved.partnerName : (chosen?.name ?? "");
  const address = useSnapshot ? saved.address : (chosen?.address ?? "");

  return (
    /*
     * 짚는 건 누를 때만 · 지나가는 것만으로는 안 바뀐다 (경매장 부위표와 같다).
     *
     * 처음엔 `onMouseEnter` 로 뒀다. 줄 위를 훑기만 해도 왼쪽 사진이 따라 바뀌니
     * 빠르게 둘러보기엔 좋았는데, 표를 가로로 밀거나 아래 줄의 거래처 칸을 누르러
     * 가는 길에 지나친 줄로 사진이 바뀌어 버렸다. 보려던 개체가 손이 거쳐 간
     * 마지막 줄로 밀리는 셈이라, 사진을 띄워 놓고 값을 읽는 동안 내내 불안하다.
     *
     * `onFocus` 는 남긴다 — 줄 안 거래처 칸으로 탭해 들어가면 짚은 줄도 같이 와야
     * 키보드로 배정할 때 왼쪽 사진이 딴 개체를 비추지 않는다.
     */
    <tr
      {...{ [ROW_ATTR]: part.partId }}
      onClick={onCursor}
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
      {/* 메모 자국 · 사진 위 쪽지는 커서가 지나가면 사라져, 어느 줄에 썼는지 표가 기억한다 */}
      <td className={cn(CELL, "relative truncate text-left")}>
        {part.partName}
        <NoteMark body={note} />
      </td>
      <td className={cn(CELL, "text-left text-content-mid")}>
        {formatGradeLabel(part.grade, part.marbling > 0 ? part.marbling : null)}
      </td>
      <td className={cn(CELL, "text-right text-content-mid")}>
        <Measured
          value={part.weight > 0 ? part.weight.toFixed(1) : "-"}
          unit="kg"
        />
      </td>
      <td className={cn(CELL, "text-right text-content-mid")}>
        <Measured value={formatKrw(part.bidPrice)} unit="원" />
      </td>
      <td className={cn(CELL, "text-right font-bold")}>
        <Measured value={formatKrw(part.bidAmount)} unit="원" />
      </td>
      <td className={cn(CELL, GROUP_START, "relative")}>
        {/* 저장 바가 「변경 n건」 이라고만 하면 그 n 건이 어디인지 찾을 길이 없다 */}
        {dirty ? (
          <span
            aria-label="저장 전"
            className="absolute inset-y-0 left-0 w-[2px] bg-pending"
          />
        ) : null}
        {locked ? (
          /*
           * 마감이 지난 줄 · 고를 상자 대신 글자만 둔다.
           *
           * 상자를 두고 막기만 하면 눌러 보고 나서야 안 된다는 걸 안다. 자물쇠는
           * 왜 안 되는지를 누르기 전에 말한다 — 올리면 마감 시각까지 알려 준다.
           */
          <span
            title={`상장일 ${DELIVERY_DEADLINE_LABEL} 마감 · 수정은 관리자에게 요청해 주세요`}
            className="flex h-7 items-center gap-1 text-[12px]"
          >
            <Lock
              className="h-3 w-3 shrink-0 text-content-ghost"
              strokeWidth={2.25}
              aria-hidden
            />
            <span
              className={cn(
                "min-w-0 truncate",
                partnerName
                  ? "font-semibold text-content-mid"
                  : "text-content-ghost",
              )}
            >
              {partnerName || "미지정"}
            </span>
          </span>
        ) : (
          <PartnerCombobox
            partners={partners}
            value={partnerId}
            onChange={onAssign}
          />
        )}
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

/**
 * 숫자 + 단위 · 단위는 숫자보다 작고 흐리게 (경매장 표 `PriceUnit` 과 같은 규칙).
 *
 * 머리글에 단위를 적는 길도 있지만 이 표는 그렇게 안 한다. 배송지시는 보는 화면이자
 * 거래처에 불러 주는 문장이라 「10.1 킬로에 93만 7천원」 이 한 줄에서 읽혀야 하고,
 * 묶음 머리 소계가 이미 `22.8kg · 2,311,200원` 으로 단위를 달고 있어 줄마다 없으면
 * 소계만 단위가 붙은 꼴이 된다.
 *
 * 값이 없으면 단위를 뺀다 — 「-원」 은 0원처럼 읽힌다.
 */
function Measured({ value, unit }: { value: string; unit: string }) {
  if (value === "-") return <span className="text-content-ghost">-</span>;
  return (
    <>
      {value}
      <span className="pl-0.5 text-[11px] font-medium text-content-faint">
        {unit}
      </span>
    </>
  );
}
