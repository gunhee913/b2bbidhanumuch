/**
 * 선물세트 추천 구성 · 칸 수에 맞춰 부위만 채운다.
 * 등급은 그 부위에서 지금 살 수 있는 것 중 가장 높은 등급이다.
 */

import type { ConsumerProduct } from '../types';
import type { GiftCellCount } from './gift';
import { GRADE_KEY_ORDER, gradeKeyOf } from './pools';
import type { GiftCellDraft } from './giftAuto';

export const GIFT_PRESET_IDS = ['grill', 'grill-bulgogi', 'grill-soup', 'grill-mix'] as const;
export type GiftPresetId = (typeof GIFT_PRESET_IDS)[number];

export const GIFT_PRESET_META: Record<GiftPresetId, { title: string; desc: string }> = {
  grill: { title: '구이만', desc: '등심 · 안심 · 채끝' },
  'grill-bulgogi': { title: '구이 + 불고기', desc: '구이와 목심 · 양지' },
  'grill-soup': { title: '구이 + 국거리', desc: '구이와 사태 · 양지' },
  'grill-mix': { title: '구이 + 불고기 + 국거리', desc: '구이, 불고기, 국거리를 한 박스에' },
};

/** 칸마다 시도 순서 · 앞에 있는 부위가 없으면 다음 부위로 채운다 */
const SLOTS: Record<GiftPresetId, Record<2 | 3 | 4 | 6, string[][]>> = {
  grill: {
    2: [['등심', '채끝'], ['채끝', '안심']],
    3: [['등심'], ['안심', '채끝'], ['채끝', '부채']],
    4: [['등심'], ['안심'], ['채끝'], ['부채', '치마']],
    6: [['등심'], ['안심'], ['채끝'], ['부채'], ['치마'], ['업진', '토시·제비']],
  },
  'grill-bulgogi': {
    2: [['등심', '채끝'], ['목심', '양지']],
    3: [['등심'], ['채끝', '안심'], ['목심', '양지']],
    4: [['등심'], ['채끝'], ['목심'], ['양지', '우둔']],
    6: [['등심'], ['안심'], ['채끝'], ['목심'], ['양지'], ['우둔', '설도']],
  },
  'grill-soup': {
    2: [['등심', '채끝'], ['사태', '양지']],
    3: [['등심'], ['채끝', '안심'], ['사태', '양지']],
    4: [['등심'], ['채끝'], ['양지'], ['사태', '앞다리']],
    6: [['등심'], ['채끝'], ['부채'], ['양지'], ['사태'], ['앞다리']],
  },
  'grill-mix': {
    2: [['등심', '채끝'], ['양지', '목심']],
    3: [['등심', '안심', '채끝'], ['목심', '양지', '우둔'], ['사태', '앞다리', '양지']],
    4: [['등심'], ['채끝', '안심'], ['목심', '양지'], ['사태', '앞다리']],
    6: [['등심'], ['안심'], ['채끝'], ['목심'], ['양지'], ['사태']],
  },
};

const bestGrade = (partGroup: string, products: ConsumerProduct[]) => {
  const present = new Set(
    products
      .filter((product) => product.partGroup === partGroup)
      .map((product) => gradeKeyOf(product.cattle.grade, product.cattle.marblingScore))
      .filter((grade): grade is string => !!grade),
  );
  return GRADE_KEY_ORDER.find((grade) => present.has(grade)) ?? '';
};

/** 추천 구성으로 칸 초안을 만든다 · 재고 없는 칸은 비워 둔다 */
export function buildGiftPreset(id: GiftPresetId, cellCount: GiftCellCount, products: ConsumerProduct[]): GiftCellDraft[] {
  const count = cellCount === 5 ? 4 : cellCount;
  const slots = SLOTS[id][count as 2 | 3 | 4 | 6] ?? SLOTS[id][3];
  const used = new Set<string>();
  const drafts = slots.slice(0, cellCount).map((options) => {
    const partGroup = options.find((part) => !used.has(part) && bestGrade(part, products)) ?? '';
    if (!partGroup) return { partGroup: '', gradeKey: '' };
    used.add(partGroup);
    return { partGroup, gradeKey: bestGrade(partGroup, products) };
  });
  return Array.from({ length: cellCount }, (_, index) => drafts[index] ?? { partGroup: '', gradeKey: '' });
}
