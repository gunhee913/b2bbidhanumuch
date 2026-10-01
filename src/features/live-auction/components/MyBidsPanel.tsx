"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import NumberFlow from "@number-flow/react";
import { useQueryClient } from "@tanstack/react-query";
import type { RoundInfo, RoundStatus } from "@/features/main/api";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { cn } from "@/lib/utils";
import { useMyBids, type MyBidEntry } from "../hooks/useMyBids";
import { useSideDock } from "../hooks/useSideDock";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { formatGradeLabel } from "../lib/grade";
import {
  formatKrw,
  formatWeightKg,
  formatWon,
  formatWonPerKg,
} from "../lib/masking";

type ViewMode = "entity" | "part";

const compareListingNo = (a: string, b: string) =>
  a.localeCompare(b, "ko", { numeric: true });

/**
 * 부위 그룹 키 · 좌/우 구분을 떼어 한 부위로 합친다 (`등심(좌)` · `등심(우1)` → `등심`).
 */
const normalizePartName = (name: string): string =>
  name.replace(/\s*\([좌우][^)]*\)\s*$/, "").trim();

const sumAmount = (list: MyBidEntry[]) =>
  list.reduce((sum, b) => sum + b.bidAmount, 0);

/** 회차 한 칸 · 그 회차에 넣은 것 전부와, 그 회차가 스스로 내는 숫자들 */
interface RoundSection {
  id: string;
  roundNo: number;
  status: RoundStatus;
  bids: MyBidEntry[];
  openCount: number;
  wonCount: number;
  lostCount: number;
  /** 머리에 적는 금액 · 진행 중이면 넣은 돈, 마감이면 **딴** 돈 */
  amount: number;
}

/**
 * 회차별로 가른다 · 진행 중인 회차가 맨 위, 그 아래로 마감이 최근 순.
 *
 * 입찰 상태(대기/낙찰/미낙찰)를 따로 가르지 않는 이유는 그게 회차에서 그대로 나오기
 * 때문이다 — `rank` 는 회차를 닫을 때 박히므로 **열린 회차의 입찰은 전부 대기이고
 * 닫힌 회차의 입찰은 전부 결과**다. 예전엔 「입찰현황/경매결과」 탭과 회차 칩을 함께
 * 뒀는데, 같은 것을 두 축으로 물으니 탭은 0 건인데 칩은 6 건이라고 적는 일이 생겼다.
 *
 * 입찰이 하나도 없는 회차는 접는다. 다만 지금 열린 회차만은 비어도 내놓는다 —
 * 「이번 회차엔 아직 안 넣었다」 는 것도 봐야 할 상태다.
 */
function buildRoundSections(
  rounds: RoundInfo[],
  bids: MyBidEntry[],
): RoundSection[] {
  const byRound = new Map<string, MyBidEntry[]>();
  bids.forEach((b) => {
    if (!b.auctionId) return;
    const list = byRound.get(b.auctionId);
    if (list) list.push(b);
    else byRound.set(b.auctionId, [b]);
  });

  return rounds
    .filter((r) => byRound.has(r.id) || r.status === "open")
    .map((r) => {
      const list = byRound.get(r.id) ?? [];
      const open = list.filter((b) => b.rank == null);
      const won = list.filter((b) => b.rank != null && b.isWinning);
      const lost = list.filter((b) => b.rank != null && !b.isWinning);
      return {
        id: r.id,
        roundNo: r.round_no,
        status: r.status,
        bids: list,
        openCount: open.length,
        wonCount: won.length,
        lostCount: lost.length,
        amount: open.length > 0 ? sumAmount(open) : sumAmount(won),
      };
    })
    .sort((a, b) => {
      const live = Number(b.status === "open") - Number(a.status === "open");
      return live !== 0 ? live : b.roundNo - a.roundNo;
    });
}

