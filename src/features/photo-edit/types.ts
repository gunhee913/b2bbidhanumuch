export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Rotation = 0 | 90 | 180 | 270;

/** 슬라이더 셋 · 사진의 위치와 무관한 색 보정 · 「최근 설정」 으로 다음 사진에 가져갈 수 있는 부분 */
export interface ToneParams {
  /** −40 ~ +40 (%) · 곱하기 */
  brightness: number;
  /** −30 ~ +30 (%) · 중간값 기준 벌리기 */
  contrast: number;
  /** −30 ~ +30 · 음수 차갑게(파랑) · 양수 따뜻하게(빨강) */
  temperature: number;
}

/** 편집기가 저장하는 값 전부 · DB `image_edits.params` */
export interface PhotoEditParams extends ToneParams {
  /** 자른 영역 · 반전·회전을 적용한 뒤의 원본 픽셀 좌표 */
  area: CropArea;
  rotation: Rotation;
  flip: boolean;
}

/** 보정 결과 한 장의 기록 · 결과 URL 로 찾는다 */
export interface ImageEdit {
  editedUrl: string;
  originalUrl: string;
  params: PhotoEditParams;
}
