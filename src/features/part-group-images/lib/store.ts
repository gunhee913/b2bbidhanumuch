import { createPureClient } from "@/lib/supabase/server";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import type { PartGroupImage } from "../types";

/**
 * `part_group_images` 읽고 쓰기 · 관리자 API 와 업체 API 가 같은 규칙을 쓴다.
 *
 * 둘로 갈라 두면 한쪽만 「같은 자리면 갱신」 을 빠뜨려 업체 × 부위에 행이 둘 생긴다.
 * 권한(누가 어느 company_id 를 건드릴 수 있나)은 라우트가 정하고, 여기는 받은
 * company_id 를 그대로 믿는다.
 */

interface Row {
  company_id: string | null;
  group_name: string;
  image_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

type Supabase = Awaited<ReturnType<typeof createPureClient>>;

const SELECT = "company_id, group_name, image_url, updated_at, updated_by";
const VALID_GROUPS = new Set<string>(getPartGroupOrder());
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidPartGroup(groupName: string | undefined): boolean {
  return !!groupName && VALID_GROUPS.has(groupName);
}

/** 빈 문자열 · undefined 는 전체 기본(null) · UUID 가 아니면 false */
export function parseCompanyId(
  raw: string | null | undefined,
): string | null | false {
  const value = raw?.trim();
  if (!value) return null;
  return UUID_RE.test(value) ? value : false;
}

export function isHttpUrl(value: string | undefined): value is string {
  return !!value && /^https?:\/\//.test(value);
}

function toIso(row: Row): PartGroupImage {
  return {
    companyId: row.company_id,
    groupName: row.group_name,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/**
 * 같은 자리(업체 × 부위, 또는 전체 기본 × 부위)의 행 id · 없으면 null.
 * 전체 기본은 company_id IS NULL 이라 UNIQUE 로 upsert 를 걸 수 없어 직접 찾아 고친다.
 */
async function findExistingId(
  supabase: Supabase,
  companyId: string | null,
  groupName: string,
): Promise<{ id: string | null; error: string | null }> {
  const base = supabase
    .from("part_group_images")
    .select("id")
    .eq("group_name", groupName);
  const { data, error } = companyId
    ? await base.eq("company_id", companyId).maybeSingle()
    : await base.is("company_id", null).maybeSingle();
  if (error) return { id: null, error: error.message };
  return { id: (data as { id: string } | null)?.id ?? null, error: null };
}

export type StoreResult<T> =
  { data: T; error: null } | { data: null; error: string };

/** 등록/교체 · 같은 자리에 있으면 갱신, 없으면 삽입 */
export async function savePartGroupImage(input: {
  companyId: string | null;
  groupName: string;
  imageUrl: string;
  updatedBy: string;
}): Promise<StoreResult<PartGroupImage>> {
  const supabase = await createPureClient();
  const patch = {
    image_url: input.imageUrl,
    updated_at: new Date().toISOString(),
    updated_by: input.updatedBy,
  };

  const existing = await findExistingId(
    supabase,
    input.companyId,
    input.groupName,
  );
  if (existing.error) return { data: null, error: existing.error };

  const { data, error } = existing.id
    ? await supabase
        .from("part_group_images")
        .update(patch)
        .eq("id", existing.id)
        .select(SELECT)
        .single()
    : await supabase
        .from("part_group_images")
        .insert({
          company_id: input.companyId,
          group_name: input.groupName,
          ...patch,
        })
        .select(SELECT)
        .single();
  if (error) return { data: null, error: error.message };
  return { data: toIso(data as Row), error: null };
}

/** 삭제 · 업체 전용을 지우면 그 부위는 전체 기본으로 돌아간다 */
export async function removePartGroupImage(input: {
  companyId: string | null;
  groupName: string;
}): Promise<{ error: string | null }> {
  const supabase = await createPureClient();
  const base = supabase
    .from("part_group_images")
    .delete()
    .eq("group_name", input.groupName);
  const { error } = input.companyId
    ? await base.eq("company_id", input.companyId)
    : await base.is("company_id", null);
  return { error: error?.message ?? null };
}
