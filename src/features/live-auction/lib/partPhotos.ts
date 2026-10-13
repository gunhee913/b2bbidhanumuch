import type { PartGroupImageLookup } from "@/features/part-group-images/types";
import type { LiveListing, LivePart } from "../api";
import { toPartGroupName } from "./partGrouping";

/** 화면에 걸 사진 한 장 · 어느 묶음에서 왔는지 라벨에 적는다 */
export interface ResolvedPhoto {
  src: string;
  label: string;
  /**
   * - `part`    이 부위에 올린 사진
   * - `company` 업체(또는 전체 기본) 부위 대표이미지 · 이 소의 사진이 아니다
   * - `listing` 개체 사진 (등심 단면 · 첫 장이 대표)
   */
  scope: "part" | "company" | "listing";
}

type PhotoListing = Pick<LiveListing, "images" | "companyId">;
type PhotoPart = Pick<LivePart, "images" | "partName">;

/**
 * 부위를 보고 있을 때 걸 사진 순서 · 그 부위 사진 → 업체 부위 대표이미지 → 개체 사진.
 *
 * 부위 사진이 없으면 업체가 등록한 그 부위 대표이미지(없으면 전체 기본)가 앞에 선다 —
 * 등심 단면(개체 사진)을 우둔 줄에 걸어 두면 다른 부위 사진처럼 읽히기 때문이다. 대표이미지는
 * 이 소의 사진이 아니라서 `scope: "company"` 로 표시해 각인을 찍지 않고 이름표를 붙인다.
 *
 * 부위 사진으로 개체 사진을 그대로 붙였을 수도 있어(등록 폼 「개체 사진에서 고르기」) 같은
 * 주소는 한 번만 센다. `lookup` 을 비우면 대표이미지 단계는 건너뛴다.
 */
export function resolvePartPhotos(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
  lookup?: PartGroupImageLookup,
): ResolvedPhoto[] {
  const partImages = part?.images ?? [];
  const partPhotos: ResolvedPhoto[] = partImages.map((src, i) => ({
    src,
    label:
      partImages.length > 1 ? `${part!.partName} ${i + 1}` : part!.partName,
    scope: "part",
  }));

  const rep =
    partPhotos.length === 0 ? companyPartImage(listing, part, lookup) : null;
  const repPhotos: ResolvedPhoto[] = rep
    ? [
        {
          src: rep,
          label: `${toPartGroupName(part!.partName)} 대표`,
          scope: "company",
        },
      ]
    : [];

  const seen = new Set([...partImages, ...(rep ? [rep] : [])]);
  const listingPhotos = listing.images
    .filter((src) => !seen.has(src))
    .map((src, i, all): ResolvedPhoto => ({
      src,
      label: labelListingPhoto(i, all.length, partPhotos.length > 0 || !!rep),
      scope: "listing",
    }));
  return [...partPhotos, ...repPhotos, ...listingPhotos];
}

/**
 * 부위 줄에 거는 작은 썸네일 · 부위 사진 첫 장 → 업체 부위 대표이미지 → 개체 대표.
 * 마지막 개체 대표는 예전부터 걸려 있던 것이라 남겨 둔다 — 아무것도 없는 빈 칸보다는 낫다.
 */
export function partCover(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
  lookup?: PartGroupImageLookup,
): string | null {
  return (
    part?.images[0] ??
    companyPartImage(listing, part, lookup) ??
    listing.images[0] ??
    null
  );
}

/** 업체 부위 대표이미지(없으면 전체 기본) · 부위가 없거나 조회 함수가 없으면 null */
function companyPartImage(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
  lookup: PartGroupImageLookup | undefined,
): string | null {
  if (!part || !lookup) return null;
  return lookup(listing.companyId, toPartGroupName(part.partName));
}

function labelListingPhoto(
  index: number,
  total: number,
  hasPartPhotos: boolean,
): string {
  const base = hasPartPhotos ? "개체 사진" : "사진";
  return total > 1 ? `${base} ${index + 1}` : base;
}
