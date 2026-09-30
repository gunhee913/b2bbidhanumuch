import type { AuctionCalendarMonth, AuctionDayUpsertItem } from "./types";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`요청 실패(${res.status}) ${text}`);
  }
  return (await res.json()) as T;
}

export async function fetchAuctionCalendarMonth(
  month: string,
  slaughterHouse?: string | null,
): Promise<AuctionCalendarMonth> {
  const params = new URLSearchParams({ month });
  if (slaughterHouse) params.set("slaughterHouse", slaughterHouse);
  return await getJson<AuctionCalendarMonth>(
    `/api/auction-days?${params.toString()}`,
  );
}

export async function saveAuctionDays(payload: {
  slaughterHouse: string;
  month: string;
  days: AuctionDayUpsertItem[];
  updatedBy?: string;
}): Promise<{ saved: number }> {
  return await getJson<{ saved: number }>("/api/admin/auction-days", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
