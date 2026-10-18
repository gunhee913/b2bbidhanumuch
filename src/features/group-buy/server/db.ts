import 'server-only';

import { getAdminClient } from '@/lib/supabase-admin';
import type { GroupBuyProductRow, GroupBuyOrderRow } from '../types';

export const supabase = getAdminClient();

/**
 * 상품 + 부위 + 개체 + 선점 구좌 한 번에.
 * `grade_cert` 는 base64 파일이 통째로 든 JSONB 라 파일명만 뽑는다.
 */
export const PRODUCT_SELECT = `
  *,
  cattle_parts (
    id, part_name, part_no, weight, min_price, images, winning_dealer_id, bid_price, is_included
  ),
  cattle_listings (
    id, listing_no, listing_date, grade, marbling_score, gender, month_age, trace_no,
    slaughter_house, slaughter_date, slaughter_no, carcass_weight, images, company_id, status,
    back_fat, eye_muscle, meat_color, fat_color, texture, maturity, process_date, process_weight,
    gradeCertFileName:grade_cert->>fileName,
    slaughterCertFileName:slaughter_cert->>fileName,
    companies ( name )
  ),
  group_buy_order_slots ( slot_no )
`;

export interface PartJoin {
  id: string;
  part_name: string;
  part_no: number;
  weight: number | string | null;
  min_price: number | null;
  images: string[] | null;
  winning_dealer_id: string | null;
  bid_price: number | null;
  is_included: boolean;
}

export interface ListingJoin {
  id: string;
  listing_no: string;
  listing_date: string;
  grade: string | null;
  marbling_score: number | null;
  gender: string | null;
  month_age: number | null;
  trace_no: string | null;
  slaughter_house: string | null;
  slaughter_date: string | null;
  slaughter_no: string | null;
  carcass_weight: number | string | null;
  back_fat: number | null;
  eye_muscle: number | null;
  meat_color: number | null;
  fat_color: number | null;
  texture: number | null;
  maturity: number | null;
  process_date: string | null;
  process_weight: number | string | null;
  images: string[] | null;
  company_id: string | null;
  status: string;
  gradeCertFileName: string | null;
  slaughterCertFileName: string | null;
  companies: { name: string } | null;
}

export interface ProductWithJoins extends GroupBuyProductRow {
  cattle_parts: PartJoin | null;
  cattle_listings: ListingJoin | null;
  group_buy_order_slots: { slot_no: number }[] | null;
}

export const ORDER_SELECT = `
  *,
  group_buy_order_slots ( slot_no ),
  consumers ( id, name, phone )
`;

export interface OrderWithJoins extends GroupBuyOrderRow {
  group_buy_order_slots: { slot_no: number }[] | null;
  consumers: { id: string; name: string; phone: string } | null;
}

/** 부위 대표이미지(part_group_images) · (company_id|'*') + group_name → url */
export type GroupImageMap = Map<string, string>;

export async function loadGroupImageMap(): Promise<GroupImageMap> {
  const { data } = await supabase
    .from('part_group_images')
    .select('company_id, group_name, image_url');
  const map: GroupImageMap = new Map();
  for (const row of (data ?? []) as { company_id: string | null; group_name: string; image_url: string }[]) {
    map.set(groupImageKey(row.company_id, row.group_name), row.image_url);
  }
  return map;
}

export function groupImageKey(companyId: string | null, groupName: string): string {
  return `${companyId ?? '*'}::${groupName}`;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}
