import { uploadImage } from "@/lib/upload";
import { toPartGroupName } from "@/features/live-auction/lib/partGrouping";
import type { PartGroupImageLookup } from "@/features/part-group-images/types";

/** 등록 폼의 부위 칸에 걸릴 사진이 어디서 온 것인가 */
export type FormPhotoSource = "part" | "company" | "listing" | "none";

export const FORM_PHOTO_SOURCE_LABEL: Record<FormPhotoSource, string> = {
  part: "부위 사진",
  company: "업체 부위 대표이미지",
  listing: "개체 대표 사진",
  none: "사진 없음",
};

/**
 * 등록 폼에서 「이 부위는 화면에 어떤 사진으로 나가나」 · 라이브 화면의 `partCover` 와 같은 순서.
 *
 * 부위 사진 → 업체 부위 대표이미지(없으면 전체 기본) → 개체 대표 사진. 폼이 저장 전이라
 * `LiveListing` 이 아직 없어 같은 함수를 못 쓰고, 값만 받아 같은 규칙을 다시 적는다.
 * 순서가 둘로 갈리면 등록할 때 본 사진과 경매장에 나간 사진이 달라진다.
 */
export function resolveFormPartCover(input: {
  partImages: string[];
  listingImages: string[];
  companyId: string | null;
  partName: string;
  lookup: PartGroupImageLookup;
}): { src: string | null; source: FormPhotoSource } {
  const own = input.partImages[0];
  if (own) return { src: own, source: "part" };
  const rep = input.lookup(input.companyId, toPartGroupName(input.partName));
  if (rep) return { src: rep, source: "company" };
  const cover = input.listingImages[0];
  if (cover) return { src: cover, source: "listing" };
  return { src: null, source: "none" };
}

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
