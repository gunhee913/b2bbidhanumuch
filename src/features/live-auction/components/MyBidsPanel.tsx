"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
import { formatKrw, formatWeightKg, formatWon } from "../lib/masking";

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

/** 줄 설명에 붙는 개체 사정 · 등급과 중량, 모르는 값은 빼고 */
const listingDetails = (b: MyBidEntry): string[] =>
  [
    formatGradeLabel(b.listing?.grade, b.listing?.marblingScore),
    formatWeightKg(b.part?.weight ?? null),
  ].filter((s) => s !== "-");

/** 회차 한 칸 · 그 회차에 넣은 것 전부와, 그 회차가 스스로 내는 숫자들 */
interface RoundSection {
  id: string;
  roundNo: number;
  status: RoundStatus;
  bids: MyBidEntry[];
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

/**
 * 한 회차 안 · 접수번호 순, 같은 개체 안은 부위번호 순.
 *
 * 개체마다 띠를 깔아 묶지 않는다 — 입찰 1건짜리 개체도 띠 한 줄을 더 먹어 세로가 배로
 * 늘었다. 이 순서면 같은 개체가 저절로 붙어 서고, 접수번호는 줄마다 설명에 적힌다.
 */
function sortByListing(bids: MyBidEntry[]) {
  return bids
    .filter((b) => b.listing)
    .sort(
      (a, b) =>
        compareListingNo(
          a.listing?.listingNo ?? "",
          b.listing?.listingNo ?? "",
        ) || (a.part?.partNo ?? 0) - (b.part?.partNo ?? 0),
    );
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

  return (
    <section aria-label="내 입찰" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 px-4 pb-1.5 pt-2.5">
        <h2 className="text-[13px] font-bold text-content">내 입찰</h2>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </header>

      {/* 하루 전체 셈 · 아래 회차 칸들을 더한 값이라, 접어 둔 채로도 오늘이 읽힌다 */}
      {bids.length > 0 ? <DaySummary bids={bids} /> : null}

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
  const rows = useMemo(() => sortByListing(section.bids), [section.bids]);

  /*
   * 열린 회차의 입찰은 전부 결과 전이라 「N건 대기」 는 「진행 중」 을 한 번 더 하는
   * 말이다. 마감 회차만 낙찰·미낙찰을 적는다.
   */
  const facts: string[] = [];
  if (section.wonCount > 0) facts.push(`낙찰 ${section.wonCount}`);
  if (section.lostCount > 0) facts.push(`미낙찰 ${section.lostCount}`);
  const factLine =
    facts.length > 0
      ? facts.join(" · ")
      : section.bids.length === 0
        ? "아직 없음"
        : null;

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
            <span className="text-[13.5px] font-bold tabular-nums text-content">
              {section.roundNo}회차
            </span>
            <span className="text-[11px] text-content-faint">
              {live ? "진행 중" : "마감"}
            </span>
          </span>
          {factLine ? (
            <span className="truncate text-[11px] tabular-nums text-content-faint">
              {factLine}
            </span>
          ) : null}
        </span>
        {section.amount > 0 ? (
          <span
            className={cn(
              "shrink-0 text-[13.5px] font-bold tabular-nums",
              live ? "text-content" : "text-won",
            )}
          >
            {formatWon(section.amount)}
          </span>
        ) : null}
      </button>

      {open && rows.length > 0 ? (
        <ul className="px-2 pb-2">
          {rows.map((b) => (
            <BidRow
              key={b.id}
              bid={b}
              title={b.part?.partName ?? "-"}
              details={[b.listing?.listingNo ?? "-", ...listingDetails(b)]}
              onNavigate={
                onNavigateListing && b.listing
                  ? () =>
                      onNavigateListing(b.listing!.id, b.part?.partNo ?? null)
                  : undefined
              }
            />
          ))}
        </ul>
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
          <span className="truncate text-[13.5px] font-bold text-content">
            {partName}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-content-faint">
            {facts.join(" · ")}
          </span>
        </span>
        <span className="shrink-0 text-[13.5px] font-bold tabular-nums text-content">
          {formatWon(sumAmount(bids))}
        </span>
      </div>
      <ul>
        {bids.map((b) => {
          const round = b.auctionId ? roundNoById.get(b.auctionId) : undefined;
          return (
            <BidRow
              key={b.id}
              bid={b}
              title={b.listing?.listingNo ?? "-"}
              details={[
                ...(round ? [`${round}회차`] : []),
                ...listingDetails(b),
              ]}
              onNavigate={
                onNavigateListing && b.listing
                  ? () =>
                      onNavigateListing(b.listing!.id, b.part?.partNo ?? null)
                  : undefined
              }
            />
          );
        })}
      </ul>
    </li>
  );
}

/**
 * 입찰 한 줄 · 관심 패널 줄과 같은 꼴(굵은 제목 + 흐린 설명)에 오른쪽 숫자 두 단.
 *
 * 오른쪽 굵은 숫자는 **단가**다. 중도매인이 치고 견주는 값은 원/kg 이라 위에 세우고,
 * 총액은 단가 × 중량을 확인하는 값이라 바로 아래 작게 둔다.
 *
 * 결과는 예외만 적는다. 마감 회차는 머리가 이미 「낙찰 14」 라고 말하므로 낙찰 줄은
 * 아무 표시 없이 둔다 — 줄마다 파란 막대를 세웠더니 전부 낙찰인 회차가 온통 파래져서
 * 정작 아무것도 가려 주지 못했다. 미낙찰만 글자를 흐리고 총액 자리를 「낙찰가 · 차액」
 * 으로 바꾼다 · 떨어진 입찰을 다시 보는 이유가 「얼마에 갔나, 얼마를 더 얹어야 하나」 라서.
 *
 * 줄 전체가 누름단추다 — 화살표 아이콘만 과녁으로 두면 16px 를 겨눠야 하고, 한 회차에
 * 스무 줄이 서는 판이라 늘 띄워 두면 아이콘이 숫자보다 많아진다. 올렸을 때만 보인다.
 */
function BidRow({
  bid,
  title,
  details,
  onNavigate,
}: {
  bid: MyBidEntry;
  title: string;
  details: string[];
  onNavigate?: () => void;
}) {
  const lost = bid.rank != null && !bid.isWinning;
  const won = bid.rank != null && bid.isWinning;

  /* 낙찰가는 회차를 닫을 때 부위에 박힌다 (`cattle_parts.bid_price`, 원/kg) */
  const winPrice = lost ? (bid.part?.bidPrice ?? null) : null;
  const gap =
    winPrice != null && winPrice > bid.bidPrice
      ? winPrice - bid.bidPrice
      : null;

  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "truncate text-[13px] font-semibold leading-[18px]",
              lost ? "text-content-soft" : "text-content",
            )}
          >
            {title}
          </span>
          {won || lost ? (
            <span className="sr-only">{won ? "낙찰" : "미낙찰"}</span>
          ) : null}
          {onNavigate ? (
            <ArrowUpRight
              className="h-3 w-3 shrink-0 text-content-ghost opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={2.25}
            />
          ) : null}
        </span>
        <span className="mt-px block truncate text-[12px] leading-4 text-content-faint">
          {details.length > 0 ? details.join(" · ") : "-"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={cn(
            "block text-[13px] font-bold leading-[18px]",
            lost ? "text-content-soft" : "text-content",
          )}
        >
          {formatKrw(bid.bidPrice)}
          <span className="ml-0.5 text-[10.5px] font-medium text-content-faint">
            원/kg
          </span>
        </span>
        <span className="mt-px block text-[12px] leading-4 text-content-faint">
          {winPrice != null && winPrice > 0 ? (
            <>
              낙찰가 {formatKrw(winPrice)}
              {gap != null ? (
                <span className="pl-1 font-bold text-lost">
                  −{formatKrw(gap)}
                </span>
              ) : null}
            </>
          ) : (
            formatWon(bid.bidAmount)
          )}
        </span>
      </span>
    </>
  );

  const rowClass =
    "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left tabular-nums";

  return (
    <li>
      {onNavigate ? (
        <button
          type="button"
          onClick={onNavigate}
          title={`${title} 경매장에서 열기`}
          className={cn(
            rowClass,
            "group transition-colors hover:bg-surface-accent",
          )}
        >
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}

/**
 * 오늘 셈 · 세 칸 숫자 판.
 *
 * 한 줄 글로 적어 두면(「대기 14건 12,576,060원 · 낙찰 …」) 11px 흐린 글씨라 눈이
 * 지나친다. 칸을 나눠 숫자를 굵게 세우면 회차를 다 접어 둔 채로도 오늘이 읽힌다.
 *
 * 건수 칸만 좁다 · 두 자리 수면 끝이라, 금액 두 칸에 폭을 몰아줘야 억 단위도 안 잘린다.
 */
function DaySummary({ bids }: { bids: MyBidEntry[] }) {
  const open = bids.filter((b) => b.rank == null);
  const won = bids.filter((b) => b.rank != null && b.isWinning);

  return (
    <dl className="mx-3 mb-2 grid grid-cols-[60px_minmax(0,1fr)_minmax(0,1fr)] divide-x divide-line-soft rounded-md border border-line-soft">
      <SummaryCell label="입찰" value={`${bids.length}건`} />
      <SummaryCell
        label="진행 중"
        value={
          open.length > 0 ? (
            <NumberFlow
              value={sumAmount(open)}
              locales="ko-KR"
              suffix="원"
              willChange
            />
          ) : null
        }
      />
      <SummaryCell
        label={won.length > 0 ? `낙찰 ${won.length}건` : "낙찰"}
        value={won.length > 0 ? formatWon(sumAmount(won)) : null}
        tone="won"
      />
    </dl>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  /** 없으면 「-」 · 0원을 적으면 넣었는데 0원인 것처럼 읽힌다 */
  value: ReactNode;
  tone?: "won";
}) {
  const empty = value == null;
  return (
    <div className="min-w-0 px-2.5 py-1.5">
      <dt className="truncate text-[10.5px] text-content-faint">{label}</dt>
      <dd
        className={cn(
          "truncate text-[13px] font-bold tabular-nums",
          empty && "text-content-ghost",
          !empty && tone === "won" && "text-won",
          !empty && !tone && "text-content",
        )}
      >
        {empty ? "-" : value}
      </dd>
    </div>
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
