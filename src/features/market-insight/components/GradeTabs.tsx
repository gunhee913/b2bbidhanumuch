"use client";

import { useMemo } from "react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { GRADE_FILTER_OPTIONS } from "@/features/live-auction/lib/grade";
import type { YieldGrade } from "@/features/live-auction/lib/buildPartPriceSeries";

const YIELD_LETTERS: YieldGrade[] = ["A", "B", "C"];

export interface GradeTabsProps {
  grade: string;
  onGradeChange: (grade: string) => void;
  yieldGrade: YieldGrade;
  onYieldChange: (yieldGrade: YieldGrade) => void;
  /** 육량을 합쳐 보는 중이면 A·B·C 를 고를 것이 없다 */
  yieldUnified: boolean;
}

/**
 * 등급 고르개 · 차트 머리 둘째 줄 오른쪽에 선다.
 *
 * 차트가 쥐고 있던 범례 메뉴를 밖으로 꺼낸 것이다. 범례에서는 등급 이름을 눌러야
 * 메뉴가 열리고 거기서 다시 골라야 했는데, 이 화면에서 등급은 **부위 다음으로 자주
 * 바꾸는 값**이고 아래 일자별 표까지 같이 끌고 다닌다 — 두 걸음짜리 메뉴에 둘 값이
 * 아니다. 일곱 칸을 다 펴 두면 지금 어느 등급인지와 고를 수 있는 것이 한눈에 선다.
 *
 * 육질과 육량을 한 줄로 붙이지 않고 두 묶음으로 나눈 건 둘이 서로 곱해지는 축이라서다.
 * 스물한 칸을 늘어놓는 대신 일곱 + 셋으로 두면 폭도 반으로 줄고, 「1++(9) 를 그대로
 * 두고 A 만 C 로」 가 한 번에 눌린다.
 */
export function GradeTabs({
  grade,
  onGradeChange,
  yieldGrade,
  onYieldChange,
  yieldUnified,
}: GradeTabsProps) {
  const gradeOptions = useMemo(
    () => GRADE_FILTER_OPTIONS.map((g) => ({ value: g, label: g })),
    [],
  );
  const yieldOptions = useMemo(
    () => YIELD_LETTERS.map((y) => ({ value: y, label: y })),
    [],
  );

  return (
    <div className="flex items-center gap-1.5">
      <SegmentedTabs
        label="육질등급"
        value={grade}
        options={gradeOptions}
        onChange={onGradeChange}
        dense
      />
      {yieldUnified ? null : (
        <SegmentedTabs
          label="육량등급"
          value={yieldGrade}
          options={yieldOptions}
          onChange={(v) => onYieldChange(v as YieldGrade)}
          dense
        />
      )}
    </div>
  );
}
