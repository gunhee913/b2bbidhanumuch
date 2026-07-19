import { redirect } from "next/navigation";

/**
 * `/auction/live` 는 진입 지점 역할만 하고,
 * 기본 공판장(음성)으로 즉시 리다이렉트한다.
 * 공판장 전환은 실시간 경매 페이지 상단의 공판장 dropdown 을 통해 이루어진다.
 */
export default function AuctionLiveIndexPage() {
  redirect("/auction/live/eumseong");
}
