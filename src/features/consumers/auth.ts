import 'server-only';

import bcrypt from 'bcryptjs';
import { createPureClient } from '@/lib/supabase/server';
import {
  Consumer,
  ConsumerRow,
  CreateConsumerInput,
  toConsumerFromRow,
} from './types';

const SALT_ROUNDS = 10;

/** 소비자 로그인 검증 · 휴대폰 번호 + 비밀번호 */
export async function verifyConsumerCredentials(
  phone: string,
  password: string
): Promise<Consumer | null> {
  const supabase = await createPureClient();

  const { data, error } = await supabase
    .from('consumers')
    .select('*')
    .eq('phone', normalizePhone(phone))
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ConsumerRow;
  const isValid = await bcrypt.compare(password, row.password_hash);
  if (!isValid) return null;

  await supabase
    .from('consumers')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', row.id);

  return toConsumerFromRow(row);
}

export interface CreateConsumerResult {
  consumer: Consumer | null;
  error: string | null;
  code?: 'DUPLICATE' | 'DB';
}

/** 소비자 가입 · 휴대폰 번호 중복이면 DUPLICATE */
export async function createConsumer(
  input: CreateConsumerInput
): Promise<CreateConsumerResult> {
  const supabase = await createPureClient();
  const phone = normalizePhone(input.phone);

  const { data: existing } = await supabase
    .from('consumers')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    return { consumer: null, error: '이미 가입된 휴대폰 번호입니다.', code: 'DUPLICATE' };
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const { data, error } = await supabase
    .from('consumers')
    .insert({
      phone,
      password_hash: passwordHash,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      zipcode: input.zipcode?.trim() || null,
      address: input.address?.trim() || null,
      address_detail: input.addressDetail?.trim() || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { consumer: null, error: error?.message || '가입 처리 중 오류가 발생했습니다.', code: 'DB' };
  }

  return { consumer: toConsumerFromRow(data as ConsumerRow), error: null };
}

export async function getConsumerById(id: string): Promise<Consumer | null> {
  const supabase = await createPureClient();
  const { data } = await supabase
    .from('consumers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toConsumerFromRow(data as ConsumerRow) : null;
}

/** 숫자만 남기고 010-0000-0000 형태로 통일 · 로그인 ID 비교의 기준 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}
