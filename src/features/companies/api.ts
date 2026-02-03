import {
  CompanyWithEmployees,
  Company,
  CompanyEmployee,
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateCompanyEmployeeInput,
  UpdateCompanyEmployeeInput,
} from './types';

const API_BASE = '/api/admin/companies';

// ============ 상장업체 API ============

// 상장업체 목록 조회 (직원 포함)
export async function getCompanies(): Promise<CompanyWithEmployees[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장업체 목록 조회 실패');
  }
  return response.json();
}

// 상장업체 생성
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장업체 등록 실패');
  }
  return response.json();
}

// 상장업체 수정
export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장업체 수정 실패');
  }
  return response.json();
}

// 상장업체 삭제
export async function deleteCompany(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '상장업체 삭제 실패');
  }
}

// 상장업체 상태 변경
export async function updateCompanyStatus(id: string, status: 'active' | 'inactive'): Promise<Company> {
  return updateCompany(id, { status });
}

// ============ 직원 API ============

// 직원 생성
export async function createCompanyEmployee(input: CreateCompanyEmployeeInput): Promise<CompanyEmployee> {
  const response = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '직원 등록 실패');
  }
  return response.json();
}

// 직원 수정
export async function updateCompanyEmployee(id: string, input: UpdateCompanyEmployeeInput): Promise<CompanyEmployee> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '직원 수정 실패');
  }
  return response.json();
}

// 직원 삭제
export async function deleteCompanyEmployee(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '직원 삭제 실패');
  }
}

// 직원 상태 변경
export async function updateCompanyEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<CompanyEmployee> {
  return updateCompanyEmployee(id, { status });
}
