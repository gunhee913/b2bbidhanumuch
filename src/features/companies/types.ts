// 상장업체 DB Row 타입
export interface CompanyRow {
  id: string;
  company_no: string;
  name: string;
  business_no: string;
  ceo: string;
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
}

// 상장업체 직원 DB Row 타입
export interface CompanyEmployeeRow {
  id: string;
  company_id: string;
  role: string | null;
  name: string;
  phone: string;
  password_hash: string;
  address: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
}

// 클라이언트용 상장업체 타입
export interface Company {
  id: string;
  companyNo: string;
  name: string;
  businessNo: string;
  ceo: string;
  phone: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
}

// 클라이언트용 직원 타입 (비밀번호 해시 제외)
export interface CompanyEmployee {
  id: string;
  companyId: string;
  role: string | null;
  name: string;
  phone: string;
  address: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
}

// 상장업체 + 직원 목록
export interface CompanyWithEmployees extends Company {
  employees: CompanyEmployee[];
}

// 상장업체 생성 Input
export interface CreateCompanyInput {
  companyNo: string;
  name: string;
  businessNo: string;
  ceo: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

// 상장업체 수정 Input
export interface UpdateCompanyInput {
  companyNo?: string;
  name?: string;
  businessNo?: string;
  ceo?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

// 직원 생성 Input
export interface CreateCompanyEmployeeInput {
  companyId: string;
  role?: string;
  name: string;
  phone: string;
  password: string;
  address?: string;
  status?: 'active' | 'inactive';
}

// 직원 수정 Input
export interface UpdateCompanyEmployeeInput {
  role?: string;
  name?: string;
  phone?: string;
  password?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

// DB Row -> Client 타입 변환
export function toCompanyFromRow(row: CompanyRow): Company {
  return {
    id: row.id,
    companyNo: row.company_no,
    name: row.name,
    businessNo: row.business_no,
    ceo: row.ceo,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export function toCompanyEmployeeFromRow(row: CompanyEmployeeRow): CompanyEmployee {
  return {
    id: row.id,
    companyId: row.company_id,
    role: row.role,
    name: row.name,
    phone: row.phone,
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
