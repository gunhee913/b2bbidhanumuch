"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { toPartGroupName } from "@/features/live-auction/lib/partGrouping";
import { fetchPartGradePrices } from "../api";

/**
 * 「평균가」 를 내는 창 · 고른 날에서 뒤로 이만큼.
 *
 * 그날 하루만 보면 못 쓴다. 같은 날 같은 부위·등급이 둘 이상 팔린 경우가 셋에 하나뿐
 * (1,000건 중 309건)이라, 나머지 열에 일곱은 제 값이 곧 평균이 되어 늘 `0%` 를 적는
 * 열이 된다. 한 달로 벌리면 열에 아홉(87%)이 견줄 상대를 갖는다.
 *
 * 뒤로만 센다. 고른 날을 가운데 두면 그날 이후의 시세로 그날의 판단을 채점하는 셈이
 * 되는데, 살 때는 없던 자료다.
 */
export const AVERAGE_WINDOW_DAYS = 30;

/** 견줄 수 있다고 보는 최소 표본 · 혼자뿐인 묶음은 제 값이 곧 평균이다 */
export const AVERAGE_MIN_SAMPLE = 2;

export interface MarketAverage {
  /** 원/kg */
  avg: number;
  /** 이 평균을 만든 낙찰 건수 */
  count: number;
}

/** `부위||등급` · 육량(A·B·C)은 묶는다 (도넛·표가 쓰는 등급 꼴과 같다) */
export type MarketAverageIndex = Map<string, MarketAverage>;

export const averageKey = (partName: string, gradeKey: string) =>
  `${toPartGroupName(partName)}||${gradeKey}`;

/**
 * 시세 쪽 등급 글자를 표가 쓰는 꼴로 맞춘다.
 *
 * 서버는 근내지방도가 적혀 있으면 무엇이든 괄호로 붙여 보낸다(`1++(6)`). 표는
 * 7·8·9 만 갈라 보고 나머지는 `1++` 하나로 묶으므로(`toFineGrade`), 여기서 같은
 * 선으로 접어 두지 않으면 두 쪽의 열쇠가 어긋나 평균이 통째로 안 붙는다.
 */
function normalizeGradeKey(grade: string): string {
  const marbling = grade.match(/^1\+\+\((\d)\)$/)?.[1];
  if (!marbling) return grade;
  return ["7", "8", "9"].includes(marbling) ? grade : "1++";
}

/**
 * 고른 날 기준 최근 한 달의 부위 × 등급 시장 평균단가.
 *
 * 내 낙찰건도 평균에 들어 있다. 빼려면 그 묶음에서 내 몫을 덜어 내야 하는데, 지금
 * 자료에서는 한 묶음이 두어 건이라 덜고 나면 견줄 상대가 사라지는 쪽이 더 흔하다.
 * 「남들 대비」 가 아니라 「요즘 이 물건이 거래되던 값 대비」 로 읽으면 된다.
 */
export function useMarketAverages(dateStr: string | null) {
  const endDate = dateStr;
  const startDate = dateStr
    ? format(subDays(parseISO(dateStr), AVERAGE_WINDOW_DAYS - 1), "yyyy-MM-dd")
    : null;

  return useQuery<MarketAverageIndex>({
    queryKey: ["market-insight", "part-grade-averages", startDate, endDate],
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { rows } = await fetchPartGradePrices({
        startDate: startDate!,
        endDate: endDate!,
      });
      /* 육량 세 줄을 한 줄로 · 합을 더하고 마지막에 한 번만 나눈다 */
      const sums = new Map<string, { priceSum: number; count: number }>();
      for (const row of rows) {
        if (row.count <= 0) continue;
        const key = averageKey(row.partName, normalizeGradeKey(row.grade));
        const cur = sums.get(key) ?? { priceSum: 0, count: 0 };
        cur.priceSum += row.priceSum;
        cur.count += row.count;
        sums.set(key, cur);
      }
      const index: MarketAverageIndex = new Map();
      for (const [key, s] of sums) {
        index.set(key, {
          avg: Math.round(s.priceSum / s.count),
          count: s.count,
        });
      }
      return index;
    },
  });
}
