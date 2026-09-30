import type { KeyboardEvent } from "react";

/** 스텝 단위 · 맨손 100 · Shift 1,000 · Alt 1(한 칸 차이로 순위가 갈리는 자리) */
export const BID_STEP_FINE = 1;
export const BID_STEP = 100;
export const BID_STEP_LARGE = 1000;

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
export const BID_KEY_HINT =
  "Enter 입찰 · Esc 되돌리기 · +/- 100 · Shift+↑↓ 1,000 · ↑↓ 이동";

/** 표 어디서든 ↓ 로 첫 입찰칸에 들어간다 · 머리글 안내가 쓰는 문구 */
export const BID_ENTER_HINT = "↓ 입찰칸으로";

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
): string {
  return mode === "nav"
    ? `고르기 · 숫자 입력 · ↑↓ ${rowLabel} · ←→ ${pivotLabel} · Enter 고치기`
    : "쓰기 · Enter 입찰 · Esc 취소 · ↑↓ 100 · Shift 1,000 · Alt 1";
}

/** 상장표 입찰칸인가 · 제 화면에서 개체를 넘기는 개체 뷰어 독의 칸은 뺀다 */
export function isSheetBidInput(el: Element | null): boolean {
  return (
    !!el && el.hasAttribute(BID_INPUT_ATTR) && !el.closest(`[${BID_SCOPE_ATTR}]`)
  );
}

/** 고르기 중인 상장표 칸인가 · ←/→ 를 고정축 이동으로 써도 되는 상태 */
export function isSheetBidNav(el: Element | null): boolean {
  return isSheetBidInput(el) && el?.getAttribute(BID_MODE_ATTR) === "nav";
}

/** 특정 부위의 입찰칸으로 · 고정축을 넘긴 뒤 같은 손자리를 잇는다 */
export function focusBidInput(partId: string): boolean {
  const el = document.querySelector<HTMLInputElement>(
    `[${BID_INPUT_ATTR}="${CSS.escape(partId)}"]:not([disabled])`,
  );
  if (!el) return false;
  el.focus();
  el.select();
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
  /** 지금 값을 들고 쓰기로 · 커서는 끝에 둔다 */
  onEdit: () => void;
  /** 고르기로 돌아간다 */
  onNav: () => void;
  /** 이 숫자부터 새로 쓴다 · 빈 문자열이면 지우고 쓰기로 */
  onTypeOver: (digit: string) => void;
  onSubmit: () => void;
  onRevert: () => void;
  /** 현재 값에 `delta` 를 더한다 · 하한 0 은 부르는 쪽에서 */
  onStep: (delta: number) => void;
  /** 빈 칸인가 · 넣을 게 없으니 Enter 가 그냥 다음 줄로 간다 */
  isEmpty: boolean;
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
 * 모드를 따로 켤 일은 없다 — 고르기에서 숫자를 누르면 그 숫자부터 바로 써진다.
 * 훑는 동안(고르기)에는 값이 변하지 않으므로, 훑다가 실수로 초안을 만들어
 * 일괄 입찰에 딸려 들어가는 일도 없다.
 */
export function handleSheetBidKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  {
    mode,
    onEdit,
    onNav,
    onTypeOver,
    onSubmit,
    onRevert,
    onStep,
    isEmpty,
    canSubmit,
  }: SheetBidKeyHandlers,
): void {
  const input = e.currentTarget;
  const bare = !e.metaKey && !e.ctrlKey && !e.altKey;

  // `+`/`-` 는 두 모드 공통 · 한 손으로 한 칸 올리고 내리던 손버릇을 남긴다
  if (bare && (e.key === "+" || e.key === "=" || e.key === "-")) {
    e.preventDefault();
    onStep(e.key === "-" ? -BID_STEP : BID_STEP);
    return;
  }

  if (mode === "nav") {
    if (bare && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      onTypeOver(e.key);
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onTypeOver("");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onEdit();
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      focusSiblingBidInput(input, e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    // 두 번째 Esc · 쓰기에서 빠져나온 뒤 한 번 더 누르면 표로 돌아간다
    if (e.key === "Escape") {
      e.preventDefault();
      input.blur();
    }
    // ←/→ 는 먹지 않는다 · 방이 받아 고정축을 옮긴다
    return;
  }

  /*
   * 빈 칸은 넣을 게 없으니 그냥 다음 줄 — 훑다가 Enter 를 눌러도 쓸데없는 오류가 안 뜬다.
   * 값은 썼는데 못 넣는 값(최저 미달 등)이면 그 자리에 세워 둔다. 조용히 넘어가면
   * 왜 안 들어갔는지 모른 채 스무 줄을 지나간다.
   */
  if (e.key === "Enter") {
    e.preventDefault();
    if (!isEmpty) {
      onSubmit();
      if (!canSubmit) return;
    }
    onNav();
    focusSiblingBidInput(input, 1);
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
    const size = e.shiftKey
      ? BID_STEP_LARGE
      : e.altKey
        ? BID_STEP_FINE
        : BID_STEP;
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
  { onSubmit, onRevert, onStep, canRevert }: BidKeyHandlers,
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
    onStep(BID_STEP);
    return true;
  }
  if (e.key === "-") {
    e.preventDefault();
    onStep(-BID_STEP);
    return true;
  }
  return false;
}
