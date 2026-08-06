import type {
  DealerApplication,
  DealerApplicationSubmitInput,
  HandleStatus,
} from "./types";

// ============================================
// 공개 · 신청 접수
// ============================================
export async function submitDealerApplication(
  input: DealerApplicationSubmitInput,
): Promise<{ id: string; applicantName: string; createdAt: string }> {
  const res = await fetch("/api/dealer-applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(err?.error ?? "신청 접수에 실패했습니다.");
  }
  return res.json();
}

// ============================================
// 관리자 · 리스트/상세/상태 변경
// ============================================
export interface AdminListParams {
  status?: HandleStatus | "all";
  keyword?: string;
  from?: string;
  to?: string;
}

export interface AdminListResponse {
  applications: DealerApplication[];
  statusCounts: Record<HandleStatus, number>;
  total: number;
}

export async function fetchAdminDealerApplications(
  params: AdminListParams = {},
): Promise<AdminListResponse> {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);

  const res = await fetch(
    `/api/admin/dealer-applications${qs.toString() ? `?${qs.toString()}` : ""}`,
  );
  if (!res.ok) throw new Error("신청 목록 조회 실패");
  return res.json();
}

export async function fetchAdminDealerApplication(
  id: string,
): Promise<DealerApplication> {
  const res = await fetch(`/api/admin/dealer-applications/${id}`);
  if (!res.ok) throw new Error("신청 상세 조회 실패");
  return res.json();
}

export async function patchAdminDealerApplication(
  id: string,
  patch: {
    handleStatus?: HandleStatus;
    adminNote?: string | null;
    handledBy?: string | null;
  },
): Promise<DealerApplication> {
  const res = await fetch(`/api/admin/dealer-applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("상태 변경 실패");
  return res.json();
}
