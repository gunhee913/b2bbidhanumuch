import type { ConsumerProduct } from '../types';
import { shortGrade } from './format';

export type QuickKey = 'marbling9' | 'almost' | 'popular' | 'new' | 'closing' | 'saving';

export interface HomeQuery {
  partGroup: string;
  grade: string;
  /** 출하 브랜드 · 개체의 출하 업체명 */
  brand: string;
  quick: QuickKey | '';
}

export const EMPTY_HOME_QUERY: HomeQuery = { partGroup: '', grade: '', brand: '', quick: '' };

export const brandOf = (p: ConsumerProduct): string | null => p.cattle.companyName?.trim() || null;

export interface QuickFilter {
  key: QuickKey;
  label: string;
  caption: string;
  /** 생성한 3D 일러스트 아이콘 · `public/group-buy/icons` */
  icon: string;
}

/** 검색창 아래 아이콘 메뉴 · 헤이딜러의 "인기 모델 / 할인 중 / 7일 한정 특가" 줄에 해당 */
export const QUICK_FILTERS: QuickFilter[] = [
  { key: 'marbling9', label: '마블링9', caption: '1++ 최고 마블링', icon: '/group-buy/icons/no9.png' },
  { key: 'almost', label: '거의 다 찼어요', caption: '남은 구좌 20% 이하', icon: '/group-buy/icons/flame.png' },
  { key: 'popular', label: '인기 상품', caption: '참여가 많은 순', icon: '/group-buy/icons/crown.png' },
  { key: 'new', label: '새로 올라온', caption: '최근 등록 순', icon: '/group-buy/icons/sparkle.png' },
];

/** 메뉴에는 없지만 홈 레일 "모두 보기"에서 쓰는 조건의 이름 */
export const QUICK_LABELS: Record<QuickKey, string> = {
  marbling9: '마블링9',
  almost: '거의 다 찼어요',
  popular: '인기 상품',
  new: '새로 올라온',
  closing: '마감 임박',
  saving: '절약률 높은',
};

/** 근내지방도 9 · 점수 필드 우선, 없으면 등급 문자열 `1++B(9)` 꼴 */
const isMarbling9 = (p: ConsumerProduct) => p.cattle.marblingScore === 9 || /\(9\)/.test(p.cattle.grade ?? '');
const isTopGrade = (p: ConsumerProduct) => shortGrade(p.cattle.grade) === '1++';

export const isHomeQueryActive = (q: HomeQuery): boolean => Object.values(q).some((v) => v !== '');

const deadlineMs = (p: ConsumerProduct) => new Date(p.recruitDeadline).getTime();
const publishedMs = (p: ConsumerProduct) => (p.publishedAt ? new Date(p.publishedAt).getTime() : 0);

export const isAlmostFull = (p: ConsumerProduct): boolean =>
  p.remainingCount > 0 && p.remainingCount <= Math.max(1, Math.ceil(p.slotCount * 0.2));

/** 남은 구좌가 있으면 판다. 모집 마감 시각은 잠시 목록·주문에서 쓰지 않는다. */
export const isOpen = (p: ConsumerProduct): boolean => p.remainingCount > 0;

export const sortByDeadline = (list: ConsumerProduct[]) => [...list].sort((a, b) => deadlineMs(a) - deadlineMs(b));
export const sortBySaving = (list: ConsumerProduct[]) => [...list].sort((a, b) => (b.savingRate ?? 0) - (a.savingRate ?? 0));
export const sortByNewest = (list: ConsumerProduct[]) => [...list].sort((a, b) => publishedMs(b) - publishedMs(a));
export const sortByFill = (list: ConsumerProduct[]) => [...list].sort((a, b) => a.remainingCount / a.slotCount - b.remainingCount / b.slotCount);
export const sortByPopular = (list: ConsumerProduct[]) => [...list].sort((a, b) => b.soldCount - a.soldCount || (b.savingRate ?? 0) - (a.savingRate ?? 0));

export const POPULAR_SEARCH_LIMIT = 9;

/** "인기 검색" 한 줄 · 부위 키워드 또는 등급 키워드 */
export interface PopularSearch {
  type: 'part' | 'grade';
  value: string;
  label: string;
  count: number;
  score: number;
}

/** 부위군과 등급을 각각 키워드로 보고 참여 구좌 + 상품 수로 순위를 매긴다 */
export function popularSearches(list: ConsumerProduct[], limit = POPULAR_SEARCH_LIMIT): PopularSearch[] {
  const acc = new Map<string, PopularSearch>();
  const add = (type: PopularSearch['type'], value: string, label: string, p: ConsumerProduct) => {
    const key = `${type}:${value}`;
    const cur = acc.get(key) ?? { type, value, label, count: 0, score: 0 };
    cur.count += 1;
    cur.score += 1 + p.soldCount * 3;
    acc.set(key, cur);
  };
  for (const p of list) {
    add('part', p.partGroup, p.partGroup, p);
    const g = shortGrade(p.cattle.grade);
    if (g !== '-') add('grade', g, `${g}등급`, p);
  }
  return [...acc.values()].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'ko')).slice(0, limit);
}
/** 1++ 중에서 근내지방도 9가 먼저 */
export const sortByMarbling = (list: ConsumerProduct[]) =>
  [...list.filter(isTopGrade)].sort((a, b) => Number(isMarbling9(b)) - Number(isMarbling9(a)) || (b.savingRate ?? 0) - (a.savingRate ?? 0));

function applyQuick(list: ConsumerProduct[], quick: QuickKey | ''): ConsumerProduct[] {
  switch (quick) {
    case 'marbling9':
      return sortByMarbling(list);
    case 'almost':
      return sortByFill(list.filter(isAlmostFull));
    case 'popular':
      return sortByPopular(list);
    case 'new':
      return sortByNewest(list);
    case 'closing':
      return sortByDeadline(list.filter((p) => deadlineMs(p) - Date.now() < 86_400_000));
    case 'saving':
      return sortBySaving(list.filter((p) => (p.savingRate ?? 0) > 0));
    default:
      return list;
  }
}

/** 셀렉트 · 빠른 메뉴를 한 번에 적용 */
export function applyHomeQuery(products: ConsumerProduct[], q: HomeQuery): ConsumerProduct[] {
  const base = products.filter(
    (p) =>
      (!q.partGroup || p.partGroup === q.partGroup) &&
      (!q.grade || shortGrade(p.cattle.grade) === q.grade) &&
      (!q.brand || brandOf(p) === q.brand),
  );
  return applyQuick(base, q.quick);
}

export interface PartGroupStat {
  group: string;
  count: number;
  minPrice: number;
}

/** 부위군별 상품 수 · 최저 구좌가 · 많은 순 */
export function summarizePartGroups(products: ConsumerProduct[]): PartGroupStat[] {
  const map = new Map<string, PartGroupStat>();
  for (const p of products) {
    const cur = map.get(p.partGroup);
    if (cur) {
      cur.count += 1;
      cur.minPrice = Math.min(cur.minPrice, p.slotPrice);
    } else {
      map.set(p.partGroup, { group: p.partGroup, count: 1, minPrice: p.slotPrice });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.group.localeCompare(b.group, 'ko'));
}
