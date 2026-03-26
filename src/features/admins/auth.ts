import 'server-only';

import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { AdminRow, toAdminFromRow, Admin } from './types';

// 관리자 로그인 인증
export async function verifyAdminCredentials(
  phone: string,
  password: string,
  loginIp?: string
): Promise<{ admin: Admin } | null> {
  const supabase = await createPureClient();

  // 관리자 조회
  const { data: adminRow, error } = await supabase
    .from('admins')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'active')
    .single();

  if (error || !adminRow) {
    return null;
  }

  const admin = adminRow as AdminRow;

  // 비밀번호 검증
  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    return null;
  }

  // 최근 로그인 시간 및 IP 업데이트
  await supabase
    .from('admins')
    .update({
      last_login_at: new Date().toISOString(),
      ...(loginIp && { last_login_ip: loginIp }),
    })
    .eq('id', admin.id);

  return {
    admin: toAdminFromRow(admin),
  };
}

export async function getAdminById(id: string): Promise<Admin | null> {
  const supabase = await createPureClient();

  const { data: adminRow, error } = await supabase
    .from('admins')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !adminRow) return null;

  return toAdminFromRow(adminRow as AdminRow);
}
