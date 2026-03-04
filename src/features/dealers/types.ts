// ============================================
// 중도매인 관련 타입 정의
// ============================================

// DB 테이블 타입 (Supabase에서 가져온 원본)
export interface DealerRow {
  id: string;
  dealer_no: string;
  name: string;
  representative_name: string | null;
  business_no: string | null;
  phone: string;
  password_hash: string;
  auction_password_hash: string;
  address: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
}

export interface DealerEmployeeRow {
  id: string;
  dealer_id: string;
  name: string;
  phone: string;
  password_hash: string;
  address: string | null;
  role: string | null;
  position: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
}

// 클라이언트용 타입 (비밀번호 해시 제외)
export interface Dealer {
  id: string;
  dealerNo: string;
  name: string;
  representativeName: string | null;
  businessNo: string | null;
  phone: string;
  address: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
  employees?: DealerEmployee[];
}

export interface DealerEmployee {
  id: string;
  dealerId: string;
  name: string;
  phone: string;
  address: string | null;
  role: string | null;
  position: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
}

// 생성용 타입
export interface CreateDealerInput {
  dealerNo: string;
  name: string;
  representativeName?: string;
  businessNo?: string;
  phone: string;
  password: string;
  auctionPassword: string;
  address?: string;
  status?: 'active' | 'inactive';
}

export interface CreateDealerEmployeeInput {
  dealerId: string;
  name: string;
  phone: string;
  password: string;
  address?: string;
  role?: string;
  position?: string;
  status?: 'active' | 'inactive';
}

// 수정용 타입
export interface UpdateDealerInput {
  name?: string;
  representativeName?: string;
  businessNo?: string;
  phone?: string;
  password?: string;
  auctionPassword?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateDealerEmployeeInput {
  name?: string;
  phone?: string;
  password?: string;
  address?: string;
  role?: string;
  position?: string;
  status?: 'active' | 'inactive';
}

// 중도매인 + 직원 포함 타입
export interface DealerWithEmployees extends Dealer {
  employees: DealerEmployee[];
}

// Row → 클라이언트 타입 변환 함수
export function toDealerFromRow(row: DealerRow): Dealer {
  return {
    id: row.id,
    dealerNo: row.dealer_no,
    name: row.name,
    representativeName: row.representative_name,
    businessNo: row.business_no,
    phone: row.phone,
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export function toEmployeeFromRow(row: DealerEmployeeRow): DealerEmployee {
  return {
    id: row.id,
    dealerId: row.dealer_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    role: row.role,
    position: row.position,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
