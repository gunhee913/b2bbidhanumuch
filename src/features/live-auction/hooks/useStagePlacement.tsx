"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useMeasure } from "react-use";
import {
  useRoomLayout,
  STAGE_PLACEMENT_DEFAULT,
  STAGE_SCALE_MAX,
  STAGE_SCALE_MIN,
  type StagePlacement,
  type StagePos,
  type StageSlot,
} from "./useRoomLayout";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 겹 자리를 담아 두는 곳 · 방마다 제 저장소가 다르다 */
export interface StagePlacementStore {
  get: (slot: StageSlot) => StagePlacement;
  set: (slot: StageSlot, patch: Partial<StagePlacement>) => void;
  reset: (slot: StageSlot) => void;
}

const StagePlacementContext = createContext<StagePlacementStore | null>(null);

/**
 * 겹 자리를 다른 저장소에 담게 한다 · 감싸지 않으면 경매장 상세 방 것을 쓴다.
 *
 * 배송지시가 같은 각인·쪽지를 쓰면서도 자리를 따로 담는 까닭은 두 무대가 다른 크기라서다.
 * 경매장 1열은 화면 높이를 거의 다 쓰지만 배송 그림판은 그 절반이고, 자리를 공유하면
 * 한쪽에서 구석으로 밀어 둔 쪽지가 다른 쪽에서는 사진 한복판을 덮는다.
 */
export function StagePlacementScope({
  store,
  children,
}: {
  store: StagePlacementStore;
  children: ReactNode;
}) {
  return (
    <StagePlacementContext.Provider value={store}>
      {children}
    </StagePlacementContext.Provider>
  );
}

