export interface PartGroupImage {
  /** 상장업체 · null 이면 전체 기본값 */
  companyId: string | null;
  groupName: string;
  imageUrl: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PartGroupImagesResponse {
  images: PartGroupImage[];
}

/**
 * 업체 → 부위 대분류 → 사진 조회 · 업체 것이 없으면 전체 기본값, 그것도 없으면 null.
 * `companyId` 를 비우면 기본값만 본다.
 */
export type PartGroupImageLookup = (
  companyId: string | null | undefined,
  groupName: string,
) => string | null;
