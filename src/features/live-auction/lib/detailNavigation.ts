/**
 * 개체 페이지의 「← 상장표」 가 뒤로가기로 돌아갈지, 새로 열지 정하는 표식.
 *
 * 상장표에서 넘어왔으면 뒤로가기가 스크롤·필터까지 그대로 되살린다. 주소를 직접 치고 들어왔으면
 * 뒤로가기가 경매장 밖으로 나가 버리므로 그때는 상장표를 새로 연다.
 * 이전/다음 개체는 `router.replace` 로 넘겨 기록을 쌓지 않으므로 표식 하나로 충분하다.
 */
const FROM_SHEET_KEY = "live-auction:from-sheet";

export function markFromSheet() {
  window.sessionStorage.setItem(FROM_SHEET_KEY, "1");
}

export function clearFromSheet() {
  window.sessionStorage.removeItem(FROM_SHEET_KEY);
}

export function cameFromSheet(): boolean {
  return window.sessionStorage.getItem(FROM_SHEET_KEY) === "1";
}

/**
 * 상장표의 「부위별」 단추로 들어왔다는 표식 · 부위별 방이 열리자마자 부위 선택기를 편다.
 *
 * 단추는 어느 부위로 갈지 묻지 않고 등심으로 꽂는다 — 묻는 단계를 하나 두면 그만큼 느리다.
 * 대신 도착해서 선택기를 바로 펴 주면 「등심이 아니라 안심」 인 사람도 한 번만 더 누른다.
 * 한 번 읽으면 지운다 · 새로고침이나 ←/→ 이동에서 또 열리면 안 된다.
 */
const OPEN_PART_PICKER_KEY = "live-auction:open-part-picker";

export function markOpenPartPicker() {
  window.sessionStorage.setItem(OPEN_PART_PICKER_KEY, "1");
}

export function consumeOpenPartPicker(): boolean {
  const on = window.sessionStorage.getItem(OPEN_PART_PICKER_KEY) === "1";
  if (on) window.sessionStorage.removeItem(OPEN_PART_PICKER_KEY);
  return on;
}