/** 감싸지 않았을 때 쓰는 기본 저장소 · 경매장 상세 방 레이아웃 */
function useRoomPlacementStore(): StagePlacementStore {
  const stage = useRoomLayout((state) => state.stage);
  const set = useRoomLayout((state) => state.setStagePlacement);
  const reset = useRoomLayout((state) => state.resetStagePlacement);
  return useMemo(
    () => ({
      get: (slot) => stage[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
      set,
      reset,
    }),
    [stage, set, reset],
  );
}

/** 배율 1 일 때의 뿌리 글꼴 · 겹 안쪽 치수를 전부 이 값의 em 으로 적는다 */
const BASE_FONT_PX = 10;

type Handlers<T extends HTMLElement> = {
  onPointerDown: (e: PointerEvent<T>) => void;
  onPointerMove: (e: PointerEvent<T>) => void;
  onPointerUp: (e: PointerEvent<T>) => void;
  onPointerCancel: (e: PointerEvent<T>) => void;
};

export interface StagePlacementHandle<T extends HTMLElement> {
  /**
   * 재는 자리 · **여백을 두르지 않은 바깥 요소**에 걸어야 한다.
   *
   * `useMeasure` 가 돌려주는 건 ResizeObserver 의 `contentRect`, 곧 패딩을 뺀 안쪽
   * 상자다. 여기에 패딩을 두르면 실제보다 작게 재고 그만큼 무대 밖으로 더 나갈 수
   * 있다고 계산해, 끝에 붙였을 때 겹이 삐져나가 바깥 스크롤 영역을 늘린다.
   */
  ref: (el: T | null) => void;
  style: CSSProperties;
  /** 끌기 손잡이 · 상자 전체일 수도, 제목줄 하나일 수도 있다 */
  moveProps: Handlers<HTMLElement>;
  /** 모서리 손잡이에 건다 · 상자의 끌기로 번지지 않게 막는다 */
  sizeProps: Handlers<HTMLElement>;
  /** 끌거나 키우는 중 · 커서와 테두리를 바꾸는 데 쓴다 */
  active: boolean;
  reset: () => void;
}

/**
 * 사진 무대 위에 얹은 겹의 자리와 크기 · 끌어서 옮기고 모서리로 키운다.
 *
 * **자리를 `left` 가 아니라 `transform` 으로 잡는 이유.** 절대배치 요소에 `left` 만
 * 주고 `right` 를 비우면 쓸 수 있는 폭이 「무대 - left」 로 줄어든다. 그래서 오른쪽으로
 * 끌수록 상자가 좁아지며 글이 접히고, 접히면 상자가 다시 좁아져 서로를 끌어당긴다.
 * `transform` 은 배치를 건드리지 않아 어디에 놓든 제 폭 그대로다.
 *
 * **크기를 `scale()` 이 아니라 글꼴로 키우는 이유.** `transform: scale` 은 작게 그려 둔
 * 글자를 사진처럼 늘리는 것이라 키울수록 뭉개진다. 안쪽 치수를 전부 `em` 으로 적어 두고
 * 뿌리 글꼴만 바꾸면 브라우저가 그 크기로 새로 그려 어느 배율에서나 또렷하다. 덤으로
 * 잰 크기가 곧 실제 크기라, 무대 안에 가두는 셈이 따로 필요 없다.
 *
 * 옮기거나 키우는 동안은 바깥 저장소를 건드리지 않고 이 안의 값으로만 그린다 — 저장소는
 * localStorage 에 쓰기 때문에 매 프레임 밀어 넣으면 손끝이 끊긴다. 놓을 때 한 번 담는다.
 */
export function useStagePlacement<T extends HTMLElement>({
  slot,
  stageWidth,
  stageHeight,
}: {
  slot: StageSlot;
  stageWidth: number;
  stageHeight: number;
}): StagePlacementHandle<T> {
  /*
   * 감싼 저장소가 있으면 그쪽, 없으면 상세 방 것. 기본 저장소를 늘 불러 두는 건
   * 훅 규칙 때문인데, 읽기 구독 하나라 다른 방에서도 값이 들지 않는다.
   */
  const scoped = useContext(StagePlacementContext);
  const roomStore = useRoomPlacementStore();
  const store = scoped ?? roomStore;

  const saved = store.get(slot);
  const setPlacement = store.set;
  const resetPlacement = store.reset;

  const [selfRef, self] = useMeasure<T>();
  /** 손끝을 따라가는 동안의 임시 값 · 놓으면 비우고 저장소 값으로 돌아간다 */
  const [drag, setDrag] = useState<StagePos | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  /**
   * 집은 지점과 그때의 자리 · 변위로 센다.
   *
   * 무대 모서리를 기준으로 재지 않는 건 손잡이가 상자 안쪽 어디에든 있을 수 있어서다.
   * 메모는 입력칸이 끌기와 다투지 않게 제목줄만 손잡이로 쓰는데, 그러면 `parentElement`
   * 가 무대가 아니라 상자가 된다. 집은 자리에서 손이 간 만큼만 더하면 기준이 필요 없다.
   */
  const grabRef = useRef<{ x: number; y: number; pos: StagePos } | null>(null);
  /** 집은 지점·그때의 배율·배율 1 일 때의 폭 · 끄는 내내 바뀌면 안 되는 값들 */
  const sizeRef = useRef<{ x: number; scale: number; unit: number } | null>(
    null,
  );

  const pos = drag ?? saved.pos;
  const scale = zoom ?? saved.scale;

  /** 무대에 들어가는 상한 · 글꼴로 키우니 잰 폭이 곧 실제 폭이라 그대로 비례한다 */
  const unitWidth = self.width > 0 ? self.width / scale : 0;
  const maxScale =
    unitWidth > 0
      ? Math.max(
          STAGE_SCALE_MIN,
          Math.min(STAGE_SCALE_MAX, stageWidth / unitWidth),
        )
      : STAGE_SCALE_MAX;

  /* 내림으로 받는다 · 소수점을 남기면 끝에 붙였을 때 반 픽셀이 무대 밖으로 샌다 */
  const freeX = Math.max(0, Math.floor(stageWidth - self.width));
  const freeY = Math.max(0, Math.floor(stageHeight - self.height));

  const moveProps: Handlers<HTMLElement> = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      grabRef.current = { x: e.clientX, y: e.clientY, pos };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const grab = grabRef.current;
      if (!grab) return;
      setDrag({
        x:
          freeX > 0
            ? clamp01(grab.pos.x + (e.clientX - grab.x) / freeX)
            : grab.pos.x,
        y:
          freeY > 0
            ? clamp01(grab.pos.y + (e.clientY - grab.y) / freeY)
            : grab.pos.y,
      });
    },
    onPointerUp: (e) => {
      if (!grabRef.current) return;
      grabRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (drag) setPlacement(slot, { pos: drag });
      setDrag(null);
    },
    onPointerCancel: (e) => {
      if (!grabRef.current) return;
      grabRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDrag(null);
    },
  };

  const endSize = (e: PointerEvent<HTMLElement>, commit: boolean) => {
    if (!sizeRef.current) return;
    e.stopPropagation();
    sizeRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (commit && zoom != null) setPlacement(slot, { scale: zoom });
    setZoom(null);
  };

  const sizeProps: Handlers<HTMLElement> = {
    /* 손잡이는 상자 안에 있다 · 막지 않으면 크기를 줄이면서 자리까지 끌려간다 */
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      sizeRef.current = { x: e.clientX, scale, unit: unitWidth };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    /* 배율 1 일 때 폭만큼 끌면 2 배 · 손이 간 거리와 커진 폭이 눈금 하나로 맞는다 */
    onPointerMove: (e) => {
      const grip = sizeRef.current;
      if (!grip || grip.unit <= 0) return;
      e.stopPropagation();
      setZoom(
        Math.min(
          maxScale,
          Math.max(
            STAGE_SCALE_MIN,
            grip.scale + (e.clientX - grip.x) / grip.unit,
          ),
        ),
      );
    },
    onPointerUp: (e) => endSize(e, true),
    onPointerCancel: (e) => endSize(e, false),
  };

  return {
    ref: selfRef,
    style: {
      fontSize: `${BASE_FONT_PX * scale}px`,
      /* 소수점을 남기면 가장자리가 반 픽셀씩 삐져나가 테두리가 떤다 */
      transform: `translate(${Math.round(pos.x * freeX)}px, ${Math.round(
        pos.y * freeY,
      )}px)`,
      /*
       * 재기 전에는 감춘다 · 무대도 상자도 첫 프레임엔 0 이라 움직일 범위가 통째로
       * 무대 높이로 잡힌다. 각인처럼 처음 자리가 y=1 이면 그대로 그릴 때 바닥 밖으로
       * 한 번 튀었다가 제자리로 들어온다. 한 프레임 안 보이는 편이 낫다.
       */
      visibility:
        self.height > 0 && stageHeight > 0
          ? undefined
          : ("hidden" as const satisfies CSSProperties["visibility"]),
    },
    moveProps,
    sizeProps,
    active: drag != null || zoom != null,
    reset: () => resetPlacement(slot),
  };
}
