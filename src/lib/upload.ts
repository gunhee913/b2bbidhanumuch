// 이미지 업로드 유틸리티

interface UploadResult {
  urls: string[];
  url: string | null;
}

/**
 * 이미지를 Supabase Storage에 업로드하고 URL 반환
 * @param images - Base64 이미지 문자열 또는 배열
 * @param folder - 저장 폴더 (기본값: 'listings')
 */
export async function uploadImages(
  images: string | string[],
  folder: string = 'listings'
): Promise<UploadResult> {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, folder }),
  });

  if (!response.ok) {
    throw new Error('이미지 업로드에 실패했습니다.');
  }

  return response.json();
}

/**
 * 단일 이미지 업로드
 */
export async function uploadImage(
  image: string,
  folder: string = 'listings'
): Promise<string | null> {
  const result = await uploadImages(image, folder);
  return result.url;
}

/**
 * 이미지가 Base64인지 URL인지 확인
 */
export function isBase64Image(src: string): boolean {
  return src.startsWith('data:image');
}

/**
 * 이미지가 URL인지 확인
 */
export function isUrlImage(src: string): boolean {
  return src.startsWith('http');
}
