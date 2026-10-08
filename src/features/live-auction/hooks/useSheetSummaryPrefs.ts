"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyStagePlacement,
  STAGE_PLACEMENT_DEFAULT,
  type StagePlacement,
  type StageSlot,
} from "./useRoomLayout";
import {
  SUMMARY_PANEL_DEFAULT_WIDTH,
  SUMMARY_PANEL_MAX_WIDTH,
  SUMMARY_PANEL_MIN_WIDTH,
} from "../lib/sheetLayout";

interface SheetSummaryPrefsState {
  /**
   * 상장표 요약 사진 위 판정 각인의 자리와 배율.
   *
   * 상세 방 · 배송지시 · 경매결과와 따로 담는다. 이 사진은 454~734px 짜리라, 넓은 상세
   * 방에서 구석에 밀어 둔 각인이 여기서는 단면 한복판을 덮는다.
   *
   * 되살리기를 미루지 않는다(`skipHydration` 없음). 요약은 표 폭을 잰 뒤에야 서고 개체도
   * 클라이언트에서 받아 오므로, 서버가 그린 것과 어긋날 각인이 처음부터 없다.
   */
  stage: Record<StageSlot, StagePlacement>;
  setStagePlacement: (slot: StageSlot, patch: Partial<StagePlacement>) => void;
  resetStagePlacement: (slot: StageSlot) => void;
  /**
   * 요약(사진 · 시세) 폭 px · 표와 요약 사이 선을 끌어 정한다.
   * 창이 좁으면 그릴 때만 깎고 잡아 둔 값은 그대로 둔다 (`summaryPanelWidthCss`) —
   * 메뉴를 접으면 다시 이 폭으로 돌아온다.
   */
  panelWidth: number;
  setPanelWidth: (px: number) => void;
  resetPanelWidth: () => void;
}

export const useSheetSummaryPrefs = create<SheetSummaryPrefsState>()(
  persist(
    (set) => ({
      stage: STAGE_PLACEMENT_DEFAULT,
      setStagePlacement: (slot, patch) =>
        set((s) => ({
          stage: {
            ...s.stage,
            [slot]: applyStagePlacement(
              s.stage[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
              patch,
            ),
          },
        })),
      resetStagePlacement: (slot) =>
        set((s) => ({
          stage: { ...s.stage, [slot]: STAGE_PLACEMENT_DEFAULT[slot] },
        })),
      panelWidth: SUMMARY_PANEL_DEFAULT_WIDTH,
      setPanelWidth: (px) =>
        set({
          panelWidth: Math.round(
            Math.min(
              SUMMARY_PANEL_MAX_WIDTH,
              Math.max(SUMMARY_PANEL_MIN_WIDTH, px),
            ),
          ),
        }),
      resetPanelWidth: () => set({ panelWidth: SUMMARY_PANEL_DEFAULT_WIDTH }),
    }),
    { name: "live-sheet-summary-prefs", version: 1 },
  ),
);
