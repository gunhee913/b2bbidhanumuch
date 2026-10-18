// ============================================
// 공동구매 소비자 타입
// ============================================

export interface ConsumerRow {
  id: string;
  phone: string;
  password_hash: string;
  name: string;
  email: string | null;
  zipcode: string | null;
  address: string | null;
  address_detail: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/** 클라이언트/세션용 · 비밀번호 해시 제외 */
export interface Consumer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  zipcode: string | null;
  address: string | null;
  addressDetail: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateConsumerInput {
  phone: string;
  password: string;
  name: string;
  email?: string;
  zipcode?: string;
  address?: string;
  addressDetail?: string;
}

export function toConsumerFromRow(row: ConsumerRow): Consumer {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    email: row.email,
    zipcode: row.zipcode,
    address: row.address,
    addressDetail: row.address_detail,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
