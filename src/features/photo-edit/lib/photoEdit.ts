import { z } from 'zod';
import type { AdjustParams, CropArea, PhotoEditParams, Rotation, SharpenParams, ToneParams } from '../types';

/**
 * 보정 범위 상한 · 「교정」 수준에서 막는다.
 *
 * 사진은 입찰 근거다. 밝기·대비·색온도를 이 이상 밀면 육색·마블링이 실물과 달라 보여
 * 낙찰 뒤 분쟁이 된다. 슬라이더 끝이 곧 상한이라 UI 에 따로 설명이 필요 없다.
 */
export const TONE_LIMITS = { brightness: 40, contrast: 30, temperature: 30 } as const;

export const DEFAULT_TONE: ToneParams = { brightness: 0, contrast: 0, temperature: 0 };

/**
 * 선명도 범위 · 세기 100 = 경계 차이를 1.5배.
 * 고기 사진은 과하면 마블링 경계에 흰 테두리가 서고 JPEG 노이즈가 같이 살아난다 · 음수(흐리게)는 없다.
 */
export const SHARPEN_LIMIT = 100;

export const DEFAULT_SHARPEN: SharpenParams = { sharpness: 0 };

export const DEFAULT_ADJUST: AdjustParams = { ...DEFAULT_TONE, ...DEFAULT_SHARPEN };

/** 세기 100 일 때 경계 차이에 곱하는 양 */
const SHARPEN_MAX_AMOUNT = 1.5;
/** 반경(px, 결과 파일 긴 변 1600px 기준) · 마블링 결 굵기에 맞춘 값 */
const SHARPEN_RADIUS = 1;
/** 이보다 작은 휘도 차이는 노이즈로 보고 세우지 않는다 */
const SHARPEN_THRESHOLD = 3;
/** 헤일로 억제 · 주변 3×3 의 최솟값·최댓값에서 이만큼까지만 넘어가게 둔다 (휘도 단계) */
const SHARPEN_OVERSHOOT = 6;

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

/** 옛 기록(선명도 이전)엔 선명도 칸이 없다 · 기본값으로 채운다 */
export const withAdjustDefaults = <T extends Partial<AdjustParams>>(params: T): T & AdjustParams => ({
  ...DEFAULT_ADJUST,
  ...params,
});

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
  // 옛 기록 호환으로 생략 가능
  sharpness: z.number().int().min(0).max(SHARPEN_LIMIT).default(DEFAULT_SHARPEN.sharpness),
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

// ---- 선명도 ----

const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;

/**
 * 가우시안을 박스 블러 3번으로 근사할 때 각 박스의 반지름 (Kutskir 공식).
 * 분리형 박스 블러는 반지름과 무관하게 O(n) 이라 1400px 미리보기도 수십 ms.
 */
function boxRadiiForGaussian(sigma: number, passes = 3): number[] {
  const ideal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower -= 1;
  const upper = lower + 2;
  const mIdeal = (12 * sigma * sigma - passes * lower * lower - 4 * passes * lower - 3 * passes) / (-4 * lower - 4);
  const m = Math.round(mIdeal);
  return Array.from({ length: passes }, (_, i) => ((i < m ? lower : upper) - 1) / 2);
}

/** 한 방향 박스 블러 · 슬라이딩 합 · 가장자리는 끝 값을 늘려 쓴다 */
function boxBlurAxis(src: Float32Array, dst: Float32Array, width: number, height: number, radius: number, horizontal: boolean) {
  const lineCount = horizontal ? height : width;
  const lineLength = horizontal ? width : height;
  const stride = horizontal ? 1 : width;
  const inv = 1 / (radius * 2 + 1);
  const last = lineLength - 1;
  for (let line = 0; line < lineCount; line += 1) {
    const base = horizontal ? line * width : line;
    const first = src[base];
    const tail = src[base + last * stride];
    // 창을 왼쪽 끝에 맞춘 합 · 밖으로 나간 칸은 끝 값으로 채운 것으로 친다
    let sum = first * (radius + 1);
    for (let i = 1; i <= radius; i += 1) sum += src[base + Math.min(last, i) * stride];
    for (let i = 0; i < lineLength; i += 1) {
      dst[base + i * stride] = sum * inv;
      const enter = i + radius + 1;
      const leave = i - radius;
      sum += (enter <= last ? src[base + enter * stride] : tail) - (leave >= 0 ? src[base + leave * stride] : first);
    }
  }
}

function gaussianBlur(src: Float32Array, width: number, height: number, sigma: number): Float32Array {
  let current = Float32Array.from(src);
  let next = new Float32Array(src.length);
  const scratch = new Float32Array(src.length);
  for (const radius of boxRadiiForGaussian(sigma)) {
    if (radius <= 0) continue;
    boxBlurAxis(current, scratch, width, height, radius, true);
    boxBlurAxis(scratch, next, width, height, radius, false);
    [current, next] = [next, current];
  }
  return current;
}

