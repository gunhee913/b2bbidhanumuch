"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SegmentedTabs,
  type SegmentedTabOption,
} from "@/components/ui/segmented-tabs";
import { useGradeHotkeys } from "../hooks/useGradeHotkeys";
import { GRADE_FILTER_OPTIONS, hotkeyForGrade } from "../lib/grade";
import { CompactFilterPill } from "./CompactFilterPill";

/** 전체 + 7등급 · 빈 값이 「거르지 않음」 이고 `matchesGradeFilter` 가 그대로 통과시킨다 */
const GRADE_TABS: readonly SegmentedTabOption[] = [
  { value: "", label: "전체" },
  ...GRADE_FILTER_OPTIONS.map((grade) => ({ value: grade, label: grade })),
].map((tab) => {
  const key = hotkeyForGrade(tab.value);
  return {
    ...tab,
    hotkey: key || undefined,
    title: key ? `${tab.label} · 숫자 ${key}` : tab.label,
  };
});

/**
 * 상장표 필터 행 · 등급 · 업체 · (부위 표에서만) 부위 탭.
 *
 * 탭·표와 한 섹션 안에 있으므로 카드 외곽선을 두르지 않는다 —
 * 섹션 안에서 줄을 가르는 것은 아래쪽 hairline 하나면 충분하다.
 *
 * 윗변도 섹션이 긋는다. 예전에는 이 줄이 스크롤에 붙어 화면 위에 멈춰 서는 바람에
 * 섹션 윗변이 그대로 위로 흘러가 버려, 멈춰 선 필터 줄 위로 좌우 테두리만 잘린 채
 * 솟았다 — 그래서 윗변을 이 줄이 들고 다녔다. 이제 구르는 것은 표뿐이고 이 줄은
 * 스크롤 바깥 제자리에 서 있으므로, 윗변을 들고 다닐 까닭이 없다.
 */
export function SheetFilterBar({
  gradeFilter,
  companyFilter,
  onGradeChange,
  onCompanyChange,
  companyOptions,
  partFilter,
  onPartChange,
  partTabs,
}: {
  gradeFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  companyOptions: string[];
  /** 부위 표에서만 · 아래 줄에 부위 탭 바를 펼친다 (`partTabs`) */
  partFilter?: string;
  onPartChange?: (v: string) => void;
  partTabs?: ReactNode;
}) {
  const isFiltered = !!gradeFilter || !!companyFilter || !!partFilter;

  return (
    <div className="border-b border-b-line-soft bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <GradeFilterTabs value={gradeFilter} onChange={onGradeChange} />
          <CompactFilterPill
            label="업체"
            value={companyFilter}
            onChange={onCompanyChange}
            options={companyOptions}
            valueOnlyWhenActive
            className={cn(!companyOptions.length && "opacity-60")}
          />
          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                onGradeChange("");
                onCompanyChange("");
                onPartChange?.("");
              }}
              className="ml-0.5 inline-flex h-8 items-center px-1 text-cap font-semibold text-content-soft hover:text-content"
              title="필터 초기화"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      {/* 부위는 이 표의 주축이라 pill 뒤에 숨기지 않고 한 줄 펼쳐 둔다 */}
      {partTabs ? (
        <div className="border-t border-line-soft px-3 py-2">{partTabs}</div>
      ) : null}
    </div>
  );
}

/**
 * 등급 탭 · 전체 + 7등급을 한 줄에 편다.
 *
 * 업체와 달리 등급은 후보가 일곱으로 고정이고 값이 짧다 — 펼쳐도 300px 안쪽이라
 * pill 뒤에 숨길 이유가 없다. 상장표에서 등급은 고르는 축이 아니라 훑는 축이라,
 * 1++(9)와 1+를 오가며 견주는 동안 드롭다운은 매번 두 번 누르게 만든다.
 *
 * 라벨을 따로 적지 않는다 · `1++(9)` 는 그 자체로 등급 말고 달리 읽히지 않는다.
 *
 * 부위별 방(`AuctionDetailRoom`)도 같은 탭을 쓴다 — 같은 일을 하는 줄이 화면마다 다르게
 * 생기면 안 되고, 등급 목록은 한 군데서만 늘어나야 한다.
 *
 * 숫자키는 칩 위에 적지 않고 말풍선에만 둔다. 일곱 칩에 숫자 뱃지를 달면 `1++(9)` 옆에
 * `9` 가 또 붙어 — 같은 숫자가 두 뜻으로 보이는 데다, 11px 로 꽉 찬 줄에 글자가 배로
 * 는다. 키는 한 번 익히면 그만인 것이라 늘 보일 필요가 없다.
 */
export function GradeFilterTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  useGradeHotkeys(value, onChange);

  return (
    /* 켜진 칩을 다시 누르면 풀린다(`toggleable`) · 숫자키와 같은 손놀림이라 둘이 어긋나지 않는다 */
    <SegmentedTabs
      label="등급"
      value={value}
      options={GRADE_TABS}
      onChange={onChange}
      toggleable
    />
  );
}
