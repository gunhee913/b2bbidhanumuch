'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Boxes, FileSignature, Layers3, PackageCheck } from 'lucide-react';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { cn } from '@/lib/utils';
import { useAdminPools, useAdminProducts, useRealtimeGroupBuy, useRealtimePools } from '@/features/group-buy/hooks';
import type { AdminPool, AdminProduct, GroupBuyStatus } from '@/features/group-buy/types';
import { formatDateTime } from '@/features/group-buy/lib/format';
import { formatKg, formatWon } from '@/features/group-buy/lib/slots';
import { AdminStat, AdminStatusBadge } from '@/features/group-buy/components/admin/AdminPrimitives';

const FULFILLMENT_STATUSES: GroupBuyStatus[] = ['won', 'processing'];
const ACTIVE_STATUSES: GroupBuyStatus[] = ['recruiting', 'full', 'bidding'];

export default function MallAdminDashboardPage() {
  const { data: products, isLoading: productsLoading } = useAdminProducts({ status: 'all' });
  const { data: pools, isLoading: poolsLoading } = useAdminPools();
  useRealtimeGroupBuy();
  useRealtimePools();

  const productList = useMemo(() => products ?? [], [products]);
  const poolList = useMemo(() => pools ?? [], [pools]);

  const stats = useMemo(() => {
    const count = (statuses: GroupBuyStatus[]) => productList.filter((p) => statuses.includes(p.status)).length;
    const revenue = productList.reduce((sum, p) => sum + (p.slotPrice ?? 0) * p.soldCount, 0);
    return {
      drafts: count(['draft']),
      active: count(ACTIVE_STATUSES),
      fulfillment: count(FULFILLMENT_STATUSES),
      openKg: poolList.reduce((sum, p) => sum + p.openKg, 0),
      openCount: poolList.reduce((sum, p) => sum + p.openCount, 0),
      allocated: poolList.reduce((sum, p) => sum + p.allocatedCount, 0),
      revenue,
    };
  }, [productList, poolList]);

  const drafts = useMemo(() => productList.filter((p) => p.status === 'draft').slice(0, 5), [productList]);
  const fulfillment = useMemo(() => productList.filter((p) => FULFILLMENT_STATUSES.includes(p.status)).slice(0, 5), [productList]);
  const waitingPools = useMemo(() => poolList.filter((p) => p.waitingDraftCount > 0), [poolList]);
  const hotPools = useMemo(() => [...poolList].filter((p) => p.openKg > 0).sort((a, b) => b.openKg - a.openKg).slice(0, 5), [poolList]);
  const recentProducts = useMemo(
    () => [...productList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    [productList],
  );

  const isLoading = productsLoading || poolsLoading;

  return (
    <MallAdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">직거래몰 대시보드</h1>
          <p className="mt-1 text-xs text-gray-500">공동구매와 견적 운영 현황을 한눈에 봅니다. 숫자는 실시간으로 갱신됩니다.</p>
        </div>

        <div className="grid grid-cols-6 gap-2">
          <AdminStat label="모이는 중" value={formatKg(stats.openKg)} sub={`예약 ${stats.openCount}건 · kg 수요 풀`} />
          <AdminStat label="확정 예약" value={stats.allocated} sub="부위가 정해진 kg 예약" />
          <AdminStat label="설정 필요" value={stats.drafts} sub="공개 전 초안" />
          <AdminStat label="모집·확보 중" value={stats.active} sub="모집중 · 모집완료 · 응찰중" />
          <AdminStat label="소분·출고 대기" value={stats.fulfillment} sub="낙찰 · 소분 가공" />
          <AdminStat label="결제 누계" value={formatWon(stats.revenue)} sub="전체 상품 기준" />
        </div>

        <div className="grid grid-cols-[1.2fr_1fr] gap-4">
          <Panel title="지금 할 일" icon={Boxes}>
            {isLoading ? (
              <Empty>불러오는 중…</Empty>
            ) : drafts.length === 0 && waitingPools.length === 0 && fulfillment.length === 0 ? (
              <Empty>처리할 항목이 없습니다.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100">
                {waitingPools.map((pool) => (
                  <TodoRow
                    key={`pool-${pool.id}`}
                    href="/admin/mall/group-buy/pools"
                    tone="amber"
                    title={`${pool.partGroup} ${pool.gradeLabel} 풀 · 매칭 가능한 초안 ${pool.waitingDraftCount}건`}
                    sub={`모인 ${formatKg(pool.openKg)} / ${formatKg(pool.targetKg)} · kg당 ${formatWon(pool.pricePerKg)}`}
                    action="매칭 실행"
                  />
                ))}
                {drafts.map((p) => (
                  <TodoRow
                    key={`draft-${p.id}`}
                    href={`/admin/mall/group-buy/${p.id}`}
                    tone="amber"
                    title={`${p.partName} · 분할 수와 단가를 정해 공개하세요`}
                    sub={`${p.listingNo} · ${p.grade ?? '-'} · ${formatKg(p.partWeight)}`}
                    action="설정·공개"
                  />
                ))}
                {fulfillment.map((p) => (
                  <TodoRow
                    key={`ful-${p.id}`}
                    href={`/admin/mall/group-buy/${p.id}`}
                    tone="gray"
                    title={`${p.partName} · ${p.status === 'won' ? '소분 가공 시작' : '배송 처리'}`}
                    sub={`주문 ${p.orderCount}건 · 낙찰가 ${p.resultPrice ? formatWon(p.resultPrice) : '-'}`}
                    action="상세"
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="활발한 kg 수요 풀" icon={Layers3} href="/admin/mall/group-buy/pools" hrefLabel="전체 풀">
            {isLoading ? (
              <Empty>불러오는 중…</Empty>
            ) : hotPools.length === 0 ? (
              <Empty>아직 모이는 예약이 없습니다.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100">
                {hotPools.map((pool) => (
                  <HotPoolRow key={pool.id} pool={pool} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-[1.2fr_1fr] gap-4">
          <Panel title="최근 변경된 상품" icon={Boxes} href="/admin/mall/group-buy" hrefLabel="전체 상품">
            {isLoading ? (
              <Empty>불러오는 중…</Empty>
            ) : recentProducts.length === 0 ? (
              <Empty>상품이 없습니다. 상장을 승인하면 초안이 자동 생성됩니다.</Empty>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100">
                  {recentProducts.map((p) => (
                    <RecentProductRow key={p.id} product={p} />
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <div className="space-y-4">
            <ComingSoonPanel
              icon={FileSignature}
              title="견적받기"
              description="대량 구매 견적 요청을 접수하고 가격을 회신하는 화면입니다. 소비자 견적 폼과 함께 준비 중입니다."
            />
            <ComingSoonPanel
              icon={PackageCheck}
              title="소분·출고 · 환불 내역"
              description="낙찰된 상품의 소분·출고 처리와 환불 이력을 모아 보는 화면입니다. 지금은 상품 상세에서 처리할 수 있습니다."
            />
          </div>
        </div>
      </div>
    </MallAdminLayout>
  );
}

function Panel({
  title,
  icon: Icon,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
          <Icon className="h-4 w-4 text-gray-400" />
          {title}
        </h2>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-1 text-[11.5px] text-gray-500 hover:text-gray-900">
            {hrefLabel ?? '더 보기'}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-xs text-gray-400">{children}</p>;
}

function TodoRow({ href, tone, title, sub, action }: { href: string; tone: 'amber' | 'gray'; title: string; sub: string; action: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', tone === 'amber' ? 'bg-amber-500' : 'bg-gray-400')} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-gray-900">{title}</p>
          <p className="truncate text-[11px] text-gray-400">{sub}</p>
        </div>
        <span className="shrink-0 text-[11.5px] font-medium text-gray-600">{action} →</span>
      </Link>
    </li>
  );
}

function HotPoolRow({ pool }: { pool: AdminPool }) {
  const pct = pool.targetKg ? Math.min(100, Math.round((pool.openKg / pool.targetKg) * 100)) : 0;
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center justify-between text-xs">
        <p className="font-medium text-gray-900">
          {pool.partGroup} <span className="text-gray-500">{pool.gradeLabel}</span>
        </p>
        <p className="tabular-nums text-gray-700">
          {formatKg(pool.openKg)} <span className="text-gray-400">/ {formatKg(pool.targetKg)}</span>
        </p>
      </div>
      <div className="mt-1.5 h-1 w-full bg-gray-100">
        <div className={cn('h-full', pct >= 100 ? 'bg-emerald-500' : 'bg-gray-900')} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        {pool.openCount}명 · kg당 {formatWon(pool.pricePerKg)}
        {pool.waitingDraftCount > 0 ? ` · 매칭 가능 초안 ${pool.waitingDraftCount}건` : ''}
      </p>
    </li>
  );
}

function RecentProductRow({ product: p }: { product: AdminProduct }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2">
        <Link href={`/admin/mall/group-buy/${p.id}`} className="font-medium text-gray-900 hover:underline">
          {p.partName}
        </Link>
        <p className="text-[11px] text-gray-400">
          {p.listingNo} · {p.grade ?? '-'} · {p.saleMode === 'kg' ? 'kg 수요 풀' : p.positional ? '위치 선택' : '수량 선택'}
        </p>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-gray-700">
        {p.slotCount ? `${p.soldCount}/${p.slotCount}` : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-2 py-2">
        <AdminStatusBadge status={p.status} />
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-[11px] text-gray-400">{formatDateTime(p.updatedAt)}</td>
    </tr>
  );
}

function ComingSoonPanel({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <section className="border border-dashed border-gray-300 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100">
          <Icon className="h-4 w-4 text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
            {title}
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">준비 중</span>
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-gray-500">{description}</p>
        </div>
      </div>
    </section>
  );
}