/**
 * 휘도 전용 · 헤일로 억제 · 임계값 있는 언샤프 마스크.
 *
 *  - 휘도만 만진다 · RGB 를 따로 세우면 경계에서 색이 갈라진다(색수차 비슷한 테두리)
 *  - 임계값 · 경계 차이가 작은 곳(평평한 살·배경의 노이즈)은 soft knee 로 빼 둔다
 *  - 헤일로 억제 · 세운 값이 주변 3×3 의 최소·최대를 `SHARPEN_OVERSHOOT` 이상 넘지 않게 · 지방 경계의
 *    흰 테두리가 서지 않는다
 *
 * `scale` · 반경은 결과 파일 px 기준이라 미리보기(다른 배율)에서는 그 배율을 곱해 넘긴다.
 */
export function applySharpen(pixels: Uint8ClampedArray, width: number, height: number, sharpen: SharpenParams, scale = 1) {
  if (sharpen.sharpness <= 0) return;
  const sigma = SHARPEN_RADIUS * scale;
  if (sigma < 0.25) return;

  const count = width * height;
  const luma = new Float32Array(count);
  for (let i = 0, p = 0; i < count; i += 1, p += 4) {
    luma[i] = LUMA_R * pixels[p] + LUMA_G * pixels[p + 1] + LUMA_B * pixels[p + 2];
  }

  const blurred = gaussianBlur(luma, width, height, sigma);
  const amount = (sharpen.sharpness / 100) * SHARPEN_MAX_AMOUNT;
  const threshold = SHARPEN_THRESHOLD;
  const kneeStart = threshold * 0.5;
  const kneeWidth = threshold;

  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - 1) * width;
    const y1 = y * width;
    const y2 = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x += 1) {
      const i = y1 + x;
      const detail = luma[i] - blurred[i];
      const magnitude = Math.abs(detail);
      if (magnitude < kneeStart) continue;
      const knee = Math.min(1, (magnitude - kneeStart) / kneeWidth);
      let delta = detail * amount * knee;
      if (delta === 0) continue;

      const x0 = Math.max(0, x - 1);
      const x2 = Math.min(width - 1, x + 1);
      let lo = luma[i];
      let hi = luma[i];
      for (const row of [y0, y1, y2]) {
        for (const col of [x0, x, x2]) {
          const v = luma[row + col];
          if (v < lo) lo = v;
          else if (v > hi) hi = v;
        }
      }
      const target = Math.max(lo - SHARPEN_OVERSHOOT, Math.min(hi + SHARPEN_OVERSHOOT, luma[i] + delta));
      delta = target - luma[i];
      if (delta === 0) continue;

      const p = i * 4;
      pixels[p] += delta;
      pixels[p + 1] += delta;
      pixels[p + 2] += delta;
    }
  }
}

/**
 * 보정 전체를 픽셀에 · 색온도 → 선명도 → 밝기·대비 순.
 * 미리보기가 「색온도·선명도는 그림에 굽고, 밝기·대비는 CSS」 라 저장도 같은 순서여야 본 것과 같다.
 */
export function applyAdjust(pixels: Uint8ClampedArray, width: number, height: number, adjust: AdjustParams, sharpenScale = 1) {
  applyTone(pixels, { ...DEFAULT_TONE, temperature: adjust.temperature });
  applySharpen(pixels, width, height, adjust, sharpenScale);
  applyTone(pixels, { ...adjust, temperature: 0 });
}

/**
 * 원본 + 보정값 → 결과 JPEG · 반전·회전 → 자르기 → 보정 순.
 * 긴 변이 `OUTPUT_MAX_EDGE` 를 넘으면 그 크기로 줄여 그린다 · 선명도는 줄인 뒤에 걸어야 미리보기와 같다.
 */
export async function renderEditedPhoto(originalSrc: string, params: PhotoEditParams): Promise<Blob> {
  const img = await loadImage(originalSrc);
  const oriented = drawOriented(img, params.flip, params.rotation);

  const { area } = params;
  const downscale = outputDownscale(area);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(area.width * downscale));
  out.height = Math.max(1, Math.round(area.height * downscale));
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(oriented.canvas, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);

  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  applyAdjust(imageData.data, out.width, out.height, params);
  ctx.putImageData(imageData, 0, 0);
  return canvasToBlob(out);
}

/** 잘라낸 영역(원본 px) 이 결과 파일로 갈 때의 배율 */
export const outputDownscale = (area: CropArea) => Math.min(1, OUTPUT_MAX_EDGE / Math.max(area.width, area.height));

/**
 * 미리보기에서 선명도 반경에 곱할 배율 · 「결과 파일 1px 이 미리보기에서 몇 px 인가」.
 * 미리보기는 사진 전체를 축소한 것이고 결과는 잘라낸 부분을 1600px 로 만드니, 많이 확대할수록 작아진다.
 */
export const previewSharpenScale = (areaOriginal: CropArea, previewScale: number) => previewScale / outputDownscale(areaOriginal);

