import type { DealerTransaction } from "./lib/balance";

export interface DealerDashboard {
  summary: {
    bidCount: number;
    wonCount: number;
    wonAmount: number;
    wonRate: number;
  };
  daily: {
    date: string;
    bidCount: number;
    wonCount: number;
    wonAmount: number;
  }[];
  byPart: {
    name: string;
    bidCount: number;
    wonCount: number;
    wonAmount: number;
    weight: number;
    wonRate: number;
    ratio: number;
  }[];
  byPartner: {
    name: string;
    wonCount: number;
    wonAmount: number;
    weight: number;
    ratio: number;
  }[];
}

export interface NotificationSettings {
  listingUpload: boolean;
  auctionStart: boolean;
  auctionResult: boolean;
  balance: boolean;
}

export interface DealerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  category: string | null;
  isPinned: boolean;
  createdAt: string;
}

export interface NoticeDetail extends Notice {
  content: string;
}

/** 취소된 줄은 서버에서 거른다 · 잔고 셈은 관리자 잔액 화면과 같은 기준이어야 한다 */
export async function fetchMyTransactions(
  dealerId: string,
): Promise<DealerTransaction[]> {
  const qs = new URLSearchParams({ dealerId, status: "active" });
  const res = await fetch(`/api/dealer-transactions?${qs}`);
  if (!res.ok) throw new Error("거래내역을 불러오지 못했습니다.");
  const json = await res.json();
  return (json.transactions ?? []) as DealerTransaction[];
}

export async function fetchMyDashboard(
  dealerId: string,
  startDate: string,
  endDate: string,
): Promise<DealerDashboard> {
  const qs = new URLSearchParams({ dealerId, startDate, endDate });
  const res = await fetch(`/api/dealer/dashboard?${qs}`);
  if (!res.ok) throw new Error("낙찰 요약을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const res = await fetch("/api/notifications/settings");
  if (!res.ok) throw new Error("알림 설정을 불러오지 못했습니다.");
  return res.json();
}

export async function patchNotificationSettings(
  body: Partial<NotificationSettings>,
): Promise<void> {
  const res = await fetch("/api/notifications/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("알림 설정을 저장하지 못했습니다.");
}

export async function fetchMyNotifications(): Promise<DealerNotification[]> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("알림을 불러오지 못했습니다.");
  return res.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch("/api/notifications/read-all", { method: "PATCH" });
}

export async function clearNotifications(): Promise<void> {
  await fetch("/api/notifications/clear", { method: "DELETE" });
}

/** 중도매인 대상 + 전체 대상 공지 · 고정 공지가 먼저, 그다음 최신순(서버 정렬) */
export async function fetchDealerNotices(limit: number): Promise<Notice[]> {
  const qs = new URLSearchParams({ target: "dealer", limit: String(limit) });
  const res = await fetch(`/api/notices?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchNoticeDetail(id: string): Promise<NoticeDetail> {
  const res = await fetch(`/api/notices/${id}`);
  if (!res.ok) throw new Error("공지사항을 찾을 수 없습니다.");
  return res.json();
}
