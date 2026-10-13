import { uploadImage } from "@/lib/upload";

/** 개체 사진 · 부위 사진 모두 한 묶음에 최대 4장 */
export const MAX_LISTING_PHOTOS = 4;
export const MAX_PART_PHOTOS = 4;

/**
 * 대표(메인) 사진은 배열의 첫 장이다.
 *
 * 따로 칸을 두지 않는 까닭 · 상세 방·요약·선택기 등 이미 모든 화면이 `images[0]` 을
 * 대표로 쓰고 있어, 관리자가 고른 장을 맨 앞으로 옮기기만 하면 화면 쪽은 손댈 것이 없다.
 */
export function moveToCover(images: string[], index: number): string[] {
  if (index <= 0 || index >= images.length) return images;
  return [images[index], ...images.filter((_, i) => i !== index)];
}

/** 파일 → data URL · 업로드 API 가 base64 를 받는다 */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface UploadPhotosResult {
  urls: string[];
  /** 이미지가 아니거나 올리다 실패한 파일 수 · 부르는 쪽이 한 번에 알린다 */
  skipped: number;
}

/**
 * 고른 파일을 스토리지에 올리고 URL 을 돌려준다 · `limit` 장을 넘는 파일은 버린다.
 * 한 장이 실패해도 나머지는 계속 올린다 — 현장에서 열 장을 고르다 한 장 때문에 다 되돌리면 손이 두 번 간다.
 */
export async function uploadPhotoFiles(
  files: FileList | File[],
  limit: number,
  folder = "listings",
): Promise<UploadPhotosResult> {
  const picked = Array.from(files).slice(0, Math.max(0, limit));
  const urls: string[] = [];
  let skipped = 0;
  for (const file of picked) {
    if (!file.type.startsWith("image/")) {
      skipped += 1;
      continue;
    }
    try {
      const url = await uploadImage(await readAsDataUrl(file), folder);
      if (url) urls.push(url);
      else skipped += 1;
    } catch (error) {
      console.error("사진 업로드 오류:", error);
      skipped += 1;
    }
  }
  return { urls, skipped };
}
