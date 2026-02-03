import 'server-only';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import {
  DealerRow,
  DealerEmployeeRow,
  Dealer,
  DealerEmployee,
  toDealerFromRow,
  toEmployeeFromRow,
} from './types';

/**
 * 전화번호로 로그인 검증 (중도매인 또는 직원)
 * 서버 사이드 전용
 */
export async function verifyLoginCredentials(
  phone: string,
  password: string
): Promise<{ type: 'dealer' | 'employee'; dealer: Dealer; employee?: DealerEmployee } | null> {
  const supabase = await createPureClient();

  // 1. 중도매인에서 찾기
  const { data: dealerRow } = await supabase
    .from('dealers')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'active')
    .single();

  if (dealerRow) {
    const isValid = await bcrypt.compare(password, dealerRow.password_hash);
    if (isValid) {
      // last_login_at 업데이트
      await supabase
        .from('dealers')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', dealerRow.id);

      return {
        type: 'dealer',
        dealer: toDealerFromRow(dealerRow as DealerRow),
      };
    }
  }

  // 2. 직원에서 찾기
  const { data: employeeRow } = await supabase
    .from('dealer_employees')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'active')
    .single();

  if (employeeRow) {
    const isValid = await bcrypt.compare(password, employeeRow.password_hash);
    if (isValid) {
      // 소속 중도매인 조회
      const { data: ownerDealerRow } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', employeeRow.dealer_id)
        .single();

      if (ownerDealerRow) {
        // last_login_at 업데이트
        await supabase
          .from('dealer_employees')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', employeeRow.id);

        return {
          type: 'employee',
          dealer: toDealerFromRow(ownerDealerRow as DealerRow),
          employee: toEmployeeFromRow(employeeRow as DealerEmployeeRow),
        };
      }
    }
  }

  return null;
}

/**
 * 경매 비밀번호 검증
 * 서버 사이드 전용
 */
export async function verifyAuctionPassword(
  dealerId: string,
  auctionPassword: string
): Promise<boolean> {
  const supabase = await createPureClient();

  const { data: dealerRow } = await supabase
    .from('dealers')
    .select('auction_password_hash')
    .eq('id', dealerId)
    .single();

  if (!dealerRow) return false;
  return bcrypt.compare(auctionPassword, dealerRow.auction_password_hash);
}
