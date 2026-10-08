import { isValid, parseISO, set } from "date-fns";

/**
 * 배송지 수정 마감 · **그 부위의 상장일** 오후 1시 30분.
 *
 * 오늘 시각이 아니라 상장일을 기준으로 삼는 까닭은, 이 화면이 하루가 아니라 조회기간
 * 전체를 한 줄기로 늘어놓기 때문이다. 오늘로 재면 지난주 낙찰분까지 아직 고칠 수 있는
 * 것이 되는데, 그 고기는 이미 실려 나갔다.
 *
 * 잠그는 까닭은 자료가 아니라 **그 뒤 일**을 지키기 위해서다. 작업장이 이 목록대로
 * 집어 담기 시작한 뒤에 배송지가 소리 없이 바뀌면 고기가 엉뚱한 집으로 간다.
 */
/**
 * 마감을 쓰나 · 꺼 두면 아무것도 잠기지 않고 화면에서도 마감 문구가 빠진다.
 * 서버(`/api/delivery/assignments`)도 같은 `isDeliveryLocked` 를 타므로 여기 하나로 같이 꺼진다.
 */
export const DELIVERY_DEADLINE_ENABLED = false;

export const DELIVERY_DEADLINE_HOUR = 13;
export const DELIVERY_DEADLINE_MINUTE = 30;
export const DELIVERY_DEADLINE_LABEL = "13:30";

/** 그 상장일의 마감 시각 · 날짜가 비었거나 읽히지 않으면 null (그때는 잠그지 않는다) */
export function deliveryDeadline(listingDate: string | null | undefined) {
  if (!listingDate) return null;
  const day = parseISO(listingDate);
  if (!isValid(day)) return null;
  return set(day, {
    hours: DELIVERY_DEADLINE_HOUR,
    minutes: DELIVERY_DEADLINE_MINUTE,
    seconds: 0,
    milliseconds: 0,
  });
}

/**
 * 마감이 지났는가 · 중도매인은 이때부터 읽기만 한다.
 *
 * 날짜를 읽을 수 없으면 **잠그지 않는다**. 자료가 이상하다는 이유로 고칠 길까지 막으면
 * 고칠 방법이 화면에서 사라진다 — 막는 쪽이 아니라 여는 쪽으로 틀리는 편이 낫다.
 */
export function isDeliveryLocked(
  listingDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!DELIVERY_DEADLINE_ENABLED) return false;
  const deadline = deliveryDeadline(listingDate);
  if (!deadline) return false;
  return now.getTime() > deadline.getTime();
}
