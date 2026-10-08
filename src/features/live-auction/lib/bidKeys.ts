import type { KeyboardEvent } from "react";

/**
 * 올리고 내리는 눈금 사다리 · 칸 옆 미니 스텝(`SheetBidCell`)과 같은 네 칸.
 *
 * 맨손 ↑↓ 가 얼마씩 움직일지는 고르게 두고(`bidStep`), Alt·Shift 는 사다리 양 끝에
 * 못 박아 둔다. 수정자까지 고른 값을 따라 움직이면 눈금을 1원으로 바꾸는 순간 셋이
 * 한자리에 겹쳐 빠른 이동이 사라진다. 양 끝이 고정이라야 어떤 눈금을 고르든
 * 「잘게 · 내 눈금 · 크게」 셋이 늘 손에 남는다.
 */
export const BID_STEPS = [1, 10, 100, 1000] as const;
export const BID_STEP_DEFAULT = 100;
export const BID_STEP_FINE = BID_STEPS[0];
export const BID_STEP_LARGE = BID_STEPS[BID_STEPS.length - 1];

/** 입찰 입력 표식 · 값은 부위 id · ↑/↓ 이동과 재포커스가 이 표식으로 칸을 찾는다 */
export const BID_INPUT_ATTR = "data-bid-input";
/**
 * 상장표 칸이 지금 고르기(`nav`)인가 쓰기(`edit`)인가.
 * 방 전역 ←/→(고정축 이동)가 끼어들지 말지를 이 값으로 정한다 — 쓰기 중의
 * ←/→ 는 글자 커서라 가로채면 안 된다.
 */
export const BID_MODE_ATTR = "data-bid-mode";
/**
 * ↑/↓ 이동 범위 · 이 표식을 단 조상 안에서만 칸을 찾는다.
 * 개체 뷰어는 portal 로 body 에 붙어 뒤의 상장표와 DOM 형제가 되므로,
 * 범위를 끊지 않으면 다이얼로그 안에서 ↓ 를 눌렀을 때 가려진 표로 포커스가 넘어간다.
 */
export const BID_SCOPE_ATTR = "data-bid-scope";

export type BidMode = "nav" | "edit";

/** 개체 뷰어 독 입력칸 title · 거기는 모드가 없고 늘 쓰기다 */
export const bidKeyHint = (step: number): string =>
  `Enter 입찰 · Esc 되돌리기 · +/- ${step.toLocaleString("ko-KR")} · Shift+↑↓ 1,000 · ↑↓ 이동`;

/** 표 어디서든 ↑↓ 로 행을 옮기고 숫자로 곧장 그 행의 입찰가를 쓴다 · 머리글 안내가 쓰는 문구 */
export const BID_ENTER_HINT = "↑↓ 행 · Enter 입찰가 쓰기";

/**
 * 상장표 칸 안내 · 모드마다 살아 있는 키가 달라 문구도 갈라 둔다.
 *
 * `rowLabel` 은 ↑/↓ 가 옮기는 것, `pivotLabel` 은 ←/→ 가 옮기는 것이다. 축에 따라
 * 뜻이 뒤집히므로(개체축은 행이 부위, 부위축은 행이 개체) 한 문구로 못 적는다.
 */
export function bidModeHint(
  mode: BidMode,
  rowLabel: string,
  pivotLabel: string,
  step: number,
): string {
  return mode === "nav"
    ? `고르기 · Enter 입찰가 쓰기 · ↑↓ ${rowLabel} · ←→ ${pivotLabel}`
    : `쓰기 · Enter 입찰 · Esc 취소 · ↑↓ ${step.toLocaleString("ko-KR")}`;
}

/** 상장표 입찰칸인가 · 제 화면에서 개체를 넘기는 개체 뷰어 독의 칸은 뺀다 */
export function isSheetBidInput(el: Element | null): boolean {
  return (
    !!el &&
    el.hasAttribute(BID_INPUT_ATTR) &&
    !el.closest(`[${BID_SCOPE_ATTR}]`)
  );
}

/** 고르기 중인 상장표 칸인가 · ←/→ 를 고정축 이동으로 써도 되는 상태 */
export function isSheetBidNav(el: Element | null): boolean {
  return isSheetBidInput(el) && el?.getAttribute(BID_MODE_ATTR) === "nav";
}

const bidInputOf = (partId: string) =>
  document.querySelector<HTMLInputElement>(
    `[${BID_INPUT_ATTR}="${CSS.escape(partId)}"]:not([disabled])`,
  );

/** 특정 부위의 입찰칸으로 · 고르기로 든다 · 고정축을 넘긴 뒤 같은 손자리를 잇는다 */
export function focusBidInput(partId: string): boolean {
  const el = bidInputOf(partId);
  if (!el) return false;
  el.focus();
  el.select();
  return true;
}

/** 쓰기로 곧장 들 칸 · `enterBidInput` 이 맡기고 칸의 `onFocus` 가 찾아간다 */
let pendingEditPartId: string | null = null;

