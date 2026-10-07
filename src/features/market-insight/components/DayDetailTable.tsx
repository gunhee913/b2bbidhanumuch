"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { formatKrw, formatWon } from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { SortHeaderButton } from "@/features/live-auction/components/SortHeaderButton";
import {
  toAriaSort,
  type SortState,
} from "@/features/live-auction/lib/partSort";
import { EmptyRow, Measured } from "@/features/history/components/TableParts";
import { TableFilterPicker } from "./TableFilterPicker";
import type { AuctionResult } from "@/features/bids/types";
import {
  gradeScore,
  toFineGrade,
  toFullGrade,
} from "@/features/history/lib/gradeKey";
import { missedBy, OVER_AVERAGE_PCT, overAveragePct } from "../lib/dailyStats";
import {
  averageKey,
  AVERAGE_MIN_SAMPLE,
  AVERAGE_WINDOW_DAYS,
  type MarketAverage,
  type MarketAverageIndex,
} from "../hooks/useMarketAverages";

export type DetailTab = "won" | "lost";

/** 시세탭(`MarketDailyTable`)과 같은 글자 기준 · 한 페이지의 표는 한 손으로 쓴다 */
const HEAD_CELL =
  "whitespace-nowrap border-b border-line px-2 py-1.5 font-medium -tracking-[0.01em]";
const CELL = "whitespace-nowrap px-2 py-1.5 align-middle tabular-nums";

/* ───────────────────────── 정렬 ───────────────────────── */

type SortKey =
  | "listingNo"
  | "part"
  | "grade"
  | "weight"
  | "price"
  | "amount"
  | "average"
  | "myBid"
  | "winningBid"
  | "missed";

type Sort = SortState<SortKey>;

/**
 * 열마다 첫 번째 누름의 방향.
 *
 * 금액·중량은 큰 것부터, 이름·번호는 작은 것부터가 찾던 차례다. 전부 오름차순으로
 * 맞춰 두면 낙찰금액을 누를 때마다 제일 싼 것이 먼저 올라와 한 번 더 눌러야 한다.
 */
const FIRST_DIR: Record<SortKey, "asc" | "desc"> = {
  listingNo: "asc",
  part: "asc",
  grade: "desc",
  weight: "desc",
  price: "desc",
  amount: "desc",
  average: "desc",
  myBid: "desc",
  winningBid: "desc",
  missed: "asc",
};

/**
 * 탭마다 아무것도 안 눌렀을 때의 차례 · 머리글에 화살표로 드러난다.
 *
 * 낙찰은 큰 금액부터다 — 스무 줄 가운데 그날을 설명하는 것은 위의 서넛이다.
 * 미낙찰은 아깝게 놓친 것부터다. 「백 원 차이로 놓친 셋」 과 「삼천 원 모자란 둘」 은
 * 다음 회차에 할 일이 다르다.
 */
const DEFAULT_SORT: Record<DetailTab, Sort> = {
  won: { key: "amount", dir: "desc" },
  lost: { key: "missed", dir: "asc" },
};

/** 탭마다 실제로 서 있는 열 · 탭을 옮길 때 없는 열로 정렬된 채 남지 않게 한다 */
const TAB_KEYS: Record<DetailTab, readonly SortKey[]> = {
  won: ["listingNo", "part", "grade", "weight", "price", "amount", "average"],
  lost: [
    "listingNo",
    "part",
    "grade",
    "weight",
    "myBid",
    "winningBid",
    "missed",
  ],
};

/** 상장번호(`260918-101-01`) · 숫자 구간을 수치로 봐 `-2` 가 `-10` 앞에 선다 */
const COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

/**
 * 고른 날의 낙찰 상세 · 도넛이 비율을 말하면 여기가 물건을 말한다.
 *
 * 위 도넛이 「등심 28%」 를 말하면 여기서 **그 등심이 어떤 물건이었나** 를 본다.
 * 거르개(등급·부위)는 표 제 머리에 둔다 — 도넛에 걸면 고르는 순간 그 도넛이 100%
 * 짜리 고리 하나가 되어 그림이 아무 말도 안 한다.
 *
 * **미낙찰은 같은 표의 다른 탭이다.** 따로 카드를 세울 만큼 자주 있지 않고(이 딜러는
 * 마흔넉 날 중 여드레), 보는 열도 다섯이 겹친다. 뒤 세 열만 단가·금액·평균대비에서
 * 입찰·낙찰·차이로 갈아 끼운다.
 */
