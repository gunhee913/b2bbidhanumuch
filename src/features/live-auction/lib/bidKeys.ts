import type { KeyboardEvent } from "react";

/** 키보드 스텝 · `+`/`-` 100 · Shift+↑/↓ 1,000 */
export const BID_STEP = 100;
export const BID_STEP_LARGE = 1000;

/** 입찰 입력 표식 · ↑/↓ 로 오갈 칸을 찾는 기준 */
export const BID_INPUT_ATTR = "data-bid-input";
/**
 * ↑/↓ 이동 범위 · 이 표식을 단 조상 안에서만 칸을 찾는다.
 * 개체 뷰어는 portal 로 body 에 붙어 뒤의 상장표와 DOM 형제가 되므로,
 * 범위를 끊지 않으면 다이얼로그 안에서 ↓ 를 눌렀을 때 가려진 표로 포커스가 넘어간다.
 */
export const BID_SCOPE_ATTR = "data-bid-scope";

/** 입력칸 title · 계약이 한 군데서만 쓰이도록 문구도 함께 둔다 */
export const BID_KEY_HINT =
  "Enter 입찰 · Esc 되돌리기 · +/- 100 · Shift+↑↓ 1,000 · ↑↓ 이동";

/** 같은 범위 안의 다음/이전 입력칸으로 포커스를 옮긴다 */
export function focusSiblingBidInput(from: HTMLInputElement, dir: 1 | -1) {
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
  if (!next) return;
  next.focus();
  next.select();
}

export interface BidKeyHandlers {
  onSubmit: () => void;
  onRevert: () => void;
  /** 현재 값에 `delta` 를 더한다 · 하한 0 은 부르는 쪽에서 */
  onStep: (delta: number) => void;
}

/**
 * 입찰 입력칸 공통 키 계약 · 상장표 셀과 개체 뷰어 독이 같은 손버릇을 쓰도록.
 * 처리한 키는 `true` 를 돌려주므로 부르는 쪽에서 추가 동작을 막을 수 있다.
 */
export function handleBidKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  { onSubmit, onRevert, onStep }: BidKeyHandlers,
): boolean {
  if (e.key === "Enter") {
    e.preventDefault();
    onSubmit();
    return true;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    onRevert();
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
