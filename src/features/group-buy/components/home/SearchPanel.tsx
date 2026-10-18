'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { GB_LOGO_SRC, GB_VERIFIED_IMAGE_SRC, GRADE_FILTERS } from '../../constants/ui';
import { QUICK_FILTERS, type HomeQuery, type PartGroupStat, type PopularSearch, type QuickKey } from '../../lib/homeFilters';

/** 스카이스캐너 홈처럼 고정 문구 한 줄. */
const HEADLINE = '한우 부분육, 여럿이 나눠 도매가로.';

interface SearchPanelProps {
  query: HomeQuery;
  onChange: (next: HomeQuery) => void;
  onSubmit: () => void;
  resultCount: number;
  loading?: boolean;
  brands: string[];
  partGroups: PartGroupStat[];
  /** "인기 검색" 9위까지 · 부위/등급 키워드 */
  popular: PopularSearch[];
}

/**
 * 헤더 바로 아래 검색 영역 · 헤이딜러 홈의 "브랜드 전체 → 차종 → 모델 → N대 보기" 구성.
 * 왼쪽에 부위/등급/브랜드 셀렉트 · 인기 부위 · 3D 아이콘 메뉴, 오른쪽에 왼쪽 높이에 맞춘 "확인했어요" 배너.
 */
export function SearchPanel({ query, onChange, onSubmit, resultCount, loading = false, brands, partGroups, popular }: SearchPanelProps) {
  const availableGroups = getPartGroupOrder().filter((g) => partGroups.some((s) => s.group === g));
  const toggleQuick = (key: QuickKey) => onChange({ ...query, quick: query.quick === key ? '' : key });

  return (
    <section className="pt-12" aria-label="부위 검색">
      {/* 스카이스캐너 실측: Noto Sans KR 700 · 32px/40px · 자간 보정 없음 */}
      <h1 className="font-[family-name:var(--font-noto-kr)] text-[32px] font-bold leading-[40px] tracking-normal text-content">
        {HEADLINE}
      </h1>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_440px] items-stretch gap-8">
        <div>
          {/* 헤이딜러처럼 셀렉트 세 칸이 한 막대로 붙고, 오른쪽 끝에 실행 버튼 */}
          <form
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] overflow-hidden rounded bg-surface-accent/70"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <Select value={query.partGroup} onChange={(v) => onChange({ ...query, partGroup: v })} placeholder="부위 선택" options={availableGroups} />
            <Select value={query.grade} onChange={(v) => onChange({ ...query, grade: v })} placeholder="등급 선택" options={GRADE_FILTERS} format={(g) => `${g}등급`} />
            <Select value={query.brand} onChange={(v) => onChange({ ...query, brand: v })} placeholder="브랜드 선택" options={brands} />

            <button type="submit" className="h-[52px] rounded-r bg-ink text-[15px] font-bold tabular-nums text-white transition-colors hover:bg-ink-hover">
              {loading ? '불러오는 중' : `${resultCount.toLocaleString()}개 보기`}
            </button>
          </form>

          <div className="mt-7">
            <p className="text-[12.5px] font-semibold text-content-faint">인기 검색</p>
            {popular.length === 0 ? (
              <p className="mt-3 text-[13px] text-content-faint">모집이 열리면 인기 순위가 표시돼요.</p>
            ) : (
              <ol className="mt-2.5 grid grid-flow-col grid-cols-3 grid-rows-3 gap-x-10 gap-y-1.5">
                {popular.map((s, i) => {
                  const active = s.type === 'part' ? query.partGroup === s.value : query.grade === s.value;
                  const next: HomeQuery = s.type === 'part' ? { ...query, partGroup: active ? '' : s.value } : { ...query, grade: active ? '' : s.value };
                  return (
                    <li key={`${s.type}-${s.value}`}>
                      <button
                        type="button"
                        onClick={() => onChange(next)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-left text-[13.5px] transition-colors hover:bg-surface-muted',
                          active ? 'font-bold text-content' : 'font-medium text-content-mid',
                        )}
                      >
                        <span className="w-3 text-[12.5px] font-bold tabular-nums text-content">{i + 1}</span>
                        <span className="truncate">{s.label}</span>
                        <span className="ml-auto shrink-0 text-[12px] tabular-nums text-content-faint">{s.count}개</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <ul className="mt-8 flex items-start gap-6">
            {QUICK_FILTERS.map(({ key, label, caption, icon }) => {
              const active = query.quick === key;
              return (
                <li key={key}>
                  <button type="button" onClick={() => toggleQuick(key)} aria-pressed={active} title={caption} className="flex w-[96px] flex-col items-center gap-2.5">
                    <span className="relative h-14 w-14">
                      <Image src={icon} alt="" fill sizes="56px" className={cn('object-contain', !active && query.quick && 'opacity-40')} />
                    </span>
                    <span className={cn('text-[13.5px] leading-tight', active ? 'font-bold text-content' : 'font-semibold text-content-mid')}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <VerifiedCard />
      </div>
    </section>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
  format = (v) => v,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
  format?: (v: string) => string;
}) {
  return (
    <label
      className={cn(
        'relative flex h-[52px] items-center border-r border-line-soft transition-colors focus-within:bg-surface focus-within:shadow-[inset_0_0_0_1px_rgb(23_23_28)]',
        value && 'bg-surface',
      )}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-full w-full appearance-none bg-transparent pl-5 pr-9 text-[14.5px] outline-none', value ? 'font-semibold text-content' : 'font-medium text-content-soft')}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-content-faint" />
    </label>
  );
}

/** 왼쪽 열 높이를 그대로 따라가는 배너 · 아이콘 메뉴 끝과 아래선이 맞는다 */
function VerifiedCard() {
  return (
    <Link href="/group-buy/guide" className="group relative block min-h-[320px] overflow-hidden rounded bg-surface-accent">
      {/* 헤이딜러 "인증 했어요" 카드 · 사진 자체가 흰 스튜디오라 덮개 없이 글자를 왼쪽 위에 그대로 얹는다 */}
      <Image src={GB_VERIFIED_IMAGE_SRC} alt="" fill sizes="880px" quality={90} className="object-cover object-[50%_40%] transition-transform duration-700 group-hover:scale-[1.03]" priority />
      <p className="absolute left-7 top-7 text-[24px] font-bold leading-[1.3] tracking-[-0.03em] text-content">
        <span className="flex items-center gap-1.5">
          <span className="relative h-6 w-6 shrink-0">
            <Image src={GB_LOGO_SRC} alt="농협" fill sizes="24px" className="object-contain" unoptimized />
          </span>
          농협이
        </span>
        확인했어요
      </p>
    </Link>
  );
}
