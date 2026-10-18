import 'server-only';

import { supabase } from './db';

export interface GroupBuySettings {
  platformDealerId: string | null;
  platformDealerName: string | null;
  deadlineOffsetMin: number;
}

const DEFAULT_OFFSET_MIN = 30;

export async function getSettings(): Promise<GroupBuySettings> {
  const { data } = await supabase
    .from('group_buy_settings')
    .select('platform_dealer_id, deadline_offset_min, dealers ( name )')
    .eq('id', 1)
    .maybeSingle();

  const row = data as unknown as
    | { platform_dealer_id: string | null; deadline_offset_min: number | null; dealers: { name: string } | null }
    | null;

  return {
    platformDealerId: row?.platform_dealer_id ?? null,
    platformDealerName: row?.dealers?.name ?? null,
    deadlineOffsetMin: row?.deadline_offset_min ?? DEFAULT_OFFSET_MIN,
  };
}

export async function updateSettings(input: {
  platformDealerId?: string | null;
  deadlineOffsetMin?: number;
  updatedBy: string;
}): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { id: 1, updated_by: input.updatedBy };
  if (input.platformDealerId !== undefined) patch.platform_dealer_id = input.platformDealerId;
  if (input.deadlineOffsetMin !== undefined) patch.deadline_offset_min = input.deadlineOffsetMin;

  const { error } = await supabase.from('group_buy_settings').upsert(patch, { onConflict: 'id' });
  return { error: error?.message ?? null };
}