/**
 * 행에서 그 행의 입찰칸에 **쓰기로 곧장** 든다 · 옮겼으면 `true`.
 *
 * 고르기를 거쳐 들어가면 칸에 드는 Enter 와 쓰기로 바꾸는 Enter 가 따로라
 * ↑↓ 로 값을 만지기까지 Enter 를 두 번 친다.
 *
 * 「쓰기로」 는 키 이벤트로 못 넘긴다 — 누른 순간의 대상은 칸이 아니라 행이다. 그래서
 * 여기 맡겨 두고 칸의 `onFocus` 가 `takePendingEdit` 로 받아 간다(`focus()` 는 그
 * 자리에서 `onFocus` 를 부르므로 맡긴 것이 다른 칸으로 새지 않는다).
 */
export function enterBidInput(partId: string): boolean {
  const el = bidInputOf(partId);
  if (!el) return false;
  pendingEditPartId = partId;
  el.focus();
  pendingEditPartId = null;
  return true;
}

export function takePendingEdit(partId: string): boolean {
  if (pendingEditPartId !== partId) return false;
  pendingEditPartId = null;
  return true;
}

/**
 * 표의 첫 입찰칸으로 · 옮겼으면 `true`.
 *
 * 개체 뷰어가 떠 있으면(`BID_SCOPE_ATTR` 이 DOM 에 있으면) 아무것도 하지 않는다.
 * 가려진 표로 포커스를 보내면 화면에 보이지도 않는 칸에 숫자가 들어간다.
 */
export function focusFirstBidInput(): boolean {
  if (document.querySelector(`[${BID_SCOPE_ATTR}]`)) return false;
  const first = document.querySelector<HTMLInputElement>(
    `[${BID_INPUT_ATTR}]:not([disabled])`,
  );
  if (!first) return false;
  first.focus();
  first.select();
  return true;
}

/**
 * 같은 범위 안의 다음/이전 입력칸으로 · 옮겼으면 `true`.
 * 마감된 행은 입력칸 자체가 없으므로 자연히 건너뛴다.
 */
export function focusSiblingBidInput(
  from: HTMLInputElement,
  dir: 1 | -1,
): boolean {
  const scope = from.closest(`[${BID_SCOPE_ATTR}]`);
  const all = Array.from(
    (scope ?? document).querySelectorAll<HTMLInputElement>(
      `[${BID_INPUT_ATTR}]:not([disabled])`,
    ),
  );
  // 범위 밖(상장표)에서 출발했다면 범위 안(다이얼로그) 칸은 후보에서 뺀다
  const inputs = scope
    ? all
    : all.filter((el) => !el.closest(`[${BID_SCOPE_ATTR}]`));

  const next = inputs[inputs.indexOf(from) + dir];
  if (!next) return false;
  next.focus();
  next.select();
  return true;
}

/* ───────────────────────── 상장표 칸 · 모드 분리 ───────────────────────── */

export interface SheetBidKeyHandlers {
  mode: BidMode;
  /** 지금 값을 통째로 골라 쓰기로 · 숫자를 치면 갈리고 ↑↓ 는 그 값에서 움직인다 */
  onEdit: () => void;
  /** 고르기로 돌아간다 */
  onNav: () => void;
  /** 값을 지우고 쓰기로 */
  onClear: () => void;
  onSubmit: () => void;
  onRevert: () => void;
  /** 현재 값에 `delta` 를 더한다 · 하한 0 은 부르는 쪽에서 */
  onStep: (delta: number) => void;
  /** 맨손 ↑↓ · +/- 한 번에 움직일 금액 · 설정값(`bidStep`)이 들어온다 */
  step: number;
  /** 빈 칸인가 · 넣을 게 없으니 Enter 가 그냥 다음 줄로 간다 */
  isEmpty: boolean;
  /** 고쳐 두고 아직 안 넣은 값이 있나 · 고르기에서도 Enter 한 번에 넣는다 */
  hasDraft: boolean;
  /** 넣을 수 있는 값인가 */
  canSubmit: boolean;
}

/**
 * 상장표 입찰칸 키 계약 · 엑셀과 같은 모드 분리.
 *
 * 칸이 늘 편집 상태면 「표의 ↑↓ = 줄 이동」 과 「숫자칸의 ↑↓ = 값 증감」 이 같은 키를
 * 놓고 다툰다. 예전엔 값 조절을 Shift+↑↓ 로 밀어 풀었는데, 그래서 관례와 거꾸로가 됐고
 * ←/→ 는 글자 커서를 잃었다. 모드를 나누면 두 관례가 각자 제 모드에서 그대로 산다.
 *
 * **고르기에서 숫자는 칸 것이 아니다** · 방의 등급 거르개(`useGradeHotkeys`)로 간다.
 * ↑↓ 로 행을 옮기기만 해도 칸이 고르기로 잡히는데, 거기서 숫자가 입찰가로 들어가면
 * 표를 훑는 동안 등급 단축키가 통째로 죽는다. 값은 Enter 로 쓰기에 든 뒤에만 친다.
 * 그래서 훑는 동안(고르기)에는 값이 변하지 않고, 훑다가 실수로 초안을 만들어
 * 일괄 입찰에 딸려 들어가는 일도 없다.
 */
