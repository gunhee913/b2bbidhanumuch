'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import { useAdminProductDetail, useRealtimeGroupBuy, useRefundOrder, useTransitionProduct } from '@/features/group-buy/hooks';
import type { AdminOrder, GroupBuyStatus } from '@/features/group-buy/types';
import { ADMIN_FORCE_TRANSITIONS, INTERNAL_STATUS_LABELS } from '@/features/group-buy/constants/status';
import { formatDateTime } from '@/features/group-buy/lib/format';
import { isDineIn } from '@/features/group-buy/lib/receive';
import { buildSlotZones, formatKg, formatWon } from '@/features/group-buy/lib/slots';
import { AdminButton, AdminStat, AdminStatusBadge } from '@/features/group-buy/components/admin/AdminPrimitives';
import { ProductSettingsSheet } from '@/features/group-buy/components/admin/ProductSettingsSheet';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-admin/320/240';

const TRANSITION_LABELS: Partial<Record<GroupBuyStatus, string>> = {
  full: '모집완료로',
  bidding: '응찰중으로',
  won: '낙찰 처리',
  lost: '유찰 처리(환불)',
  cancelled: '미달 취소(환불)',
  recruiting: '모집 재개',
  processing: '소분 가공 시작',
  shipped: '배송 시작',
  completed: '완료 처리',
};

