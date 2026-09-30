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
