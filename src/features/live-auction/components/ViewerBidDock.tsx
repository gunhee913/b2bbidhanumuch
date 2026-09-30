"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import type { SheetBidding } from "./SheetParts";
import type { SheetBidEntry } from "../hooks/useSheetBidding";
import { extractSide, toPartGroupName } from "../lib/partGrouping";
import {
  BID_INPUT_ATTR,
  BID_KEY_HINT,
  BID_SCOPE_ATTR,
  handleBidKeyDown,
} from "../lib/bidKeys";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

/** 펼친 목록의 최대 높이 · 19행을 다 펼치면 레일을 덮어 사진·등급이 안 보인다 */
const LIST_MAX_HEIGHT = 208;

function isSettled(part: LivePart): boolean {
  return part.allBids.some((b) => b.rank != null);
}

/**
 * 개체 뷰어 하단 고정 입찰 독.
 *
 * 사진과 등급을 보고 값을 정한 그 자리에서 바로 써넣게 한다. 다이얼로그를 닫고
 * 표에서 같은 행을 다시 찾는 왕복이 입찰 한 건마다 붙으면 회차(10분) 안에 다 못 돈다.
 *
 *  - 기본은 **지금 보고 있는 부위 한 건** · 좌/우가 둘 다 상장됐으면 독 안에서 고른다
 *  - 나머지 부위는 접어 둔다 · 펼치면 한 칸씩 채워 넣고 「N건 입찰」 로 한 번에 보낸다
 *  - 키 계약은 상장표 셀과 같다 (`bidKeys`) · Enter 입찰 · Esc 되돌리기 · +/- 100 · Shift+↑↓ 1,000
 *  - `BID_SCOPE_ATTR` 로 ↑/↓ 이동 범위를 독 안으로 끊는다 · 뒤에 깔린 상장표로 새지 않게
 */