/** 한 회차 안 · 접수번호로 묶고, 묶음 안은 부위번호 순 */
function groupByListing(bids: MyBidEntry[]) {
  const map = new Map<
    string,
    { listing: NonNullable<MyBidEntry["listing"]>; bids: MyBidEntry[] }
  >();
  bids.forEach((b) => {
    if (!b.listing) return;
    const hit = map.get(b.listing.id);
    if (hit) hit.bids.push(b);
    else map.set(b.listing.id, { listing: b.listing, bids: [b] });
  });
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      bids: [...g.bids].sort(
        (a, b) => (a.part?.partNo ?? 0) - (b.part?.partNo ?? 0),
      ),
    }))
    .sort((a, b) => compareListingNo(a.listing.listingNo, b.listing.listingNo));
}

/**
 * 부위별은 회차를 가로지른다 · 「오늘 등심 몇 개 잡았나」 가 이 보기의 물음이라,
 * 회차로 갈라 놓으면 세 칸을 더해야 답이 나온다. 대신 줄마다 회차를 적는다.
 */
function groupByPart(bids: MyBidEntry[]) {
  const map = new Map<string, { partName: string; bids: MyBidEntry[] }>();
  bids.forEach((b) => {
    if (!b.part) return;
    const key = normalizePartName(b.part.partName);
    const hit = map.get(key);
    if (hit) hit.bids.push(b);
    else map.set(key, { partName: key, bids: [b] });
  });
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      bids: [...g.bids].sort((a, b) => b.bidAmount - a.bidAmount),
    }))
    .sort(
      (a, b) =>
        sumAmount(b.bids) - sumAmount(a.bids) ||
        a.partName.localeCompare(b.partName, "ko"),
    );
}

export interface MyBidsPanelProps {
  dealerId: string | null;
  listingDate: string;
  allRounds: RoundInfo[];
  /** 회차 행·마감 알림에서 들어올 때 · 그 회차를 펴고 보이는 데까지 굴린다 */
  focusRoundId?: string | null;
  /** `partNo` 를 주면 그 부위를 집어 놓고 연다 · 줄마다 어느 부위인지 알고 있다 */
  onNavigateListing?: (listingId: string, partNo?: number | null) => void;
  /** 빈 상태의 「경매장에서 입찰하기」 · 도크를 접고 표로 돌려보낸다 */
  onClose: () => void;
}

