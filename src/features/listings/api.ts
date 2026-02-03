import {
  CattleListing,
  CreateListingInput,
  UpdateListingInput,
  UpdatePartInput,
  ListingFilter,
  CattlePart,
} from './types';

const API_BASE = '/api/listings';

// 상장 목록 조회
export async function fetchListings(
  filter?: ListingFilter & { includeParts?: boolean }
): Promise<CattleListing[]> {
  const params = new URLSearchParams();
  
  if (filter?.companyId) params.append('companyId', filter.companyId);
  if (filter?.status) params.append('status', filter.status);
  if (filter?.listingDateFrom) params.append('listingDateFrom', filter.listingDateFrom);
  if (filter?.listingDateTo) params.append('listingDateTo', filter.listingDateTo);
  if (filter?.search) params.append('search', filter.search);
  if (filter?.includeParts) params.append('includeParts', 'true');

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장 목록 조회 실패');
  }

  return response.json();
}

// 상장 상세 조회
export async function fetchListing(id: string): Promise<CattleListing> {
  const response = await fetch(`${API_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장 조회 실패');
  }

  return response.json();
}

// 상장 등록
export async function createListing(input: CreateListingInput): Promise<CattleListing> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장 등록 실패');
  }

  return response.json();
}

// 상장 수정
export async function updateListing(
  id: string,
  input: UpdateListingInput
): Promise<CattleListing> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장 수정 실패');
  }

  return response.json();
}

// 상장 삭제
export async function deleteListing(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장 삭제 실패');
  }
}

// 상장 승인
export async function approveListing(
  id: string,
  approvedBy?: string
): Promise<CattleListing> {
  const response = await fetch(`${API_BASE}/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장 승인 실패');
  }

  return response.json();
}

// 부위 수정
export async function updatePart(
  listingId: string,
  partId: string,
  input: UpdatePartInput
): Promise<CattlePart> {
  const response = await fetch(`${API_BASE}/${listingId}/parts/${partId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '부위 수정 실패');
  }

  return response.json();
}
