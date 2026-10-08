import { isSheetBidNav } from "./bidKeys";

/**
 * 글자 단축키(`/` · `b`)를 살릴지 말지 가르는 한 가지 기준.
 *
 * `readOnly` 는 「쓰는 중」 이 아니다 — 상장표 입찰칸은 고르기일 때 읽기전용 input 이라,
 * 칸에 커서가 있어도 글이 들어가지 않는다. 거기서도 단축키가 살아야 표를 훑다가
 * 손을 떼지 않고 검색하거나 축을 바꾼다.
 *
 * 방향키는 이 기준을 쓰지 않는다. 읽기전용이어도 ↑/↓ 는 칸이 직접 쓰는 키라,
 * 여기서 「안 쓰는 중」 으로 보면 방이 한 번 더 집어 두 번 움직인다.
 */
export function isTypingInto(el: Element | null): boolean {
  if (el instanceof HTMLInputElement) return !el.readOnly;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * 글자가 들어갈 수 있는 칸인가 · 숫자 단축키(등급 거르기)가 쓰는 기준.
 *
 * 위와 달리 `readOnly` 를 대체로 봐주지 않는다 — 날짜 고르개처럼 읽기전용이어도 숫자를
 * 제 키로 쓰는 칸이 있다. **고르기 모드 상장표 칸만 뺀다.** 거기서 숫자는 칸이 먹지
 * 않고(`handleSheetBidKeyDown`) 이 단축키로 오게 짜여 있다. ↑↓ 로 행만 옮겨도 칸이
 * 고르기로 잡히므로, 이걸 안 빼면 표를 훑는 동안 등급 단축키가 내내 죽는다.
 */
export function isFieldFocused(el: Element | null): boolean {
  if (isSheetBidNav(el)) return false;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}
