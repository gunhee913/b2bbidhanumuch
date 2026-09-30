export interface PartGroupImage {
  groupName: string;
  imageUrl: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PartGroupImagesResponse {
  images: PartGroupImage[];
}

/** groupName → imageUrl 조회 맵 */
export type PartGroupImageMap = Record<string, string>;
