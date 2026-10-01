"use client";

import { cn } from "@/lib/utils";
import { usePaneResize } from "../hooks/usePaneResize";
import { TABLE_DEFAULT_WIDTH } from "../hooks/useRoomLayout";

/**
 * 1열(사진·시세)과 2열(표) 사이 눈금.
 *
 * 열 사이 8px 틈을 그대로 손잡이로 쓴다 — 여기에 폭을 더 주면 두 판이 그만큼 좁아지고,
 * 8px 는 포인터로 잡기에 좁지만 좌우 4px 씩 넘겨 잡도록 늘려 실제로는 16px 로 집힌다.
 *
 * 평소에는 아무것도 그리지 않는다. 양옆 카드가 이미 제 테두리를 갖고 있어, 그 사이에 선을
 * 하나 더 세우면 나란한 선이 셋이 되고 가운데 것이 어디에도 붙지 않은 군더더기로 읽힌다.
 * 손이 닿을 때만 짧은 알약 손잡이를 띄운다 — 잡을 수 있다는 사실은 그때 알면 된다.
 *
 * 크기를 쥐는 쪽은 언제나 표다. 1열은 남는 폭을 전부 가져가므로 둘 다 px 로 잡으면
 * 창을 줄였을 때 합이 맞지 않는다. 표가 오른쪽이면 눈금을 오른쪽으로 밀 때 표가
 * 좁아지고, 왼쪽으로 옮겨 놓았으면 그 반대다 — 부호만 뒤집어 손이 「가까운 판을
 * 민다」로 읽히게 한다.
 *
 * 손으로만 잡는다. 예전에는 눈금에 포커스가 가고 방향키로도 폭이 움직였는데, 한 번
 * 끌고 나면 포커스가 눈금에 남아 그 뒤로 누르는 ←/→ 가 개체 이동이 아니라 폭 조절로
 * 갔다. 방향키는 이 방에서 개체를 넘기는 키다 — 눈금이 그걸 가져가면 안 된다.
 */
export function RoomSplitter({
  tableWidth,
  tableOnLeft,
  defaultWidth = TABLE_DEFAULT_WIDTH,
  onResize,
  onReset,
}: {
  tableWidth: number;
  /** 눈금 왼쪽에 표가 있으면 참 · 표를 1열 앞으로 옮겨 놓았을 때다 */
  tableOnLeft: boolean;
  /** 두 번 눌렀을 때 돌아갈 폭 · 방마다 기본값이 달라 안내 문구도 따라간다 */
  defaultWidth?: number;
  onResize: (px: number) => void;
  onReset: () => void;
}) {
  const { dragging, handlers } = usePaneResize({
    size: tableWidth,
    axis: "x",
    direction: tableOnLeft ? 1 : -1,
    onResize,
  });

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="사진·시세와 표 사이 너비"
      title={`끌어서 너비 조절 · 두 번 누르면 ${defaultWidth}px 로`}
      {...handlers}
      onDoubleClick={onReset}
      className={cn(
        "group relative cursor-col-resize touch-none select-none",
        // 틈은 8px 이지만 잡는 자리는 좌우로 4px 씩 넓힌다
        "before:absolute before:-inset-x-1 before:inset-y-0 before:content-['']",
      )}
    >
      {/*
       * 알약 손잡이 · 세로 가운데 72px.
       *
       * 길이가 곧 안내다. 짧으면 「점 하나」로 보여 여기를 잡아 끌 수 있다는 게 읽히지
       * 않으므로, 잡히는 자리를 길이로 보여 준다. 평소에도 옅게 띄워 두고 손이 닿으면
       * 또렷해진다 — 아예 숨기면 있는 줄 모르고, 늘 진하면 양옆 카드 테두리와 나란한
       * 선이 셋이 된다.
       *
       * `transition-all` 을 쓰면 안 된다 — 끄는 동안 열 폭이 계속 바뀌어 `left: 50%` 가
       * 매 프레임 갱신되는데, 그 위치까지 애니메이션 대상이 되면 손잡이가 손을 뒤따라오고
       * 그때마다 색 전환이 처음부터 다시 시작해 끝내 또렷해지지 않는다.
       */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[72px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full",
          "transition-[background-color,opacity] duration-150",
          dragging
            ? "bg-content-soft"
            : "bg-content-ghost opacity-70 group-hover:bg-content-faint group-hover:opacity-100",
        )}
      />
    </div>
  );
}
