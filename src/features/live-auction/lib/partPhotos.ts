import type { PartGroupImageLookup } from "@/features/part-group-images/types";
import type { LiveListing, LivePart } from "../api";
import { toPartGroupName } from "./partGrouping";

/**
 * 사진이 어느 묶음에서 왔는가.
 *  - `part`    이 부위에 올린 실제 사진
 *  - `company` 업체(또는 전체 기본) 부위 대표이미지 · 이 소의 사진이 아니다
 *  - `listing` 개체 사진 (등심 단면 · 첫 장이 메인페이지 대표)
 */
export type PhotoScope = "part" | "company" | "listing";

/** 화면에 걸 사진 한 장 · 어느 묶음에서 왔는지 라벨에 적는다 */
export interface ResolvedPhoto {
  src: string;
  label: string;
  scope: PhotoScope;
}

/** 레일 묶음 셋 · 비어 있는 묶음은 빈 배열 · `part` 와 `company` 는 둘 중 하나만 찬다 */
export type PartPhotoGroups = Record<PhotoScope, ResolvedPhoto[]>;

/** 레일에 늘어놓는 묶음 차례 · 위치가 흔들리면 눈이 매번 다시 찾는다 */
export const PHOTO_SCOPE_ORDER: readonly PhotoScope[] = [
  "part",
  "company",
  "listing",
];

export const PHOTO_SCOPE_TITLE: Record<PhotoScope, string> = {
  part: "부위 사진",
  company: "대표이미지",
  listing: "등심 단면",
};

type PhotoListing = Pick<LiveListing, "images" | "companyId">;
type PhotoPart = Pick<LivePart, "images" | "partName">;

/** 개체 사진(등심 단면)이 곧 이 부위의 실물인 대분류 · 따로 「등심 단면」 묶음을 세우지 않는다 */
const LISTING_PHOTO_PART_GROUP = "등심";

/**
 * 부위를 보고 있을 때 레일에 세울 사진 · 묶음별로.
 *
 * 맨 위는 「이 부위가 어떻게 생겼나」 — 실제 부위 사진이 있으면 그것, 없으면 업체 대표이미지.
 * 둘을 같이 세우지 않는다 · 실물이 있는데 그림까지 걸면 어느 쪽이 진짜인지 다시 읽어야 한다.
 * 그 밑에 등심 단면(개체 사진)이 따라붙어 「이 소가 어떤 소냐」 를 보여 준다.
 *
 * 등심은 예외 · 개체 사진이 바로 등심 단면이라 그 자체가 부위 실물이다. 부위 사진이 따로
 * 없으면 개체 사진을 「부위 사진」 자리에 세우고, 대표이미지도 「등심 단면」 묶음도 걸지 않는다
 * (같은 그림이 두 번 서거나 실물 위에 그림이 올라간다).
 * `lookup` 을 비우면 대표이미지 묶음은 빈다.
 */
export function collectPartPhotos(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
  lookup?: PartGroupImageLookup,
): PartPhotoGroups {
  const isListingPhotoPart =
    !!part && toPartGroupName(part.partName) === LISTING_PHOTO_PART_GROUP;

  if (isListingPhotoPart) {
    const own = part.images.length > 0;
    const images = own ? part.images : listing.images;
    const name = own ? part.partName : "등심 단면";
    return {
      part: images.map((src, i) => ({
        src,
        label: images.length > 1 ? `${name} ${i + 1}` : name,
        scope: "part",
      })),
      company: [],
      listing: [],
    };
  }

  const partImages = part?.images ?? [];
  const partPhotos: ResolvedPhoto[] = partImages.map((src, i) => ({
    src,
    label:
      partImages.length > 1 ? `${part!.partName} ${i + 1}` : part!.partName,
    scope: "part",
  }));

  const rep =
    partPhotos.length === 0 ? companyPartImage(listing, part, lookup) : null;
  const companyPhotos: ResolvedPhoto[] = rep
    ? [
        {
          src: rep,
          label: `${toPartGroupName(part!.partName)} 대표`,
          scope: "company",
        },
      ]
    : [];

  const listingPhotos: ResolvedPhoto[] = listing.images.map((src, i, all) => ({
    src,
    label: all.length > 1 ? `등심 단면 ${i + 1}` : "등심 단면",
    scope: "listing",
  }));

  return { part: partPhotos, company: companyPhotos, listing: listingPhotos };
}

/** 묶음을 레일 차례대로 한 줄로 · 레일과 큰 판이 같은 번호를 쓴다 · 첫 장이 처음 뜨는 장 */
export function flattenPartPhotos(groups: PartPhotoGroups): ResolvedPhoto[] {
  return PHOTO_SCOPE_ORDER.flatMap((scope) => groups[scope]);
}

/**
 * 부위 줄에 거는 작은 썸네일 · 큰 판에 처음 뜨는 장(레일 첫 칸)과 같은 것.
 * 표에서 본 그림과 들어가서 처음 보는 그림이 다르면 눌렀을 때 「다른 데로 왔나」 가 된다.
 */
export function partCover(
  listing: PhotoListing,
  part: PhotoPart | null | undefined,
  lookup?: PartGroupImageLookup,
): string | null {
  return (
    flattenPartPhotos(collectPartPhotos(listing, part, lookup))[0]?.src ?? null
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
