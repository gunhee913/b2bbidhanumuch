import type { ImageEdit } from './types';

const API_BASE = '/api/image-edits';

/** 이 결과 URL 의 보정 기록 · 없으면 null (원본 그대로 올린 사진) */
export async function fetchImageEdit(editedUrl: string): Promise<ImageEdit | null> {
  const response = await fetch(`${API_BASE}?url=${encodeURIComponent(editedUrl)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '보정 기록을 불러오지 못했습니다.');
  }
  const body = (await response.json()) as { edit: ImageEdit | null };
  return body.edit;
}

export async function saveImageEdit(edit: ImageEdit): Promise<ImageEdit> {
  const response = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edit),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '보정 기록을 저장하지 못했습니다.');
  }
  return response.json();
}