export function DayDetailTable({
  wonRows,
  lostRows,
  tab,
  onTab,
  hideTabs = false,
  averages,
}: {
  /** 구간으로 추린 낙찰 건 · 등급·부위 거르개는 이 안에서 건다 */
  wonRows: AuctionResult[];
  /** 구간으로 추린 미낙찰 건 */
  lostRows: AuctionResult[];
  tab: DetailTab;
  onTab: (next: DetailTab) => void;
  /**
   * 탭을 접는다 · 거래처를 고른 때처럼 미낙찰이 들어올 수 없는 경우.
   *
   * 「미낙찰 0」 이라 적힌 누를 수 있는 탭을 남겨 두면 눌러 보고 나서야 빈 것을
   * 알게 되는데, 그 0은 이 거래처 성적이 아니라 애초에 못 담는 칸이라는 뜻이다.
   */
  hideTabs?: boolean;
  /** 부위 × 등급 최근 한 달 시장 평균단가 · 아직 안 왔으면 `undefined` */
  averages?: MarketAverageIndex;
}) {
  const [grade, setGrade] = useState("");
  const [part, setPart] = useState("");
  const [picked, setPicked] = useState<Sort | null>(null);

  /* 탭에 없는 열로 정렬돼 있으면 그 탭의 기본으로 · 들고 넘어갈 수 있는 열은 지킨다 */
  const sort =
    picked && TAB_KEYS[tab].includes(picked.key) ? picked : DEFAULT_SORT[tab];

  const scoped = tab === "won" ? wonRows : lostRows;

  /*
   * 고를 수 있는 값은 **지금 탭에 실제로 있는 것만** 세운다. 전체 목록을 깔아 두면
   * 없는 등급을 눌러 빈 표를 보게 되는데, 거른 결과가 비었는지 애초에 없었는지가
   * 구분이 안 된다. 등급은 등급표 차례로, 부위는 가나다로 세운다.
   */
  const gradeOptions = useMemo(
    () =>
      [
        ...new Set(
          scoped.map((r) => formatGradeLabel(r.grade, r.marblingScore)),
        ),
      ]
        .filter((g) => g !== "-")
        .sort((a, b) => gradeScore(b) - gradeScore(a)),
    [scoped],
  );
  const partOptions = useMemo(
    () =>
      [...new Set(scoped.map((r) => r.partName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "ko-KR"),
      ),
    [scoped],
  );

  const rows = useMemo(() => {
    const filtered = scoped.filter(
      (r) =>
        (!grade || formatGradeLabel(r.grade, r.marblingScore) === grade) &&
        (!part || r.partName === part),
    );
    const valueOf = (r: AuctionResult) => sortValue(r, sort.key, averages);
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      /* 못 잰 값은 방향과 상관없이 뒤로 · 「-」 가 맨 위에 올라오면 표가 비어 보인다 */
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" || typeof bv === "string") {
        return COLLATOR.compare(String(av), String(bv)) * sign;
      }
      return (av - bv) * sign;
    });
  }, [scoped, grade, part, sort, averages]);

  const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);

  const head = (key: SortKey, label: string, align: "left" | "right") => (
    <th
      className={cn(HEAD_CELL, align === "right" ? "text-right" : "text-left")}
      aria-sort={toAriaSort(sort, key)}
    >
      <SortHeaderButton
        label={label}
        align={align}
        active={sort.key === key ? sort.dir : null}
        onClick={() =>
          setPicked(
            sort.key === key
              ? { key, dir: sort.dir === "asc" ? "desc" : "asc" }
              : { key, dir: FIRST_DIR[key] },
          )
        }
      />
    </th>
  );

  return (
    <section className={cn("flex flex-col", SURFACE_SHELL_CLASS)}>
      <header className="flex items-center justify-between gap-3 border-b border-line-soft px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          {hideTabs ? (
            <span className="shrink-0 px-1 text-[12px] font-bold text-content">
              낙찰
            </span>
          ) : (
            <SegmentedTabs
              label="낙찰 여부"
              value={tab}
              options={[
                { value: "won", label: `낙찰 ${wonRows.length}` },
                { value: "lost", label: `미낙찰 ${lostRows.length}` },
              ]}
              onChange={(v) => onTab(v as DetailTab)}
            />
          )}
          <TableFilterPicker
            label="등급"
            value={grade}
            options={gradeOptions}
            onChange={setGrade}
            columns={2}
            width={180}
          />
          <TableFilterPicker
            label="부위"
            value={part}
            options={partOptions}
            onChange={setPart}
            columns={3}
            width={264}
          />
        </div>
        <span className="shrink-0 text-[11.5px] tabular-nums text-content-faint">
          {rows.length === scoped.length
            ? `${rows.length}건`
            : `${rows.length} / ${scoped.length}건`}
        </span>
      </header>

      <table
        style={{ minWidth: TOTAL_WIDTH }}
        className="w-full table-fixed text-[13px] font-semibold text-content"
      >
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: `${(w / TOTAL_WIDTH) * 100}%` }} />
          ))}
        </colgroup>
        <thead className="bg-surface-muted text-[12px] font-medium text-content-faint">
          <tr>
            {head("listingNo", "상장번호", "left")}
            {head("part", "부위", "left")}
            {head("grade", "등급", "left")}
            {head("weight", "중량", "right")}
            {tab === "won" ? (
              <>
                {head("price", "낙찰단가", "right")}
                {head("amount", "낙찰금액", "right")}
                {head("average", "평균가대비", "right")}
              </>
            ) : (
              <>
                {head("myBid", "내 입찰", "right")}
                {head("winningBid", "낙찰단가", "right")}
                {head("missed", "차이", "right")}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={COLUMN_WIDTHS.length}
              message={
                tab === "lost" && lostRows.length === 0
                  ? "이 날은 입찰한 것을 모두 땄습니다."
                  : "이 조건에 맞는 건이 없습니다."
              }
            />
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-line-soft transition-colors last:border-b-0 hover:bg-surface-muted"
              >
                <td
                  className={cn(CELL, "truncate text-left text-content-mid")}
                  title={r.listingNo}
                >
                  {r.listingNo || "-"}
                </td>
                <td className={cn(CELL, "truncate text-left font-bold")}>
                  {r.partName || "-"}
                </td>
                <td className={cn(CELL, "truncate text-left text-content-mid")}>
                  {formatGradeLabel(r.grade, r.marblingScore)}
                </td>
                <td className={cn(CELL, "text-right")}>
                  <Measured
                    value={r.weight > 0 ? r.weight.toFixed(1) : "-"}
                    unit="kg"
                    className="font-bold"
                  />
                </td>
                {tab === "won" ? (
                  <>
                    <PriceCell value={r.winningBid ?? r.myBid} />
                    <td className={cn(CELL, "text-right")}>
                      <Measured
                        value={formatWon(r.totalAmount)}
                        unit="원"
                        className="font-bold"
                      />
                    </td>
                    <td className={cn(CELL, "text-right")}>
                      <AverageCell row={r} averages={averages} />
                    </td>
                  </>
                ) : (
                  <>
                    <PriceCell value={r.myBid} />
                    <PriceCell value={r.winningBid} />
                    <td className={cn(CELL, "text-right")}>
                      <MissedCell gap={missedBy(r)} />
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
        {tab === "won" && rows.length > 0 ? (
          <tfoot>
            <tr className="border-t border-line bg-surface-muted font-bold text-content">
              <td className={cn(CELL, "text-left")}>합계 {rows.length}건</td>
              <td className={CELL} colSpan={4} />
              <td className={cn(CELL, "text-right")}>
                <Measured
                  value={formatWon(totalAmount)}
                  unit="원"
                  className="font-bold"
                />
              </td>
              <td className={CELL} />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </section>
  );
}

/**
 * 열 폭 · 자연 폭을 적어 두고 합으로 나눠 비율로 깐다.
 *
 * 두 탭이 같은 폭을 쓴다. 뒤 세 열이 단가·금액·평균대비에서 입찰·낙찰·차이로 갈리는데,
 * 폭까지 달라지면 탭을 오갈 때 앞 다섯 열이 통째로 들썩인다.
 *
 * 머리글마다 정렬 화살표(12px)가 붙을 자리를 같이 셌다.
 */
const COLUMN_WIDTHS = [140, 92, 86, 80, 112, 118, 96];
const TOTAL_WIDTH = COLUMN_WIDTHS.reduce((a, b) => a + b, 0);

/** 정렬에 쓰는 비교값 · 글자면 가나다, 숫자면 크기, `null` 이면 늘 뒤 */
function sortValue(
  r: AuctionResult,
  key: SortKey,
  averages?: MarketAverageIndex,
): string | number | null {
  switch (key) {
    case "listingNo":
      return r.listingNo || null;
    case "part":
      return r.partName || null;
    /*
     * 글자 차례로 세면 1++ 와 1+ 사이에 1 이 낀다 · 등급은 점수로 센다.
     * 점수도 `grade` 원본이 아니라 `toFullGrade` 로 맞춘 글자에 매긴다 — 원본에는
     * 근내지방도가 안 붙어 있어(`1++A`) 1++(9) 와 1++(7) 이 같은 점수가 된다.
     */
    case "grade":
      return r.grade ? gradeScore(toFullGrade(r)) : null;
    case "weight":
      return r.weight > 0 ? r.weight : null;
    case "price":
      return r.winningBid ?? r.myBid ?? null;
    case "amount":
      return r.totalAmount || null;
    case "average":
      return overAveragePct(
        r,
        averages?.get(averageKey(r.partName, toFineGrade(r))),
        AVERAGE_MIN_SAMPLE,
      );
    case "myBid":
      return r.myBid || null;
    case "winningBid":
      return r.winningBid || null;
    case "missed":
      return missedBy(r);
  }
}

/** 단가 한 칸 · 단위는 숫자 뒤에 작게 (열 머리에 넣으면 머리가 두 줄이 된다) */
function PriceCell({ value }: { value: number | null }) {
  return (
    <td className={cn(CELL, "text-right text-content-mid")}>
      <Measured
        value={value && value > 0 ? formatKrw(value) : "-"}
        unit="원/kg"
      />
    </td>
  );
}

/**
 * 같은 부위·등급 시장 평균 대비 · 위는 `rise`, 아래는 `fall`.
 *
 * 최저가 대비였을 때는 색을 안 썼다. 늘 `0` 위라 한쪽으로만 자라는 값이었고, 올려
 * 썼다는 것이 잘한 일도 못한 일도 아니었다. 평균 대비는 `0` 을 가운데 두고 양쪽으로
 * 갈리는 값이라 높다/낮다를 말하는 등락색이 그대로 맞는다.
 *
 * 선 안쪽(±5%)은 색을 빼고 흐리게 둔다. 이 딜러의 낙찰을 다 재 보면 열에 아홉이 그
 * 안에 들고 중앙값이 +0.1% 다 — 거기까지 물들이면 스무 줄이 통째로 울긋불긋해져
 * 정작 봐야 할 두세 줄이 묻힌다.
 */
function AverageCell({
  row,
  averages,
}: {
  row: AuctionResult;
  averages?: MarketAverageIndex;
}) {
  if (!averages) return <span className="text-content-ghost">·</span>;

  const average = averages.get(averageKey(row.partName, toFineGrade(row)));
  const pct = overAveragePct(row, average, AVERAGE_MIN_SAMPLE);
  if (!average || pct === null) {
    return (
      <span
        className="text-content-ghost"
        title={`최근 ${AVERAGE_WINDOW_DAYS}일 안에 같은 부위·등급이 따로 팔린 적이 없어 견줄 평균이 없습니다.`}
      >
        -
      </span>
    );
  }

  return (
    <span title={averageTitle(average, pct)} className={toneOf(pct)}>
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

/**
 * `+` 는 빨강, `−` 는 파랑 · 그뿐이다.
 *
 * 한때 ±5% 밖을 진하게·굵게 해 두 톤으로 썼다. 쓰는 쪽에서 「어두운 건 뭐고 진한 건
 * 뭐냐」 고 묻는 순간 끝난 규칙이다 — 5% 라는 선이 화면 어디에도 안 적혀 있으니 두
 * 톤은 그저 비슷한데 좀 다른 빨강으로 보일 뿐이고, 무슨 뜻인지 물어봐야 아는 색은
 * 색이 아니라 수수께끼다.
 *
 * 얼마나 비싼지는 숫자가 이미 말한다. 색은 위냐 아래냐만 맡고, 큰 것부터 보고 싶으면
 * 머리글을 눌러 세우면 된다.
 */
const TONE = {
  rise: "text-rise",
  fall: "text-fall",
  flat: "text-content-faint",
} as const;

const toneOf = (pct: number) =>
  pct === 0 ? TONE.flat : pct > 0 ? TONE.rise : TONE.fall;

const averageTitle = (average: MarketAverage, pct: number) =>
  [
    `최근 ${AVERAGE_WINDOW_DAYS}일 같은 부위·등급 평균 ${formatKrw(average.avg)}원/kg (${average.count}건)`,
    pct > OVER_AVERAGE_PCT
      ? "평균보다 비싸게 받았습니다"
      : pct < -OVER_AVERAGE_PCT
        ? "평균보다 싸게 받았습니다"
        : "평균 언저리에서 받았습니다",
  ].join(" · ");

/** 미낙찰 차이 · 이만큼 더 썼으면 땄다 */
function MissedCell({ gap }: { gap: number | null }) {
  return (
    <Measured
      value={gap === null ? "-" : `+${formatKrw(gap)}`}
      unit="원/kg"
      className="font-bold"
    />
  );
}
