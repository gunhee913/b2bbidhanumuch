import type {
  RoundSchedule,
  RoundScheduleUpsertItem,
  RoundSchedulesResponse,
} from "./types";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`요청 실패(${res.status}) ${text}`);
  }
  return (await res.json()) as T;
}

export async function fetchRoundSchedules(
  slaughterHouse: string,
  date: string,
): Promise<RoundSchedulesResponse> {
  const params = new URLSearchParams({
    slaughterHouse,
    date,
  });
  return await getJson<RoundSchedulesResponse>(
    `/api/round-schedules?${params.toString()}`,
  );
}

export async function fetchAdminRoundSchedules(
  slaughterHouse: string,
  date: string,
): Promise<RoundSchedulesResponse> {
  const params = new URLSearchParams({
    slaughterHouse,
    date,
  });
  return await getJson<RoundSchedulesResponse>(
    `/api/admin/round-schedules?${params.toString()}`,
  );
}

export async function upsertRoundSchedules(payload: {
  slaughterHouse: string;
  auctionDate: string;
  schedules: RoundScheduleUpsertItem[];
  updatedBy?: string;
}): Promise<{ schedules: RoundSchedule[] }> {
  return await getJson<{ schedules: RoundSchedule[] }>(
    "/api/admin/round-schedules",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteRoundSchedules(
  slaughterHouse: string,
  date: string,
): Promise<{ deleted: number }> {
  const params = new URLSearchParams({ slaughterHouse, date });
  return await getJson<{ deleted: number }>(
    `/api/admin/round-schedules?${params.toString()}`,
    { method: "DELETE" },
  );
}

export async function copyRoundSchedules(payload: {
  slaughterHouse: string;
  fromDate: string;
  toDate: string;
  updatedBy?: string;
}): Promise<{ schedules: RoundSchedule[] }> {
  return await getJson<{ schedules: RoundSchedule[] }>(
    "/api/admin/round-schedules/copy",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
