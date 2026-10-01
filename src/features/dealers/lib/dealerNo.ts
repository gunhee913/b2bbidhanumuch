/**
 * 중도매인번호를 사람이 부르는 번호로 줄인다 · `7000001` → `1`.
 *
 * 발급 번호는 7000000 에 1씩 얹어 주는 식이라 밑자리가 모두에게 같다. 서로를 부를 때도
 * 「1번」 이라 하지 「7000001번」 이라 하지 않아서, 화면에 자리를 적게 쓰는 쪽이 오히려
 * 읽기 쉽다. 번호를 그대로 써야 하는 곳(낙찰자 표시·정산 내역)에서는 쓰지 말 것.
 *
 * 밑자리보다 작거나 숫자가 아닌 값이 오면 손대지 않는다 — 옛 번호 체계가 섞여 들어와도
 * 음수 같은 엉뚱한 글자를 내놓지 않게 한다.
 */
const DEALER_NO_BASE = 7_000_000;

export function shortDealerNo(
  dealerNo: string | null | undefined,
): string | null {
  if (!dealerNo) return null;
  const parsed = Number(dealerNo);
  if (!Number.isFinite(parsed)) return null;
  return String(parsed > DEALER_NO_BASE ? parsed - DEALER_NO_BASE : parsed);
}
