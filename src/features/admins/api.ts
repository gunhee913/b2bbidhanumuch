import { Admin, CreateAdminInput, UpdateAdminInput } from './types';

const API_BASE = '/api/admin/admins';

// 관리자 목록 조회
export async function getAdmins(): Promise<Admin[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '관리자 목록 조회 실패');
  }
  return response.json();
}

// 관리자 생성
export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '관리자 등록 실패');
  }
  return response.json();
}

// 관리자 수정
export async function updateAdmin(id: string, input: UpdateAdminInput): Promise<Admin> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '관리자 수정 실패');
  }
  return response.json();
}

// 관리자 삭제
export async function deleteAdmin(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '관리자 삭제 실패');
  }
}

// 관리자 상태 변경
export async function updateAdminStatus(id: string, status: 'active' | 'inactive'): Promise<Admin> {
  return updateAdmin(id, { status });
}
