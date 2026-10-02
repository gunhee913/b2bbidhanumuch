"use client";

/**
 * 사이드 메뉴 패널 공용 조각 · 머리줄과 빈 칸.
 *
 * 레일(`SideDockRailItem`)을 공용으로 뺀 것과 같은 까닭이다. 두 화면의 패널이 각자
 * 제 머리줄을 그리고 있었더니 여백(px-4 ↔ px-3)과 글자 크기가 1px씩 어긋나, 두
 * 메뉴를 오갈 때 같은 자리의 같은 것이 미묘하게 다른 크기로 보였다. 치수는 경매장
 * 쪽을 그대로 따른다 — 쓰는 사람이 더 오래 본 쪽이 기준이다.
 */
export function PanelSectionHead({
  label,
  count,
  unit,
}: {
  label: string;
  /** 0 이면 적지 않는다 · 「0개」 는 빈 칸 안내가 이미 하는 말이다 */
  count: number;
  unit: string;
}) {
  return (
    <header className="flex shrink-0 items-baseline justify-between gap-2 px-4 pb-1.5 pt-2.5">
      <h2 className="text-[13px] font-bold text-content">{label}</h2>
      {count > 0 ? (
        <span className="text-[12px] font-medium tabular-nums text-content-faint">
          {count}
          {unit}
        </span>
      ) : null}
    </header>
  );
}

/** 빈 칸은 한 줄로만 · 두 칸이 높이를 나눠 쓰는 자리라 안내가 길면 목록보다 커진다 */
export function PanelEmpty({ text }: { text: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-5 text-center">
      <p className="text-[12px] text-content-faint">{text}</p>
    </div>
  );
}
