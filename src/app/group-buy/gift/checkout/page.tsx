'use client';

import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { GiftCheckout } from '@/features/group-buy/components/gifts/GiftCheckout';

/** 저장된 선물세트 초안으로 바로 여는 주문서 */
export default function GiftCheckoutPage() {
  return (
    <GroupBuyShell>
      <GiftCheckout />
    </GroupBuyShell>
  );
}
