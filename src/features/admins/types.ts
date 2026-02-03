// 관리자 DB Row 타입 (Supabase 테이블과 1:1 매핑)
export interface AdminRow {
  id: string;
  department: string;
  position: string | null;
  name: string;
  phone: string;
  password_hash: string;
  role: 'master' | 'admin';
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
}

// 클라이언트용 관리자 타입 (비밀번호 해시 제외)
export interface Admin {
  id: string;
  department: string;
  position: string | null;
  name: string;
  phone: string;
  role: 'master' | 'admin';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
}

// 관리자 생성 Input
export interface CreateAdminInput {
  department: string;
  position?: string;
  name: string;
  phone: string;
  password: string;
  role: 'master' | 'admin';
  status?: 'active' | 'inactive';
}

// 관리자 수정 Input
export interface UpdateAdminInput {
  department?: string;
  position?: string;
  name?: string;
  phone?: string;
  password?: string;
  role?: 'master' | 'admin';
  status?: 'active' | 'inactive';
}

// DB Row -> Client 타입 변환
export function toAdminFromRow(row: AdminRow): Admin {
  return {
    id: row.id,
    department: row.department,
    position: row.position,
    name: row.name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
