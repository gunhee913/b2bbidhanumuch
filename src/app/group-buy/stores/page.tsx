'use client';

import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { StoreVisitWizard } from '@/features/group-buy/components/stores/StoreVisitWizard';

/** 매장이용 · 매장 예약과 함께 벌크·1kg를 주문한다 */
export default function GroupBuyStoresPage() {
  return (
    <GroupBuyShell>
      <StoreVisitWizard />
    </GroupBuyShell>
  );
}
