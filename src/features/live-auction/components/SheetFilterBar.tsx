"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRADE_FILTER_OPTIONS } from "../lib/grade";
import { CompactFilterPill } from "./CompactFilterPill";

/**
 * 상장표 필터 행 · 등급 · 업체 · (부위 표에서만) 부위 탭.
 *
 * 탭·표와 한 섹션 안에 있으므로 카드 외곽선을 두르지 않는다 —
 * 섹션 안에서 줄을 가르는 것은 아래쪽 hairline 하나면 충분하다.
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
    <div className="border-b border-line-soft bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <CompactFilterPill
            label="등급"
            value={gradeFilter}
            onChange={onGradeChange}
            options={GRADE_FILTER_OPTIONS}
            valueOnlyWhenActive
          />
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
