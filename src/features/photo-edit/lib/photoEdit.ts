import { z } from 'zod';
import type { CropArea, PhotoEditParams, Rotation, ToneParams } from '../types';

/**
 * 보정 범위 상한 · 「교정」 수준에서 막는다.
 *
 * 사진은 입찰 근거다. 밝기·대비·색온도를 이 이상 밀면 육색·마블링이 실물과 달라 보여
 * 낙찰 뒤 분쟁이 된다. 슬라이더 끝이 곧 상한이라 UI 에 따로 설명이 필요 없다.
 */
export const TONE_LIMITS = { brightness: 40, contrast: 30, temperature: 30 } as const;

export const DEFAULT_TONE: ToneParams = { brightness: 0, contrast: 0, temperature: 0 };

/** 자르기 비율 · 썸네일·라이브 큰 판이 전부 4:3 */
export const EDIT_ASPECT = 4 / 3;
/** 결과 파일 긴 변 상한(px) · 라이브 큰 판에 충분하고 원본 그대로 올리는 것보다 훨씬 가볍다 */
export const OUTPUT_MAX_EDGE = 1600;
export const OUTPUT_QUALITY = 0.9;
/** 미리보기용 축소 긴 변 · 슬라이더를 움직일 때마다 다시 그리므로 가볍게 */
export const PREVIEW_MAX_EDGE = 1400;

/** 색온도 1 단위당 R(+)/B(−) 채널 이동량 · ±30 이면 ±36/255 */
const TEMPERATURE_STEP = 1.2;

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

export const rotateBy = (rotation: Rotation, delta: 90 | -90): Rotation => {
  const index = ROTATIONS.indexOf(rotation);
  return ROTATIONS[(index + (delta > 0 ? 1 : 3)) % 4];
};

/** `|| 0` 은 −0 을 0 으로 · 화면에 「-0」 이 찍히지 않게 */
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value)) || 0;

export const clampTone = (tone: ToneParams): ToneParams => ({
  brightness: clamp(Math.round(tone.brightness), TONE_LIMITS.brightness),
  contrast: clamp(Math.round(tone.contrast), TONE_LIMITS.contrast),
  temperature: clamp(Math.round(tone.temperature), TONE_LIMITS.temperature),
});

export const isDefaultTone = (tone: ToneParams) =>
  tone.brightness === 0 && tone.contrast === 0 && tone.temperature === 0;

const cropAreaSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

/** 서버가 받는 값 검증 · 상한을 넘는 값은 거절한다 (클라이언트 우회 방지) */
export const photoEditParamsSchema = z.object({
  area: cropAreaSchema,
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  flip: z.boolean(),
  brightness: z.number().int().min(-TONE_LIMITS.brightness).max(TONE_LIMITS.brightness),
  contrast: z.number().int().min(-TONE_LIMITS.contrast).max(TONE_LIMITS.contrast),
  temperature: z.number().int().min(-TONE_LIMITS.temperature).max(TONE_LIMITS.temperature),
});

export const scaleArea = (area: CropArea, factor: number): CropArea => ({
  x: Math.round(area.x * factor),
  y: Math.round(area.y * factor),
  width: Math.round(area.width * factor),
  height: Math.round(area.height * factor),
});

/**
 * 미리보기 CSS 필터 · 밝기·대비는 CSS `brightness()`/`contrast()` 와 아래 LUT 가 같은 식이라
 * 화면에서 본 것과 저장되는 것이 같다. 색온도는 CSS 에 없어서 미리보기 그림에 직접 굽는다.
 */
export const cssToneFilter = (tone: ToneParams) =>
  `brightness(${1 + tone.brightness / 100}) contrast(${1 + tone.contrast / 100})`;

/**
 * 채널별 256 칸 변환표 · 색온도 → 밝기 → 대비 순.
 * CSS `filter: brightness() contrast()` 가 쓰는 식 그대로 (brightness 는 곱, contrast 는 128 기준 벌리기).
 */
function toneLut(tone: ToneParams): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const brightness = 1 + tone.brightness / 100;
  const contrast = 1 + tone.contrast / 100;
  const shifts = [tone.temperature * TEMPERATURE_STEP, 0, -tone.temperature * TEMPERATURE_STEP];
  return shifts.map((shift) => {
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v += 1) {
      const warmed = v + shift;
      const brightened = warmed * brightness;
      lut[v] = (brightened - 128) * contrast + 128;
    }
    return lut;
  }) as [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray];
}

/** 픽셀 배열에 보정을 제자리에서 적용한다 · 기본값이면 손대지 않는다 */
export function applyTone(pixels: Uint8ClampedArray, tone: ToneParams) {
  if (isDefaultTone(tone)) return;
  const [lr, lg, lb] = toneLut(tone);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = lr[pixels[i]];
    pixels[i + 1] = lg[pixels[i + 1]];
    pixels[i + 2] = lb[pixels[i + 2]];
  }
}

/** 저장소 사진은 CORS `*` 라 캔버스에 그릴 수 있다 · `crossOrigin` 을 안 주면 캔버스가 오염돼 읽지 못한다 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('사진을 불러오지 못했습니다.'));
    img.src = src;
  });
}

export interface OrientedCanvas {
  canvas: HTMLCanvasElement;
  /** 원본 픽셀 → 이 캔버스 픽셀 배율 (1 이면 원본 크기) */
  scale: number;
}

/**
 * 반전 → 회전을 적용한 캔버스 · 필요하면 긴 변을 `maxEdge` 로 줄인다.
 * 반전을 회전보다 먼저 거는 까닭 · 미리보기는 「반전만 구운 그림」 을 크로퍼에 주고 크로퍼가
 * 회전을 입히므로, 저장 쪽도 같은 순서여야 잘라낸 좌표가 같은 곳을 가리킨다.
 */
