import type { LiveListing, LivePart } from "../api";

/** 화면에 걸 사진 한 장 · 어느 묶음에서 왔는지 라벨에 적는다 */
export interface ResolvedPhoto {
  src: string;
  label: string;
  scope: "part" | "listing";
}

type PhotoListing = Pick<LiveListing, "images">;
type PhotoPart = Pick<LivePart, "images" | "partName">;

/**
 * 부위를 보고 있을 때 걸 사진 순서 · 그 부위 사진 → 개체 사진(첫 장이 대표).
 *
 * 부위 사진이 없으면 개체 사진만 남아 지금까지와 똑같이 보인다. 부위 사진으로 개체 사진을
 * 그대로 붙였을 수도 있어(등록 폼 「개체 사진에서 고르기」) 같은 주소는 한 번만 센다.
 * 부위 대분류 기본 사진(`part_group_images`)은 여기 끼우지 않는다 — 다른 소의 사진을
 * 이 소의 것처럼 보이게 하면 안 된다.
 */
export function resolvePartPhotos(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
): ResolvedPhoto[] {
  const partImages = part?.images ?? [];
  const partPhotos: ResolvedPhoto[] = partImages.map((src, i) => ({
    src,
    label:
      partImages.length > 1 ? `${part!.partName} ${i + 1}` : part!.partName,
    scope: "part",
  }));
  const seen = new Set(partImages);
  const listingPhotos = listing.images
    .filter((src) => !seen.has(src))
    .map((src, i, all): ResolvedPhoto => ({
      src,
      label: labelListingPhoto(i, all.length, partPhotos.length > 0),
      scope: "listing",
    }));
  return [...partPhotos, ...listingPhotos];
}

/** 부위 줄에 거는 작은 썸네일 · 부위 사진 첫 장, 없으면 개체 대표 */
export function partCover(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
): string | null {
  return part?.images[0] ?? listing.images[0] ?? null;
}

function labelListingPhoto(
  index: number,
  total: number,
  hasPartPhotos: boolean,
): string {
  const base = hasPartPhotos ? "개체 사진" : "사진";
  return total > 1 ? `${base} ${index + 1}` : base;
}
