"use client";

import { useEffect, useRef } from "react";
import { isFieldFocused } from "@/features/live-auction/lib/keyboard";

/** 줄을 찾아 끌어오는 데 쓰는 표식 · 두 표의 `<tr>` 이 함께 단다 */
export const PART_ROW_ATTR = "data-part-no";

export interface HistoryKeysOptions {
  /**
   * 지금 표에 선 부위 번호 · **보이는 차례대로, 겹치지 않게**.
   *
   * 입찰내역은 한 부위에 줄이 셋까지 서는데 그 셋은 한 이야기라 한 걸음으로 묶는다.
   * 줄마다 멈추면 ↓ 를 눌러도 왼쪽 판이 그대로여서 아무 일도 안 일어난 것처럼 보인다.
   */
  partNos: string[];
  focusedPartNo: string | null;
  onFocusPartNo: (partNo: string) => void;
  /** -1 · +1 · 하루씩 */
  onStepDate: (days: number) => void;
}

/**
 * `/history` 키보드 길 · ←→ 로 날을 넘기고 ↑↓ 로 줄을 짚는다.
 *
 * 이 화면이 하는 일은 「어느 날」 과 「어느 줄」 두 가지뿐이고, 둘 다 하루에 수십 번
 * 오간다. 날은 머리줄 화살표까지, 줄은 표까지 매번 마우스를 가져가야 했다 — 두 곳이
 * 화면의 정반대 끝이다. 방향키 네 개가 그 왕복을 없앤다.
 *
 * 가로가 날이고 세로가 줄인 건 화면 생김새 그대로다. 날짜 화살표가 가로로 놓여 있고
 * 줄은 세로로 쌓인다.
 *
 * **가로채지 않는 자리.** 글 쓰는 칸(검색)과 열린 대화상자(날짜 달력·사진 뷰어)
 * 안에서는 비킨다. 거기서는 방향키가 이미 제 뜻을 갖고 있다.
 */
export function useHistoryKeys({
  partNos,
  focusedPartNo,
  onFocusPartNo,
  onStepDate,
}: HistoryKeysOptions) {
  /*
   * 최신 값을 통 하나에 담아 두고 듣는 쪽은 한 번만 건다. 의존성에 넣으면 날이나
   * 줄이 바뀔 때마다 듣는 이를 떼었다 다시 거는데, 그 틈에 눌린 키가 사라진다.
   */
  const ref = useRef({ partNos, focusedPartNo, onFocusPartNo, onStepDate });
  ref.current = { partNos, focusedPartNo, onFocusPartNo, onStepDate };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isFieldFocused(document.activeElement)) return;
      /* 달력이나 사진 뷰어가 열려 있으면 방향키는 그쪽 것이다 */
      if (document.querySelector("[role=dialog]")) return;

      const { partNos, focusedPartNo, onFocusPartNo, onStepDate } = ref.current;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        onStepDate(e.key === "ArrowLeft" ? -1 : 1);
        return;
      }

      const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (dir === 0 || partNos.length === 0) return;
      e.preventDefault();

      /* 짚은 데가 없으면(거르개가 걸러 냈거나 빈 표였으면) 첫 줄부터 */
      const at = focusedPartNo ? partNos.indexOf(focusedPartNo) : -1;
      const next =
        at < 0 ? 0 : Math.min(Math.max(at + dir, 0), partNos.length - 1);
      if (partNos[next] === focusedPartNo) return;

      onFocusPartNo(partNos[next]);
      /*
       * 짚은 줄을 보이는 데까지 끌어온다. `nearest` 라 이미 보이는 줄은 표를 흔들지
       * 않는다 — 가운데로 당기면 한 칸 움직일 때마다 표 전체가 출렁인다.
       *
       * 줄을 ref 로 쥐지 않고 표식으로 찾는 건 표가 둘이고 줄 수가 매일 달라서다.
       * 그리기가 끝난 뒤에 찾아야 하므로 한 프레임 미룬다.
       */
      requestAnimationFrame(() => {
        document
          .querySelector(`[${PART_ROW_ATTR}="${CSS.escape(partNos[next])}"]`)
          ?.scrollIntoView({ block: "nearest" });
      });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