export function ViewerBidDock({
  listing,
  partGroup,
  bidding,
  canBid,
  blockReason,
}: {
  listing: LiveListing;
  /** 레일 차트가 보고 있는 부위 그룹 · 독의 기본 대상도 여기를 따른다 */
  partGroup: string;
  bidding: SheetBidding;
  /** 딜러 세션 유무 · 없으면 입력 대신 안내를 띄운다 */
  canBid: boolean;
  /** 회차 마감 등 개체 단위 차단 사유 */
  blockReason?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sidePartId, setSidePartId] = useState<string | null>(null);

  /** 보고 있는 부위의 상장분 · 좌/우가 따로 상장되면 둘이 된다 */
  const sameGroup = listing.parts.filter(
    (p) => toPartGroupName(p.partName) === partGroup,
  );
  const primary =
    sameGroup.find((p) => p.id === sidePartId) ?? sameGroup[0] ?? null;
  const others = listing.parts.filter((p) => p.id !== primary?.id);

  const batchKey = `viewerDock:${listing.id}`;
  const otherEntries: SheetBidEntry[] = others.map((part) => ({
    listing,
    part,
  }));
  const dirtyOthers = bidding.dirtyOf(others);
  const batchSubmitting = bidding.isBatchSubmitting(batchKey);

  if (!primary) return null;

  return (
    <section
      {...{ [BID_SCOPE_ATTR]: "" }}
      aria-label="입찰"
      className="shrink-0 border-t border-white/[0.07] bg-[#0f0f12]/60"
    >
      {blockReason ? (
        <p className="px-5 py-3 text-[12px] font-semibold text-amber-300/90">
          {blockReason}
        </p>
      ) : !canBid ? (
        <p className="px-5 py-3 text-[12px] font-medium text-white/45">
          로그인하면 이 화면에서 바로 입찰할 수 있습니다.
        </p>
      ) : (
        <>
          <div className="px-5 pb-3 pt-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              {sameGroup.length > 1 ? (
                <SideToggle
                  parts={sameGroup}
                  activeId={primary.id}
                  onChange={setSidePartId}
                />
              ) : (
                <span className="text-[12px] font-bold text-white">
                  {primary.partName}
                </span>
              )}
              <span className="text-[11px] font-medium tabular-nums text-white/45">
                {primary.weight ? `${primary.weight}kg` : "중량 미정"}
                {primary.minPrice ? (
                  <span className="pl-2">
                    최저 {NUMBER_FORMATTER.format(primary.minPrice)}
                  </span>
                ) : null}
              </span>
            </div>

            <PrimaryBidRow listing={listing} part={primary} bidding={bidding} />
          </div>

          <div className="border-t border-white/[0.07]">
            <div className="flex items-center justify-between gap-3 px-5 py-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/55 transition-colors hover:text-white"
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
                이 개체 다른 부위 {others.length}개
              </button>

              {dirtyOthers.length > 0 ? (
                <button
                  type="button"
                  disabled={batchSubmitting}
                  onClick={() =>
                    bidding.submitBatch(
                      batchKey,
                      otherEntries,
                      listing.listingNo,
                    )
                  }
                  className="inline-flex h-7 items-center gap-1.5 bg-white px-3 text-[11.5px] font-bold text-[#17171c] transition-colors hover:bg-white/85 disabled:opacity-50"
                >
                  {batchSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {dirtyOthers.length}건 입찰
                </button>
              ) : null}
            </div>

            {expanded ? (
              <ul
                className="overflow-y-auto border-t border-white/[0.07]"
                style={{ maxHeight: LIST_MAX_HEIGHT }}
              >
                {others.map((part) => (
                  <li
                    key={part.id}
                    className="flex items-center gap-2 border-b border-white/[0.04] px-5 py-1.5 last:border-b-0"
                  >
                    <span className="w-[86px] shrink-0 truncate text-[11.5px] font-semibold text-white/80">
                      {part.partName}
                    </span>
                    <span className="w-[52px] shrink-0 text-right text-[11px] tabular-nums text-white/40">
                      {part.weight ? `${part.weight}kg` : "-"}
                    </span>
                    <span className="flex-1 text-right text-[11px] tabular-nums text-white/40">
                      {part.minPrice
                        ? NUMBER_FORMATTER.format(part.minPrice)
                        : "-"}
                    </span>
                    <DockBidInput
                      listing={listing}
                      part={part}
                      bidding={bidding}
                      compact
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

/** 좌/우 선택 · 한 부위가 두 짝으로 상장되면 값이 서로 달라 따로 넣는다 */
function SideToggle({
  parts,
  activeId,
  onChange,
}: {
  parts: LivePart[];
  activeId: string;
  onChange: (partId: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-white/[0.07] p-0.5">
      {parts.map((part) => {
        const isActive = part.id === activeId;
        return (
          <button
            key={part.id}
            type="button"
            onClick={() => onChange(part.id)}
            aria-pressed={isActive}
            className={cn(
              "h-6 px-2.5 text-[11.5px] font-bold transition-colors",
              isActive
                ? "bg-white text-[#17171c]"
                : "text-white/55 hover:text-white",
            )}
          >
            {extractSide(part.partName) ?? part.partName}
          </button>
        );
      })}
    </div>
  );
}

/** 기본 부위 한 줄 · 입력 + 예상 경락대금 + 입찰/취소 */
function PrimaryBidRow({
  listing,
  part,
  bidding,
}: {
  listing: LiveListing;
  part: LivePart;
  bidding: SheetBidding;
}) {
  const state = bidding.cellState(part.id);
  const price = bidding.effectivePrice(part);
  const mine = bidding.myOpenBid(part);
  const settled = isSettled(part);
  const total = price && part.weight ? Math.round(price * part.weight) : null;

  if (settled) {
    return (
      <p className="py-1.5 text-[12px] font-semibold text-white/50">
        마감된 부위입니다 · 결과는 내 입찰에서 확인하세요
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <DockBidInput listing={listing} part={part} bidding={bidding} />
        <button
          type="button"
          disabled={state.pending}
          onClick={() => bidding.submitOne(listing, part)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 bg-white px-5 text-[13px] font-bold text-[#17171c] transition-colors hover:bg-white/85 disabled:opacity-50"
        >
          {state.pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {mine ? "입찰 변경" : "입찰"}
        </button>
        {mine ? (
          <button
            type="button"
            disabled={state.pending}
            onClick={() => bidding.cancelOne(listing, part)}
            className="inline-flex h-10 shrink-0 items-center px-2.5 text-[12px] font-semibold text-white/45 transition-colors hover:text-rose-300 disabled:opacity-50"
          >
            취소
          </button>
        ) : null}
      </div>

      <p className="mt-2 flex items-center gap-2 text-[11.5px] font-medium tabular-nums text-white/45">
        {total ? (
          <span>
            예상 경락대금{" "}
            <span className="font-bold text-white/85">
              {NUMBER_FORMATTER.format(total)}원
            </span>
          </span>
        ) : (
          <span>단가를 넣으면 예상 경락대금이 나옵니다</span>
        )}
        {state.error ? (
          <span role="alert" className="font-semibold text-rose-300">
            {state.error}
          </span>
        ) : null}
      </p>
    </>
  );
}

/** 먹색 레일용 입력칸 · 키 계약은 상장표 셀과 동일 */
function DockBidInput({
  listing,
  part,
  bidding,
  compact = false,
}: {
  listing: LiveListing;
  part: LivePart;
  bidding: SheetBidding;
  compact?: boolean;
}) {
  const state = bidding.cellState(part.id);
  const price = bidding.effectivePrice(part);
  const saved = bidding.myOpenBid(part)?.bidPrice ?? null;
  const dirty = bidding.isDirty(part);
  const settled = isSettled(part);
  const belowMin =
    price != null &&
    part.minPrice != null &&
    price > 0 &&
    price < part.minPrice;

  const step = (delta: number) =>
    bidding.setDraft(
      part.id,
      Math.max(0, (price ?? part.minPrice ?? 0) + delta),
    );

  return (
    <div className={cn("relative", compact ? "w-[84px]" : "flex-1")}>
      <input
        {...{ [BID_INPUT_ATTR]: "" }}
        type="text"
        inputMode="numeric"
        value={price != null && price > 0 ? NUMBER_FORMATTER.format(price) : ""}
        placeholder={
          part.minPrice ? NUMBER_FORMATTER.format(part.minPrice) : "0"
        }
        disabled={settled || state.pending}
        aria-label={`${part.partName} 내 입찰가`}
        title={BID_KEY_HINT}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
          bidding.setDraft(part.id, digits ? Number(digits) : null);
        }}
        onKeyDown={(e) =>
          handleBidKeyDown(e, {
            onSubmit: () => bidding.submitOne(listing, part),
            onRevert: () => bidding.clearDraft(part.id),
            onStep: step,
          })
        }
        className={cn(
          "w-full border bg-white/[0.06] text-right font-bold tabular-nums text-white outline-none transition-colors",
          "placeholder:font-medium placeholder:text-white/25",
          "disabled:cursor-not-allowed disabled:bg-transparent disabled:text-white/30",
          compact ? "h-7 px-2 text-[12px]" : "h-10 pl-3 pr-12 text-[17px]",
          state.error
            ? "border-rose-400/80"
            : belowMin
              ? "border-orange-400/80"
              : dirty
                ? "border-orange-400/80"
                : saved
                  ? "border-white/40"
                  : "border-white/15 focus:border-white/50",
        )}
      />
      {!compact ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-white/35">
          원/kg
        </span>
      ) : null}
    </div>
  );
}
