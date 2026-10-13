import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createPureClient } from "@/lib/supabase/server";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";

interface Row {
  company_id: string | null;
  group_name: string;
  image_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface UpsertBody {
  /** null 또는 비움 = 전체 기본 */
  companyId?: string | null;
  groupName: string;
  imageUrl: string;
}

const VALID_GROUPS = new Set<string>(getPartGroupOrder());
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || token.userType !== "admin_user") {
    return {
      error: NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      ),
      adminName: null,
    };
  }
  return {
    error: null,
    adminName: (token.name as string | undefined) ?? "관리자",
  };
}

function toIso(row: Row) {
  return {
    companyId: row.company_id,
    groupName: row.group_name,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** 빈 문자열 · undefined 는 전체 기본(null) · UUID 가 아니면 400 */
function parseCompanyId(raw: string | null | undefined): string | null | false {
  const value = raw?.trim();
  if (!value) return null;
  return UUID_RE.test(value) ? value : false;
}

const SELECT = "company_id, group_name, image_url, updated_at, updated_by";

/**
 * 같은 자리(업체 × 부위, 또는 전체 기본 × 부위)의 행 id · 없으면 null.
 * 전체 기본은 company_id IS NULL 이라 UNIQUE 로 upsert 를 걸 수 없어 직접 찾아 고친다.
 */
async function findExistingId(
  supabase: Awaited<ReturnType<typeof createPureClient>>,
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

/** 관리자 · 부위 대표이미지 등록/교체 · 업체별 또는 전체 기본 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const groupName = body.groupName?.trim();
  const imageUrl = body.imageUrl?.trim();
  const companyId = parseCompanyId(body.companyId);

  if (!groupName || !VALID_GROUPS.has(groupName)) {
    return NextResponse.json(
      { error: "알 수 없는 부위입니다." },
      { status: 400 },
    );
  }
  if (companyId === false) {
    return NextResponse.json(
      { error: "업체 식별자가 올바르지 않습니다." },
      { status: 400 },
    );
  }
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
    return NextResponse.json(
      { error: "이미지 URL 이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const supabase = await createPureClient();
  const patch = {
    image_url: imageUrl,
    updated_at: new Date().toISOString(),
    updated_by: auth.adminName,
  };

  const existing = await findExistingId(supabase, companyId, groupName);
  if (existing.error) {
    return NextResponse.json({ error: existing.error }, { status: 500 });
  }

  const { data, error } = existing.id
    ? await supabase
        .from("part_group_images")
        .update(patch)
        .eq("id", existing.id)
        .select(SELECT)
        .single()
    : await supabase
        .from("part_group_images")
        .insert({ company_id: companyId, group_name: groupName, ...patch })
        .select(SELECT)
        .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toIso(data as Row));
}

/** 관리자 · 부위 대표이미지 삭제 (`?group=등심&companyId=…` · companyId 없으면 전체 기본) */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const params = new URL(request.url).searchParams;
  const groupName = params.get("group")?.trim();
  const companyId = parseCompanyId(params.get("companyId"));
  if (!groupName) {
    return NextResponse.json(
      { error: "group 파라미터가 필요합니다." },
      { status: 400 },
    );
  }
  if (companyId === false) {
    return NextResponse.json(
      { error: "업체 식별자가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const supabase = await createPureClient();
  const base = supabase
    .from("part_group_images")
    .delete()
    .eq("group_name", groupName);
  const { error } = companyId
    ? await base.eq("company_id", companyId)
    : await base.is("company_id", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