export function drawOriented(img: HTMLImageElement, flip: boolean, rotation: Rotation, maxEdge?: number): OrientedCanvas {
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = maxEdge ? Math.min(1, maxEdge / Math.max(w, h)) : 1;
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const swapped = rotation === 90 || rotation === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swapped ? sh : sw;
  canvas.height = swapped ? sw : sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  return { canvas, scale };
}

export const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/jpeg', quality = OUTPUT_QUALITY) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다.'))), type, quality);
  });

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(blob);
  });

/**
 * 원본 + 보정값 → 결과 JPEG · 반전·회전 → 자르기 → 색 보정 순.
 * 긴 변이 `OUTPUT_MAX_EDGE` 를 넘으면 그 크기로 줄여 그린다.
 */
export async function renderEditedPhoto(originalSrc: string, params: PhotoEditParams): Promise<Blob> {
  const img = await loadImage(originalSrc);
  const oriented = drawOriented(img, params.flip, params.rotation);

  const { area } = params;
  const downscale = Math.min(1, OUTPUT_MAX_EDGE / Math.max(area.width, area.height));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(area.width * downscale));
  out.height = Math.max(1, Math.round(area.height * downscale));
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(oriented.canvas, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);

  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  applyTone(imageData.data, params);
  ctx.putImageData(imageData, 0, 0);
  return canvasToBlob(out);
}

/** 추천값이 밝은 부분(트레이·지방)을 올려 보내는 목표 휘도 · 날아가기 직전 */
const AUTO_WHITE_TARGET = 245;
/** 뿌옇게 뜬 사진 판정 · 어두운 2% 가 이 값 위에 떠 있고 */
const AUTO_HAZE_DARK_MIN = 60;
/** 밝은 2% 와 어두운 2% 의 폭이 이보다 좁을 때만 (고기 사진은 원래 검정이 없어 어두운 쪽만 보면 오판) */
const AUTO_HAZE_RANGE_MAX = 160;
/** 대비로 어두운 2% 를 내려 보낼 목표 */
const AUTO_HAZE_FLOOR = 40;
const AUTO_CONTRAST_MAX = 15;
/** 가장 밝은 3% 가 이보다 어두우면 흰 점이라 볼 수 없어 색온도는 건드리지 않는다 */
const AUTO_WHITE_MIN = 150;

/**
 * 추천 보정값 · 보정 전 픽셀을 보고 밝기·대비·색온도를 추정한다. 「추천」 버튼이 쓴다.
 *
 * 부분육 사진은 흰 트레이·지방·조명이 화면 대부분이라 「평균을 중간 회색으로」 식의 자동노출은
 * 멀쩡한 사진을 어둡게 만든다. 그래서 기준을 흰 점에 둔다.
 *
 *  - 밝기 · 가장 밝은 2% 지점이 245 에 오도록 올린다 · 어둡게 만드는 쪽은 하지 않는다 (0 이 하한)
 *  - 대비 · 어두운 2% 가 60 위에 떠 있고 밝은 2% 와의 폭도 160 미만일 때(뿌옇게 뜬 사진)만 ·
 *    최대 15 · 밝기와 합쳐 흰 점이 245 를 넘지 않게 밝기를 되맞춘다
 *  - 색온도 · 가장 밝은 3% 픽셀(흰 트레이·지방)의 R−B 차를 0 으로 · 흰 점이 충분히 밝을 때만
 * 전부 상한 안으로 자른다. 제안일 뿐이라 사용자가 전/후를 보고 결정한다.
 */
export function suggestTone(pixels: Uint8ClampedArray): ToneParams {
  const histogram = new Uint32Array(256);
  const stride = 4 * 2;
  let count = 0;
  for (let i = 0; i < pixels.length; i += stride) {
    const lum = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    histogram[lum] += 1;
    count += 1;
  }
  if (count === 0) return DEFAULT_TONE;

  const percentile = (p: number) => {
    let acc = 0;
    const target = count * p;
    for (let v = 0; v < 256; v += 1) {
      acc += histogram[v];
      if (acc >= target) return v;
    }
    return 255;
  };

  const dark = percentile(0.02);
  const white = Math.max(1, percentile(0.98));

  // 어두운 2% 를 40 까지 내리는 데 필요한 대비 · (v−128)·k+128 = 40 을 k 에 대해 푼 것
  const hazy = dark > AUTO_HAZE_DARK_MIN && dark < 128 && white - dark < AUTO_HAZE_RANGE_MAX;
  const contrast = hazy
    ? Math.min(AUTO_CONTRAST_MAX, ((128 - AUTO_HAZE_FLOOR) / (128 - dark) - 1) * 100)
    : 0;

  // 대비가 흰 점도 같이 끌어올리므로, 대비를 거친 뒤 245 가 되는 밝기 값을 역산한다
  const whiteBeforeContrast = (AUTO_WHITE_TARGET - 128) / (1 + contrast / 100) + 128;
  const brightness = Math.max(0, (whiteBeforeContrast / white - 1) * 100);

  const whiteFloor = percentile(0.97);
  let r = 0;
  let b = 0;
  let whites = 0;
  if (whiteFloor >= AUTO_WHITE_MIN) {
    for (let i = 0; i < pixels.length; i += stride) {
      const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (lum < whiteFloor || lum > 252) continue;
      r += pixels[i];
      b += pixels[i + 2];
      whites += 1;
    }
  }
  const cast = whites > 0 ? (r - b) / whites : 0;
  const temperature = -cast / (2 * TEMPERATURE_STEP);

  return clampTone({ brightness, contrast, temperature });
}
