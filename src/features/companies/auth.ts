import 'server-only';

import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import {
  CompanyRow,
  CompanyEmployeeRow,
  toCompanyFromRow,
  toCompanyEmployeeFromRow,
  Company,
  CompanyEmployee,
} from './types';

// 상장업체 직원 로그인 인증
export async function verifyCompanyCredentials(
  phone: string,
  password: string
): Promise<{ company: Company; employee: CompanyEmployee } | null> {
  const supabase = await createPureClient();

  // 직원 조회
  const { data: employeeRow, error } = await supabase
    .from('company_employees')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'active')
    .single();

  if (error || !employeeRow) {
    return null;
  }

  const employee = employeeRow as CompanyEmployeeRow;

  // 비밀번호 검증
  const isValid = await bcrypt.compare(password, employee.password_hash);
  if (!isValid) {
    return null;
  }

  // 소속 상장업체 조회
  const { data: companyRow, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', employee.company_id)
    .eq('status', 'active')
    .single();

  if (companyError || !companyRow) {
    return null;
  }

  const company = companyRow as CompanyRow;

  // 최근 로그인 시간 업데이트
  await supabase
    .from('company_employees')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', employee.id);

  await supabase
    .from('companies')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', company.id);

  return {
    company: toCompanyFromRow(company),
    employee: toCompanyEmployeeFromRow(employee),
  };
}
