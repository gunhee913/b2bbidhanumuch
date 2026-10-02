"use client";

import { useEffect, useRef, useState } from "react";
import { isTypingInto } from "../lib/keyboard";

export interface SheetCursor {
  /** 지금 짚고 있는 행 · 아직 아무것도 안 건드렸으면 null */
  id: string | null;
  /** 마우스가 옮기는 길 · 키보드와 달리 표를 굴리지 않는다 */
  set: (id: string) => void;
}

/**
 * 표에서 행 하나를 짚는 손가락 · ↑/↓ 로 옮기고 Enter 로 연다.
 *
 * 마우스를 올리는 것도 같은 손가락을 옮기는 일로 친다. 둘을 따로 두면 오른쪽 요약이
 * 가리키는 개체와 표에서 밝은 행이 갈려서, 사진은 101 을 띄우는데 밝은 줄은 107 인
 * 꼴이 난다. 짚은 자리는 하나뿐이어야 한다.
 *
 * 표를 굴리는 일은 키보드로 옮길 때만 한다. 마우스로 짚었다면 그 행은 이미 커서
 * 밑에 있어 보이고 있고, 거기서 표가 움직이면 손이 겨눈 자리가 달아난다.
 */
export function useSheetCursor({
  ids,
  onOpen,
  onMove,
  onFavorite,
}: {
  ids: string[];
  onOpen: (id: string) => void;
  /** 키보드로 옮긴 직후 · 그 행을 보이는 데까지 끌어오는 데 쓴다 */
  onMove?: (id: string) => void;
  /**
   * `F` 로 짚은 줄의 관심을 켜고 끈다 · 주는 화면에서만 산다.
   *
   * 여기 둔 건 ↑↓ 와 한 짝이기 때문이다. 훑어 내려가다 마음에 드는 줄에서 손을 떼지
   * 않고 별을 켜는 흐름이라, 커서를 쥔 쪽이 함께 들고 있어야 「지금 짚은 줄」 이
   * 둘 사이에서 어긋나지 않는다.
   */
  onFavorite?: (id: string) => void;
}): SheetCursor {
  const [id, setId] = useState<string | null>(null);
  const ref = useRef({ ids, onOpen, onMove, onFavorite, id });
  ref.current = { ids, onOpen, onMove, onFavorite, id };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTypingInto(document.activeElement)) return;

      const { ids, onOpen, onMove, onFavorite, id } = ref.current;
      if (ids.length === 0) return;

      /*
       * 자판 자리(`code`)를 먼저 본다 · 한글 입력기가 켜져 있으면 F 자리를 눌러도
       * `key` 는 `ㄹ` 이라, 글자로만 보면 영문일 때만 먹는다.
       */
      if (e.code === "KeyF" || e.key === "f" || e.key === "F") {
        if (!onFavorite || !id) return;
        e.preventDefault();
        onFavorite(id);
        return;
      }

      if (e.key === "Enter") {
        /* 단추나 링크에 초점이 가 있으면 그쪽 일이다 · 가로채면 한 번 눌러 둘이 일어난다 */
        if (!id || document.activeElement?.closest("button, a, [role=button]"))
          return;
        e.preventDefault();
        onOpen(id);
        return;
      }

      const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (dir === 0) return;
      e.preventDefault();

      /*
       * 짚은 데가 없으면 첫 줄부터 · 거르개가 짚던 줄을 걸러 냈을 때도 여기로 온다.
       * 요약은 이미 첫 개체를 세워 두고 있으니 사진은 그대로고, 밝은 줄이 새로 생긴다.
       */
      const at = id ? ids.indexOf(id) : -1;
      const next = at < 0 ? 0 : Math.min(Math.max(at + dir, 0), ids.length - 1);
      setId(ids[next]);
      onMove?.(ids[next]);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* 거르개가 바뀌어 짚던 줄이 사라졌으면 손가락을 치운다 */
  useEffect(() => {
    if (id !== null && !ids.includes(id)) setId(null);
  }, [ids, id]);

  return { id, set: setId };
}