export default function AdminGroupBuyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useAdminProductDetail(id);
  useRealtimeGroupBuy();
  const transition = useTransitionProduct();
  const refund = useRefundOrder();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading || !product) {
    return (
      <MallAdminLayout>
        <p className="py-10 text-center text-xs text-gray-400">{isLoading ? '불러오는 중…' : '상품을 찾을 수 없습니다.'}</p>
      </MallAdminLayout>
    );
  }

  const nextStates = ADMIN_FORCE_TRANSITIONS[product.status] ?? [];
  const paidOrders = product.orders.filter((o) => o.status === 'paid');
  const revenue = paidOrders.reduce((s, o) => s + o.amount, 0);

  const handleTransition = async (to: GroupBuyStatus) => {
    const risky = to === 'lost' || to === 'cancelled';
    if (risky && !window.confirm(`${INTERNAL_STATUS_LABELS[to]} 처리하면 결제된 ${paidOrders.length}건이 모두 환불됩니다. 진행할까요?`)) return;
    try {
      await transition.mutateAsync({ id: product.id, to, note: '관리자 수동 전이' });
      toast.success(`${INTERNAL_STATUS_LABELS[to]} 상태로 변경했습니다.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  const handleRefund = async (order: AdminOrder) => {
    const reason = window.prompt(`${order.consumerName} 님의 ${formatWon(order.amount)}을 환불합니다. 사유를 입력하세요.`, '관리자 환불');
    if (reason === null) return;
    try {
      await refund.mutateAsync({ orderId: order.id, reason: reason || undefined });
      toast.success('환불 처리했습니다.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '환불 실패');
    }
  };

  const slotOwner = new Map<number, AdminOrder>();
  for (const o of paidOrders) for (const n of o.slotNos) slotOwner.set(n, o);

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <Link href="/admin/mall/group-buy" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
          <ChevronLeft className="h-3.5 w-3.5" />
          공동구매 상품
        </Link>

        <div className="flex items-start justify-between gap-4 border border-gray-200 bg-white p-4">
          <div className="flex gap-4">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded bg-gray-100">
              <SmartImage src={product.image ?? FALLBACK_IMAGE} alt="" fill fallbackSrc={FALLBACK_IMAGE} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <AdminStatusBadge status={product.status} />
                <span className="text-[11px] text-gray-500">
                  {product.listingNo} · {product.listingDate} · {product.grade ?? '-'} · {product.slaughterHouse ?? '-'} · {product.companyName ?? '-'}
                </span>
              </div>
              <h1 className="mt-1.5 text-lg font-bold text-gray-900">{product.partName}</h1>
              <p className="mt-0.5 text-xs text-gray-600">
                {formatKg(product.partWeight)} ·{' '}
                {product.slotCount ? `${product.slotCount}구좌 × ${product.slotWeight ? formatKg(product.slotWeight) : '-'}` : '분할 미설정'} ·{' '}
                {product.slotPrice ? `구좌가 ${formatWon(product.slotPrice)}` : '단가 미설정'} · {product.positional ? '위치 선택' : '수량 선택'}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                마감 {formatDateTime(product.recruitDeadline)} · 공개 {formatDateTime(product.publishedAt)}
                {product.bidPriceCap ? ` · 응찰 상한 ${product.bidPriceCap.toLocaleString()}원/kg` : ''}
                {product.resultPrice ? ` · 낙찰가 ${product.resultPrice.toLocaleString()}원/kg` : ''}
              </p>
              {product.cancelledReason ? <p className="mt-1 text-[11px] text-rose-600">사유: {product.cancelledReason}</p> : null}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AdminButton size="md" onClick={() => setSheetOpen(true)}>
              판매 조건
            </AdminButton>
            {nextStates.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-1">
                {nextStates.map((to) => (
                  <AdminButton
                    key={to}
                    variant={to === 'lost' || to === 'cancelled' ? 'danger' : 'default'}
                    onClick={() => handleTransition(to)}
                    loading={transition.isPending}
                  >
                    {TRANSITION_LABELS[to] ?? INTERNAL_STATUS_LABELS[to]}
                  </AdminButton>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <AdminStat label="판매 구좌" value={`${product.soldCount} / ${product.slotCount ?? '-'}`} />
          <AdminStat label="결제 건수" value={paidOrders.length} sub={`전체 ${product.orders.length}건`} />
          <AdminStat label="결제 금액" value={formatWon(revenue)} />
          <AdminStat
            label="경매 최저가 대비"
            value={product.pricePerKg && product.minPrice ? `${Math.round(((product.pricePerKg - product.minPrice) / product.minPrice) * 100)}%` : '-'}
            sub={product.minPrice ? `최저가 ${product.minPrice.toLocaleString()}원/kg` : undefined}
          />
        </div>

        {product.slotCount ? (
          <section className="border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">구좌 현황</h2>
            <div className="mt-3 space-y-1.5">
              {buildSlotZones(product.slotCount, product.partName).map((zone) => (
                <div key={zone.key} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-600">{product.positional ? zone.label : ''}</span>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {zone.slotNos.map((n) => {
                      const owner = slotOwner.get(n);
                      return (
                        <span
                          key={n}
                          title={owner ? `${owner.consumerName} · ${owner.orderNo}` : '비어 있음'}
                          className={cn(
                            'flex h-7 min-w-[36px] items-center justify-center rounded border px-1.5 text-[11px] font-semibold tabular-nums',
                            owner ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500',
                          )}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">주문</h2>
            <span className="text-[11px] text-gray-500">{product.orders.length}건</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[11px] text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">주문번호</th>
                <th className="px-3 py-2 text-left font-medium">소비자</th>
                <th className="px-3 py-2 text-left font-medium">구좌</th>
                <th className="px-3 py-2 text-right font-medium">금액</th>
                <th className="px-3 py-2 text-left font-medium">배송지</th>
                <th className="px-3 py-2 text-left font-medium">결제</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {product.orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    아직 주문이 없습니다.
                  </td>
                </tr>
              ) : (
                product.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 tabular-nums text-gray-700">{o.orderNo}</td>
                    <td className="px-3 py-2 text-gray-900">
                      <p className="font-semibold">{o.consumerName}</p>
                      <p className="text-[11px] text-gray-400">{o.consumerPhone}</p>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">
                      {o.slotNos.join('·')}번 <span className="text-[11px] text-gray-400">({o.quantity}구좌)</span>
                      {o.trimAndSlice ? (
                        <span className="ml-1.5 inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700">근막 제거·썰기</span>
                      ) : null}
                      {isDineIn(o.receiveMethod) ? (
                        <span className="ml-1.5 inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">매장 수령</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900">{formatWon(o.amount)}</td>
                    <td className="max-w-[260px] px-3 py-2 text-gray-700">
                      <p className="truncate">
                        ({o.shipping.zipcode}) {o.shipping.address} {o.shipping.addressDetail}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {o.shipping.name} · {o.shipping.phone}
                        {o.shipping.memo ? ` · ${o.shipping.memo}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">{formatDateTime(o.paidAt)}</td>
                    <td className="px-3 py-2">
                      <OrderStatusBadge status={o.status} />
                      {o.refundReason ? <p className="mt-0.5 text-[10.5px] text-gray-400">{o.refundReason}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {o.status === 'paid' ? (
                        <AdminButton variant="danger" onClick={() => handleRefund(o)} loading={refund.isPending}>
                          환불
                        </AdminButton>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="border border-gray-200 bg-white">
          <div className="px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">이력</h2>
          </div>
          <ul className="divide-y divide-gray-100 text-xs">
            {product.events.length === 0 ? (
              <li className="px-4 py-6 text-center text-gray-400">이력이 없습니다.</li>
            ) : (
              product.events.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-2">
                  <span className="w-[120px] shrink-0 tabular-nums text-gray-400">{formatDateTime(e.createdAt)}</span>
                  <span className="w-[140px] shrink-0 font-mono text-[11px] text-gray-500">{e.type}</span>
                  <span className="flex-1 text-gray-800">{e.message ?? '-'}</span>
                  <span className="shrink-0 text-[11px] text-gray-400">{e.createdBy ?? 'system'}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <ProductSettingsSheet product={product} open={sheetOpen} onOpenChange={setSheetOpen} soldSlotNos={product.soldSlotNos} />
    </MallAdminLayout>
  );
}

function OrderStatusBadge({ status }: { status: AdminOrder['status'] }) {
  const map: Record<AdminOrder['status'], string> = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-gray-100 text-gray-600 ring-gray-200',
    refunded: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  const label: Record<AdminOrder['status'], string> = { paid: '결제완료', cancelled: '소비자 취소', refunded: '환불' };
  return <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', map[status])}>{label[status]}</span>;
}
