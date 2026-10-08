"use client";

import { useEffect, useId, type RefObject } from "react";
import { create } from "zustand";

interface ToastInsetState {
  /** 화면 오른쪽 끝에서 사이드 메뉴가 차지한 폭 px · 토스트는 이만큼 비켜 선다 */
  right: number;
  /** 지금 자리를 쥔 메뉴 · 페이지를 옮길 때 나가는 쪽이 들어온 쪽 값을 지우지 않게 */
  owner: string | null;
}

/**
 * 토스트가 비켜 설 오른쪽 폭 · 토스터(`providers.tsx`)가 읽는다.
 *
 * 사이드 메뉴는 화면 끝이 아니라 본문 폭(`PAGE_SHELL_CLASS`) 안 오른쪽에 붙고, 패널을
 * 펴면 304px 더 넓어진다. 토스터 자리를 고정값으로 두면 펴 둔 패널 위에 영수증이 덮여
 * 방금 넣은 입찰이 올라올 「내 입찰」 목록을 가린다.
 */
export const useToastInset = create<ToastInsetState>(() => ({
  right: 0,
  owner: null,
}));

/**
 * 이 메뉴가 오른쪽에서 차지한 폭을 토스터에 알린다.
 *
 * `ref` 는 메뉴를 담는 틀(본문 폭에 맞춰 가운데 서는 투명한 판)이다. 그 틀의 오른쪽
 * 끝이 화면 끝에서 떨어진 만큼에 메뉴 폭(`coveredWidth`)을 더한다. 폭은 화면 폭이
 * 바뀔 때마다 다시 잰다 — 넓은 화면에서는 틀이 가운데로 들어와 떨어진 거리가 변한다.
 */
export function useReserveToastInset(
  ref: RefObject<HTMLElement | null>,
  coveredWidth: number,
) {
  const owner = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const outside =
        document.documentElement.clientWidth - el.getBoundingClientRect().right;
      useToastInset.setState({
        right: Math.max(0, outside) + coveredWidth,
        owner,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (useToastInset.getState().owner === owner) {
        useToastInset.setState({ right: 0, owner: null });
      }
    };
  }, [ref, coveredWidth, owner]);
}