export function MyBidsPanel({
  dealerId,
  listingDate,
  allRounds,
  focusRoundId,
  onNavigateListing,
  onClose,
}: MyBidsPanelProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("entity");
  const { data: bids = [], isLoading } = useMyBids(dealerId, listingDate);

  useRealtimeBids({
    onBidChange: () => {
      queryClient.invalidateQueries({ queryKey: ["live-auction", "my-bids"] });
    },
  });

  const sections = useMemo(
    () => buildRoundSections(allRounds, bids),
    [allRounds, bids],
  );
  const partGroups = useMemo(() => groupByPart(bids), [bids]);

  /** 회차 → 회차번호 · 부위별 보기가 줄마다 어느 회차인지 적는 데 쓴다 */
  const roundNoById = useMemo(() => {
    const map = new Map<string, number>();
    allRounds.forEach((r) => map.set(r.id, r.round_no));
    return map;
  }, [allRounds]);

  /*
   * 펴고 접은 상태는 도크 저장소가 들고 있다 · 개체를 옮기면 방이 다시 그려져
   * 패널 제 상태는 날아간다. 직접 손댄 회차만 담기므로, 나머지는 늘 제 기본값
   * (진행 중은 펴고 마감은 접고)을 따른다.
   */
  const openRounds = useSideDock((s) => s.myBidsOpenRounds);
  const setRoundOpen = useSideDock((s) => s.setMyBidsRoundOpen);
  const isOpenSection = useCallback(
    (s: RoundSection) => openRounds[s.id] ?? s.status === "open",
    [openRounds],
  );

  /* 회차를 지목해 들어왔으면 그 칸을 펴고 눈에 보이는 데까지 굴린다 */
  const focusRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!focusRoundId) return;
    setRoundOpen(focusRoundId, true);
    const id = setTimeout(
      () => focusRef.current?.scrollIntoView({ block: "nearest" }),
      60,
    );
    return () => clearTimeout(id);
  }, [focusRoundId, setRoundOpen]);

  const openBids = bids.filter((b) => b.rank == null);
  const wonBids = bids.filter((b) => b.rank != null && b.isWinning);

  return (
    <section aria-label="내 입찰" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 px-4 pb-1.5 pt-2.5">
        <h2 className="text-[13px] font-bold text-content">내 입찰</h2>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </header>

      {/* 하루 전체 셈 · 아래 회차 칸들을 더한 값이라, 접어 둔 채로도 오늘이 읽힌다 */}
      {bids.length > 0 ? (
        <p className="flex items-baseline gap-1.5 truncate px-4 pb-2 text-[11px] tabular-nums text-content-faint">
          {openBids.length > 0 ? (
            <span>
              대기 {openBids.length}건{" "}
              <NumberFlow
                value={sumAmount(openBids)}
                locales="ko-KR"
                suffix="원"
                willChange
              />
            </span>
          ) : null}
          {openBids.length > 0 && wonBids.length > 0 ? <span>·</span> : null}
          {wonBids.length > 0 ? (
            <span className="font-semibold text-won">
              낙찰 {wonBids.length}건 {formatWon(sumAmount(wonBids))}
            </span>
          ) : null}
        </p>
      ) : null}

      <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-[12px] text-content-faint">
            불러오는 중…
          </p>
        ) : bids.length === 0 ? (
          <EmptyState onGoBid={onClose} />
        ) : viewMode === "entity" ? (
          <ul className="pb-2">
            {sections.map((section) => (
              <RoundBlock
                key={section.id}
                ref={section.id === focusRoundId ? focusRef : undefined}
                section={section}
                open={isOpenSection(section)}
                onToggle={() =>
                  setRoundOpen(section.id, !isOpenSection(section))
                }
                onNavigateListing={onNavigateListing}
              />
            ))}
          </ul>
        ) : (
          <ul className="px-2 pb-2">
            {partGroups.map((group) => (
              <PartBlock
                key={group.partName}
                partName={group.partName}
                bids={group.bids}
                roundNoById={roundNoById}
                onNavigateListing={onNavigateListing}
              />
            ))}
          </ul>
        )}
      </OverlayScroll>
    </section>
  );
}

/**
 * 회차 한 칸 · 머리를 눌러 접고 편다.
 *
 * 진행 중인 회차는 펴진 채로, 마감된 회차는 접힌 채로 시작한다. 지금 손댈 수 있는
 * 것은 하나뿐이고 나머지는 「확인하는 것」 이라, 열어 둘 이유가 다르다.
 */
