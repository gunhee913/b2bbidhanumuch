'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { RefreshCw, TimerOff } from 'lucide-react';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { cn, todayKst } from '@/lib/utils';
import { SmartImage } from '@/components/ui/smart-image';
import { useAdminProducts, useExpireProducts, useRealtimeGroupBuy, useSyncDrafts } from '@/features/group-buy/hooks';
import type { AdminProduct, GroupBuyStatus } from '@/features/group-buy/types';
import { INTERNAL_STATUS_LABELS, INTERNAL_STATUS_ORDER } from '@/features/group-buy/constants/status';
import { formatDateTime } from '@/features/group-buy/lib/format';
import { formatKg, formatWon } from '@/features/group-buy/lib/slots';
import { AdminButton, AdminStat, AdminStatusBadge } from '@/features/group-buy/components/admin/AdminPrimitives';
import { ProductSettingsSheet } from '@/features/group-buy/components/admin/ProductSettingsSheet';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-admin/160/120';
type StatusFilter = GroupBuyStatus | 'all';

export default function AdminGroupBuyPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [date, setDate] = useState(() => todayKst());
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const { data: products, isLoading } = useAdminProducts({ status, date: date || undefined });
  useRealtimeGroupBuy();
  const sync = useSyncDrafts();
  const expire = useExpireProducts();

  const list = useMemo(() => products ?? [], [products]);
  const stats = useMemo(() => {
    const by = (s: GroupBuyStatus) => list.filter((p) => p.status === s).length;
    const revenue = list.reduce((sum, p) => sum + (p.slotPrice ?? 0) * p.soldCount, 0);
    return { draft: by('draft'), recruiting: by('recruiting'), full: by('full') + by('bidding'), won: by('won') + by('processing') + by('shipped'), revenue };
  }, [list]);

  const handleSync = async () => {
    try {
      const r = await sync.mutateAsync();
      toast.success(`승인된 상장 ${r.listings}건 확인 · 상품 ${r.created}건 생성 · ${r.published}건 자동 공개`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '동기화 실패');
    }
  };
  const handleExpire = async () => {
    try {
      const r = await expire.mutateAsync();
      toast.success(`마감 처리 ${r.expired}건`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '만료 처리 실패');
    }
  };

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">공동구매 상품</h1>
            <p className="mt-1 text-xs text-gray-500">
              상장이 승인되면 부위마다 초안이 자동 생성됩니다. 분할 수와 단가를 정해 공개하면 소비자에게 노출됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminButton size="md" onClick={handleSync} loading={sync.isPending}>
              <RefreshCw className="h-3.5 w-3.5" />
              오늘 이후 승인 상장 동기화
            </AdminButton>
            <AdminButton size="md" onClick={handleExpire} loading={expire.isPending}>
              <TimerOff className="h-3.5 w-3.5" />
              마감 지난 모집 처리
            </AdminButton>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <AdminStat label="설정 필요" value={stats.draft} sub="공개 전 초안" />
          <AdminStat label="모집중" value={stats.recruiting} />
          <AdminStat label="모집완료·응찰" value={stats.full} />
          <AdminStat label="낙찰·가공·배송" value={stats.won} />
          <AdminStat label="결제 누계" value={formatWon(stats.revenue)} sub="현재 필터 기준" />
        </div>

        <div className="flex flex-wrap items-center gap-2 border border-gray-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <FilterChip active={status === 'all'} onClick={() => setStatus('all')}>
              전체
            </FilterChip>
            {INTERNAL_STATUS_ORDER.map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
                {INTERNAL_STATUS_LABELS[s]}
              </FilterChip>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
            <span>상장일</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 border border-gray-200 px-2 text-xs outline-none" />
            {date ? (
              <button type="button" onClick={() => setDate('')} className="text-[11px] text-gray-500 underline">
                전체 보기
              </button>
            ) : (
              <button type="button" onClick={() => setDate(todayKst())} className="text-[11px] text-gray-500 underline">
                오늘
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[11px] text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">상품</th>
                <th className="px-3 py-2 text-left font-medium">상장 · 개체</th>
                <th className="px-3 py-2 text-right font-medium">중량</th>
                <th className="px-3 py-2 text-right font-medium">분할</th>
                <th className="px-3 py-2 text-right font-medium">구좌가</th>
                <th className="px-3 py-2 text-right font-medium">단가/최저가</th>
                <th className="px-3 py-2 text-left font-medium">모집</th>
                <th className="px-3 py-2 text-left font-medium">마감</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-400">
                    상품이 없습니다. 상장을 승인하거나 「승인 상장 동기화」를 눌러 초안을 만드세요.
                  </td>
                </tr>
              ) : (
                list.map((p) => <ProductRow key={p.id} product={p} onEdit={() => setSelected(p)} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductSettingsSheet product={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </MallAdminLayout>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-6 rounded px-2 text-[11.5px] font-medium transition-colors',
        active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100',
      )}
    >
      {children}
    </button>
  );
}

function ProductRow({ product: p, onEdit }: { product: AdminProduct; onEdit: () => void }) {
  const needsSetup = p.status === 'draft';
  const pct = p.slotCount ? Math.round((p.soldCount / p.slotCount) * 100) : 0;
  return (
    <tr className={cn('hover:bg-gray-50', needsSetup && 'bg-amber-50/40')}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
            <SmartImage src={p.image ?? FALLBACK_IMAGE} alt="" fill fallbackSrc={FALLBACK_IMAGE} />
          </div>
          <div>
            <Link href={`/admin/mall/group-buy/${p.id}`} className="font-semibold text-gray-900 hover:underline">
              {p.partName}
            </Link>
            <p className="text-[11px] text-gray-400">{p.saleMode === 'kg' ? 'kg 수요 풀' : p.positional ? '위치 선택' : '수량 선택'}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-gray-700">
        <p className="tabular-nums">{p.listingNo}</p>
        <p className="text-[11px] text-gray-400">
          {p.grade ?? '-'} · {p.slaughterHouse ?? '-'} · {p.companyName ?? '-'}
        </p>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-gray-700">{formatKg(p.partWeight)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
        {p.slotCount ? (
          <>
            {p.slotCount}
            <span className="text-[11px] text-gray-400"> × {p.slotWeight ? formatKg(p.slotWeight) : '-'}</span>
          </>
        ) : (
          <span className="text-amber-600">미설정</span>
        )}
      </td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900">{p.slotPrice ? formatWon(p.slotPrice) : '-'}</td>
      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
        <p>{p.pricePerKg ? `${p.pricePerKg.toLocaleString()}` : '-'}</p>
        <p className="text-[11px] text-gray-400">{p.minPrice ? p.minPrice.toLocaleString() : '-'}</p>
      </td>
      <td className="px-3 py-2">
        {p.slotCount ? (
          <div className="w-24">
            <div className="flex items-center justify-between text-[11px] tabular-nums text-gray-600">
              <span>
                {p.soldCount}/{p.slotCount}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-0.5 h-1 w-full bg-gray-100">
              <div className={cn('h-full', pct >= 100 ? 'bg-emerald-500' : 'bg-gray-900')} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-3 py-2 tabular-nums text-gray-700">{formatDateTime(p.recruitDeadline)}</td>
      <td className="px-3 py-2">
        <AdminStatusBadge status={p.status} />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1">
          <AdminButton variant={needsSetup ? 'primary' : 'default'} onClick={onEdit}>
            {needsSetup ? '설정·공개' : '조건'}
          </AdminButton>
          <Link href={`/admin/mall/group-buy/${p.id}`} className="inline-flex h-7 items-center rounded border border-gray-200 bg-white px-2.5 text-[11.5px] font-medium text-gray-700 hover:bg-gray-50">
            상세
          </Link>
        </div>
      </td>
    </tr>
  );
}
