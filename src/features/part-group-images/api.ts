import type { PartGroupImage, PartGroupImagesResponse } from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `요청 실패: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** 전체 기본 + 업체별 전부 · 업체 수 × 부위 16 이라 한 번에 받아도 작다 */
export async function fetchPartGroupImages(): Promise<PartGroupImagesResponse> {
  return requestJson<PartGroupImagesResponse>("/api/part-group-images");
}

export interface PartGroupImageTarget {
  /** null = 전체 기본 */
  companyId: string | null;
  groupName: string;
}

/**
 * 누가 고치는가 · 관리자는 아무 업체·전체 기본을, 업체는 제 것만.
 * 업체 쪽 API 는 company_id 를 세션에서 가져가므로 몸통에 싣지 않는다.
 */
export type PartGroupImageScope = "admin" | "company";

const ENDPOINT: Record<PartGroupImageScope, string> = {
  admin: "/api/admin/part-group-images",
  company: "/api/company/part-group-images",
};

export async function upsertPartGroupImage(
  payload: PartGroupImageTarget & { imageUrl: string },
  scope: PartGroupImageScope = "admin",
): Promise<PartGroupImage> {
  const body =
    scope === "admin"
      ? payload
      : { groupName: payload.groupName, imageUrl: payload.imageUrl };
  return requestJson<PartGroupImage>(ENDPOINT[scope], {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deletePartGroupImage(
  { companyId, groupName }: PartGroupImageTarget,
  scope: PartGroupImageScope = "admin",
): Promise<void> {
  const params = new URLSearchParams({ group: groupName });
  if (scope === "admin" && companyId) params.set("companyId", companyId);
  await requestJson<{ ok: true }>(`${ENDPOINT[scope]}?${params.toString()}`, {
    method: "DELETE",
  });
}

/** base64 data URL → storage 업로드 → public URL · 기존 `/api/upload` 재사용 */
export async function uploadPartGroupImageFile(
  dataUrl: string,
): Promise<string> {
  const res = await requestJson<{ url: string | null }>("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: [dataUrl], folder: "part-groups" }),
  });
  if (!res.url) throw new Error("이미지 업로드에 실패했습니다.");
  return res.url;
}
