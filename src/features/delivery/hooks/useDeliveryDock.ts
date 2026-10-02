"use client";

import { useEffect } from "react";
import {
  createSideDockStore,
  SIDE_DOCK_WIDE_QUERY,
} from "@/features/side-dock/hooks/createSideDockStore";
import { sideDockShellClass } from "@/features/side-dock/components/SideDockShell";

export type DeliveryDockTab = "partners" | "pins" | "notes" | "shortcuts";

/**
 * 배송지시 사이드 메뉴 상태 · 경매장(`useSideDock`)과 **따로** 기억한다.
 *
 * 탭 이름이 겹치지 않는 것이 첫째 까닭이고, 둘째는 두 화면의 표 폭이 달라
 * 한쪽에서 넉넉히 펴 두었던 것이 다른 쪽에서는 표를 자르기 때문이다.
 */
export const useDeliveryDock = createSideDockStore<DeliveryDockTab>({
  name: "delivery-side-dock",
  defaultTab: "partners",
});

/**
 * 저장값을 되살린 뒤, 한 번도 직접 고른 적이 없으면 넓은 화면에서만 펴 둔 채로 시작.
 * (`skipHydration` 이라 이 훅을 부르지 않으면 저장값이 아예 안 올라온다)
 */
export function useDeliveryDockHydration() {
  const applyDefaultOpen = useDeliveryDock((s) => s.applyDefaultOpen);
  useEffect(() => {
    void Promise.resolve(useDeliveryDock.persist.rehydrate()).then(() => {
      applyDefaultOpen(window.matchMedia(SIDE_DOCK_WIDE_QUERY).matches);
    });
  }, [applyDefaultOpen]);
}

/**
 * 배송지시 본문 여백 · 레일 56, 펼치면 360.
 *
 * 최소 폭은 본문이 늘 품어야 하는 폭(사진 판 370 + 눈금 8 + 표 판 520 + 바깥 여백 48
 * = 946)에 레일(56) 또는 펼친 독(360)을 더해 잡는다.
 *
 * 표가 다 보이는 폭(958)이 아니라 **머리줄이 안 밀리는 폭**(520)으로 잡는 게 핵심이다.
 * 표를 기준으로 잡으면 여기가 1822 까지 올라가 웬만한 노트북에서 화면 전체가 가로로
 * 밀린다 — 표 하나 때문에 머리도 사이드 메뉴도 끌고 갈 까닭이 없다. 표는 제 판 안에서
 * 민다.
 */
export function useDeliveryShellClass() {
  const open = useDeliveryDock((s) => s.open);
  return sideDockShellClass(open, {
    minClosed: "min-w-[1002px]",
    minOpen: "min-w-[1306px]",
  });
}
