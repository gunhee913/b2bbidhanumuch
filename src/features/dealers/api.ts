import {
  Dealer,
  DealerEmployee,
  DealerWithEmployees,
  CreateDealerInput,
  CreateDealerEmployeeInput,
  UpdateDealerInput,
  UpdateDealerEmployeeInput,
} from './types';

// ============================================
// 관리자용 API (API Route 호출)
// ============================================

/**
 * 모든 중도매인 조회 (직원 포함)
 */
export async function getDealers(): Promise<DealerWithEmployees[]> {
  const response = await fetch('/api/admin/dealers');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '조회 실패');
  }
  return response.json();
}

/**
 * 중도매인 ID로 조회 (직원 포함)
 */
export async function getDealerById(id: string): Promise<DealerWithEmployees | null> {
  const dealers = await getDealers();
  return dealers.find((d) => d.id === id) || null;
}

/**
 * 중도매인 생성
 */
export async function createDealer(input: CreateDealerInput): Promise<Dealer> {
  const response = await fetch('/api/admin/dealers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '등록 실패');
  }
  return response.json();
}

/**
 * 중도매인 수정
 */
export async function updateDealer(id: string, input: UpdateDealerInput): Promise<Dealer> {
  const response = await fetch(`/api/admin/dealers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '수정 실패');
  }
  return response.json();
}

/**
 * 중도매인 삭제 (직원도 CASCADE 삭제)
 */
export async function deleteDealer(id: string): Promise<void> {
  const response = await fetch(`/api/admin/dealers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '삭제 실패');
  }
}

/**
 * 중도매인 상태 변경
 */
export async function updateDealerStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<Dealer> {
  return updateDealer(id, { status });
}

// ============================================
// 직원/경매대리인 CRUD
// ============================================

/**
 * 직원 생성
 */
export async function createDealerEmployee(input: CreateDealerEmployeeInput): Promise<DealerEmployee> {
  const response = await fetch('/api/admin/dealers/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '등록 실패');
  }
  return response.json();
}

/**
 * 직원 수정
 */
export async function updateDealerEmployee(
  id: string,
  input: UpdateDealerEmployeeInput
): Promise<DealerEmployee> {
  const response = await fetch(`/api/admin/dealers/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '수정 실패');
  }
  return response.json();
}

/**
 * 직원 삭제
 */
export async function deleteDealerEmployee(id: string): Promise<void> {
  const response = await fetch(`/api/admin/dealers/employees/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '삭제 실패');
  }
}

/**
 * 직원 상태 변경
 */
export async function updateDealerEmployeeStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<DealerEmployee> {
  return updateDealerEmployee(id, { status });
}

