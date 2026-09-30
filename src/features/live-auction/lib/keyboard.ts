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
