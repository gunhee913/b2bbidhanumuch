import type { PartGroupImage, PartGroupImagesResponse } from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `요청 실패: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchPartGroupImages(): Promise<PartGroupImagesResponse> {
  return requestJson<PartGroupImagesResponse>("/api/part-group-images");
}

export async function upsertPartGroupImage(payload: {
  groupName: string;
  imageUrl: string;
}): Promise<PartGroupImage> {
  return requestJson<PartGroupImage>("/api/admin/part-group-images", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deletePartGroupImage(groupName: string): Promise<void> {
  await requestJson<{ ok: true }>(
    `/api/admin/part-group-images?group=${encodeURIComponent(groupName)}`,
    { method: "DELETE" },
  );
}

/** base64 data URL → storage 업로드 → public URL · 기존 `/api/upload` 재사용 */
export async function uploadPartGroupImageFile(dataUrl: string): Promise<string> {
  const res = await requestJson<{ url: string | null }>("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: [dataUrl], folder: "part-groups" }),
  });
  if (!res.url) throw new Error("이미지 업로드에 실패했습니다.");
  return res.url;
}