function RoundBlock({
  ref,
  section,
  open,
  onToggle,
  onNavigateListing,
}: {
  /* 지목해 들어온 회차를 굴려 올릴 때만 쓴다 · React 19 라 forwardRef 가 필요 없다 */
  ref?: Ref<HTMLLIElement>;
  section: RoundSection;
  open: boolean;
  onToggle: () => void;
  onNavigateListing?: (listingId: string, partNo?: number | null) => void;
}) {
  const live = section.status === "open";
  const groups = useMemo(() => groupByListing(section.bids), [section.bids]);

  const facts: string[] = [];
  if (section.openCount > 0) facts.push(`${section.openCount}건 대기`);
  if (section.wonCount > 0) facts.push(`낙찰 ${section.wonCount}`);
  if (section.lostCount > 0) facts.push(`미낙찰 ${section.lostCount}`);

  return (
    <li ref={ref} className="border-b border-line-soft last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-surface-accent"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            {live ? <LiveDot /> : null}
            <span className="text-[12.5px] font-bold tabular-nums text-content">
              {section.roundNo}회차
            </span>
            <span className="text-[11px] text-content-faint">
              {live ? "진행 중" : "마감"}
            </span>
          </span>
          <span className="truncate text-[11px] tabular-nums text-content-faint">
            {facts.length > 0 ? facts.join(" · ") : "아직 없음"}
          </span>
        </span>
        {section.amount > 0 ? (
          <span
            className={cn(
              "shrink-0 text-[12.5px] font-bold tabular-nums",
              live ? "text-content" : "text-won",
            )}
          >
            {formatWon(section.amount)}
          </span>
        ) : null}
      </button>

      {open && groups.length > 0 ? (
        <div className="pb-1.5">
          {groups.map(({ listing, bids }) => (
            <div key={listing.id}>
              {/* 접수번호는 묶는 이름표일 뿐 · 금액은 아래 줄들이 들고 있다 */}
              <div className="flex items-center gap-1 px-3 pb-0.5 pt-1.5">
                <span className="text-[11px] font-semibold tabular-nums text-content-soft">
                  {listing.listingNo}
                </span>
                <span className="text-[11px] tabular-nums text-content-ghost">
                  {formatGradeLabel(listing.grade, listing.marblingScore)}
                </span>
                {onNavigateListing ? (
                  <NavigateLink
                    onClick={() => onNavigateListing(listing.id)}
                    label={`${listing.listingNo} 경매장에서 열기`}
                  />
                ) : null}
              </div>
              <ul>
                {bids.map((b) => (
                  <BidRow
                    key={b.id}
                    bid={b}
                    primary={b.part?.partName ?? "-"}
                    onNavigate={
                      onNavigateListing
                        ? () =>
                            onNavigateListing(
                              listing.id,
                              b.part?.partNo ?? null,
                            )
                        : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/** 부위 한 칸 · 회차를 가로지르므로 줄마다 회차가 붙는다 */
function PartBlock({
  partName,
  bids,
  roundNoById,
  onNavigateListing,
}: {
  partName: string;
  bids: MyBidEntry[];
  roundNoById: Map<string, number>;
  onNavigateListing?: (listingId: string, partNo?: number | null) => void;
}) {
  const won = bids.filter((b) => b.rank != null && b.isWinning);
  const facts = [`${bids.length}건`];
  if (won.length > 0) facts.push(`낙찰 ${won.length}`);

  return (
    <li className="pb-1.5">
      <div className="flex items-baseline justify-between gap-2 px-2 pb-0.5 pt-2">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[12.5px] font-bold text-content">
            {partName}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-content-faint">
            {facts.join(" · ")}
          </span>
        </span>
        <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-content">
          {formatWon(sumAmount(bids))}
        </span>
      </div>
      <ul>
        {bids.map((b) => (
          <BidRow
            key={b.id}
            bid={b}
            primary={b.listing?.listingNo ?? "-"}
            round={b.auctionId ? roundNoById.get(b.auctionId) : undefined}
            onNavigate={
              onNavigateListing && b.listing
                ? () => onNavigateListing(b.listing!.id, b.part?.partNo ?? null)
                : undefined
            }
          />
        ))}
      </ul>
    </li>
  );
}

/**
 * 입찰 한 줄 · 왼쪽은 무엇에 넣었나, 오른쪽은 얼마나.
 *
 * 예전엔 단가와 금액을 84/92px 고정 칸에 세워 뒀는데, 그건 400px 짜리 떠 있는 판을
 * 재고 짠 값이다. 304px 안에서는 왼쪽에 80px 밖에 안 남아 「등심 12.4kg」 조차
 * 잘렸다. 단가를 금액 아래가 아니라 **왼쪽 설명에 섞어** 두면 한 줄에 다 들어간다.
 *
 * 미낙찰만 둘째 줄을 받는다. 떨어진 입찰을 다시 보는 이유는 「얼마에 갔나, 다음엔
 * 얼마를 얹어야 하나」 라서, 내 입찰가만 있고 낙찰가가 없으면 볼 이유가 없는 줄이다.
 * 차액을 따로 적는 것은 그 뺄셈이 곧 다음 회차에 올릴 금액이기 때문이다.
 *
 * 줄 전체가 누름단추다 — 화살표 아이콘만 과녁으로 두면 16px 를 겨눠야 하고, 한 회차에
 * 스무 줄이 서는 판이라 늘 띄워 두면 아이콘이 숫자보다 많아진다. 올렸을 때만 보인다.
 */
function BidRow({
  bid,
  primary,
  round,
  onNavigate,
}: {
  bid: MyBidEntry;
  primary: string;
  round?: number;
  onNavigate?: () => void;
}) {
  const lost = bid.rank != null && !bid.isWinning;
  const won = bid.rank != null && bid.isWinning;

  const meta: string[] = [];
  if (round) meta.push(`${round}회차`);
  const weight = formatWeightKg(bid.part?.weight ?? null);
  if (weight !== "-") meta.push(weight);
  meta.push(formatWonPerKg(bid.bidPrice));

  /* 낙찰가는 회차를 닫을 때 부위에 박힌다 (`cattle_parts.bid_price`, 원/kg) */
  const winPrice = lost ? (bid.part?.bidPrice ?? null) : null;
  const gap =
    winPrice != null && winPrice > bid.bidPrice
      ? winPrice - bid.bidPrice
      : null;

  const body = (
    <>
      <div className="flex items-baseline gap-2">
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span
            className={cn(
              "shrink-0 text-[12px] font-semibold tabular-nums",
              lost ? "text-content-soft" : "text-content",
            )}
          >
            {primary}
          </span>
          <span className="min-w-0 truncate text-[10.5px] tabular-nums text-content-faint">
            {meta.join(" · ")}
          </span>
          {onNavigate ? (
            <ArrowUpRight
              className="h-3 w-3 shrink-0 text-content-ghost opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={2.25}
            />
          ) : null}
        </span>
        <span
          className={cn(
            "shrink-0 text-[12px] font-bold tabular-nums",
            lost && "text-content-faint line-through decoration-line",
            won && "text-won",
            !lost && !won && "text-content",
          )}
        >
          {formatWon(bid.bidAmount)}
        </span>
      </div>
      {winPrice != null && winPrice > 0 ? (
        <p className="text-[10.5px] tabular-nums text-content-faint">
          낙찰 {formatWonPerKg(winPrice)}
          {gap != null ? (
            <span className="pl-1.5 font-bold text-lost">
              −{formatKrw(gap)}
            </span>
          ) : null}
        </p>
      ) : null}
    </>
  );

  return (
    <li>
      {onNavigate ? (
        <button
          type="button"
          onClick={onNavigate}
          title={`${primary} 경매장에서 열기`}
          className="group block w-full py-[3px] pl-6 pr-3 text-left transition-colors hover:bg-surface-accent"
        >
          {body}
        </button>
      ) : (
        <div className="py-[3px] pl-6 pr-3">{body}</div>
      )}
    </li>
  );
}

/** 진행 중 표시 · 숨 쉬는 점 하나면 「지금」 이 읽힌다 */
function LiveDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="묶는 기준"
      className="inline-flex shrink-0 items-center rounded-md bg-surface-accent p-0.5"
    >
      {(
        [
          { id: "entity", label: "개체별" },
          { id: "part", label: "부위별" },
        ] as const
      ).map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[11px] font-bold transition-colors",
              active
                ? "bg-surface text-content shadow-sm"
                : "text-content-soft hover:text-content-mid",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NavigateLink({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-content-ghost transition-colors hover:bg-surface-accent hover:text-content"
    >
      <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
    </button>
  );
}

/** 빈 칸은 위쪽에 둔다 · 세로로 긴 판에서 가운데 맞추면 안내가 화면 한복판에 떠 있다 */
function EmptyState({ onGoBid }: { onGoBid: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 pb-6 pt-12 text-center">
      <ClipboardList className="h-5 w-5 text-content-ghost" />
      <p className="text-[12.5px] font-semibold text-content-soft">
        오늘 넣은 입찰이 없습니다
      </p>
      <button
        type="button"
        onClick={onGoBid}
        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-inverse px-3 text-[12px] font-bold text-inverse-content transition-colors hover:opacity-90"
      >
        경매장에서 입찰하기
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}