export function handleSheetBidKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  {
    mode,
    onEdit,
    onNav,
    onClear,
    onSubmit,
    onRevert,
    onStep,
    step,
    isEmpty,
    hasDraft,
    canSubmit,
  }: SheetBidKeyHandlers,
): void {
  const input = e.currentTarget;
  const bare = !e.metaKey && !e.ctrlKey && !e.altKey;

  /*
   * 빈 칸은 넣을 게 없으니 그냥 다음 줄 — 훑다가 Enter 를 눌러도 쓸데없는 오류가 안 뜬다.
   * 값은 썼는데 못 넣는 값(최저 미달 등)이면 그 자리에 세워 둔다. 조용히 넘어가면
   * 왜 안 들어갔는지 모른 채 스무 줄을 지나간다.
   */
  const submitAndAdvance = () => {
    if (!isEmpty) {
      onSubmit();
      if (!canSubmit) {
        onEdit();
        return;
      }
    }
    onNav();
    focusSiblingBidInput(input, 1);
  };

  // `+`/`-` 는 두 모드 공통 · 한 손으로 한 칸 올리고 내리던 손버릇을 남긴다
  if (bare && (e.key === "+" || e.key === "=" || e.key === "-")) {
    e.preventDefault();
    onStep(e.key === "-" ? -step : step);
    return;
  }

  if (mode === "nav") {
    // 숫자는 먹지 않는다 · 방의 등급 단축키가 받는다
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onClear();
      return;
    }
    /* 고쳐 둔 값이 있으면 곧장 넣는다 · 고치러 들어가는 Enter 를 한 번 더 치게 하지 않는다 */
    if (e.key === "Enter") {
      e.preventDefault();
      if (hasDraft) submitAndAdvance();
      else onEdit();
      return;
    }
    /*
     * ↑/↓ 는 먹지 않는다 · 방이 받아 행을 옮기고 옮긴 행의 칸을 다시 잡는다.
     * 칸끼리 건너뛰면 마감돼 칸이 없는 행을 못 지나가고, 고른 행과 칸이 갈린다.
     */
    if (e.key === "ArrowUp" || e.key === "ArrowDown") return;
    // 두 번째 Esc · 쓰기에서 빠져나온 뒤 한 번 더 누르면 표로 돌아간다
    if (e.key === "Escape") {
      e.preventDefault();
      input.blur();
    }
    // ←/→ 는 먹지 않는다 · 방이 받아 고정축을 옮긴다
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    submitAndAdvance();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    onRevert();
    onNav();
    return;
  }
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const size = e.shiftKey ? BID_STEP_LARGE : e.altKey ? BID_STEP_FINE : step;
    onStep(e.key === "ArrowUp" ? size : -size);
    return;
  }
  // 쓰는 중의 ←/→ 는 글자 커서다 · 방의 고정축 이동으로 새지 않게 막는다
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
}

/* ───────────────────────── 개체 뷰어 독 · 모드 없음 ───────────────────────── */

export interface BidKeyHandlers {
  onSubmit: () => void;
  onRevert: () => void;
  onStep: (delta: number) => void;
  /** 맨손 +/- 한 번에 움직일 금액 · 설정값(`bidStep`)이 들어온다 */
  step: number;
  /**
   * 되돌릴 초안이 있는지 · Esc 2단계를 쓰는 화면만 준다.
   * 주지 않으면 늘 되돌리기만 한다.
   */
  canRevert?: boolean;
}

/**
 * 개체 뷰어 독 입력칸 · 한 화면에 칸이 몇 개뿐이고 표가 아니라 모드를 두지 않는다.
 * 처리한 키는 `true` 를 돌려주므로 부르는 쪽에서 추가 동작을 막을 수 있다.
 */
export function handleBidKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  { onSubmit, onRevert, onStep, step, canRevert }: BidKeyHandlers,
): boolean {
  if (e.key === "Enter") {
    e.preventDefault();
    onSubmit();
    return true;
  }
  // 고친 게 있으면 되돌리고, 없으면 칸에서 빠져나온다 · 두 번 누르면 늘 표로 돌아간다
  if (e.key === "Escape") {
    e.preventDefault();
    if (canRevert === false) e.currentTarget.blur();
    else onRevert();
    return true;
  }
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    if (e.shiftKey) {
      onStep(e.key === "ArrowUp" ? BID_STEP_LARGE : -BID_STEP_LARGE);
    } else {
      focusSiblingBidInput(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
    }
    return true;
  }
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    onStep(step);
    return true;
  }
  if (e.key === "-") {
    e.preventDefault();
    onStep(-step);
    return true;
  }
  return false;
}
