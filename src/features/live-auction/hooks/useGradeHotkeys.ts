"use client";

import { useEffect, useRef } from "react";
import { gradeForHotkey } from "../lib/grade";
import { isFieldFocused } from "../lib/keyboard";

/** 자판 자리에서 숫자 하나를 뽑는다 · 못 뽑으면 `null` */
function digitOf(e: KeyboardEvent): string | null {
  const bySeat = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  if (bySeat) return bySeat[1];
  return /^[0-9]$/.test(e.key) ? e.key : null;
}

/**
 * 등급 거르개 숫자키 · 칩을 그리는 쪽에서 함께 켠다.
 *
 * 듣는 자리를 칩 옆에 둔 이유는 조건이 하나로 맞아떨어지기 때문이다 — 칩이 화면에
 * 있을 때만 키가 살아야 하고(부위별 방은 `filterable` 일 때만 칩을 편다), 키가 거는
 * 값은 칩이 들고 있는 바로 그 값이다. 방 쪽에 따로 두면 두 조건을 손으로 맞춰야 한다.
 *
 * 자리(`code`)를 먼저 보는 건 한글 입력기 때문이다. 숫자는 입력기가 건드리지 않아
 * `key` 로도 들어오지만, 축 바꾸기(`B`)가 글자로만 보다 안 먹던 일이 있어 같은 식으로
 * 맞춰 둔다. 숫자패드도 이 길로 함께 들어온다.
 */
export function useGradeHotkeys(value: string, onChange: (v: string) => void) {
  const ref = useRef({ value, onChange });
  ref.current = { value, onChange };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isFieldFocused(document.activeElement)) return;
      const digit = digitOf(e);
      if (digit === null) return;
      const next = gradeForHotkey(digit);
      if (next === null) return;
      e.preventDefault();
      /* 켜진 등급을 한 번 더 누르면 풀린다 · 칩을 다시 누르는 것과 같은 손놀림 */
      const { value: current, onChange: emit } = ref.current;
      emit(next === current ? "" : next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
