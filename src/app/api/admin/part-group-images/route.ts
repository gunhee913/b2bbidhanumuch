import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createPureClient } from "@/lib/supabase/server";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";

interface Row {
  group_name: string;
  image_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface UpsertBody {
  groupName: string;
  imageUrl: string;
}

const VALID_GROUPS = new Set<string>(getPartGroupOrder());

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
  return { error: null, adminName: (token.name as string | undefined) ?? "관리자" };
}

function toIso(row: Row) {
  return {
    groupName: row.group_name,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** 관리자 · 부위 대표이미지 등록/교체 (group_name 기준 upsert) */
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

  if (!groupName || !VALID_GROUPS.has(groupName)) {
    return NextResponse.json(
      { error: "알 수 없는 부위입니다." },
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
  const { data, error } = await supabase
    .from("part_group_images")
    .upsert(
      {
        group_name: groupName,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        updated_by: auth.adminName,
      },
      { onConflict: "group_name" },
    )
    .select("group_name, image_url, updated_at, updated_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toIso(data as Row));
}

/** 관리자 · 부위 대표이미지 삭제 (`?group=등심`) */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const groupName = new URL(request.url).searchParams.get("group")?.trim();
  if (!groupName) {
    return NextResponse.json(
      { error: "group 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createPureClient();
  const { error } = await supabase
    .from("part_group_images")
    .delete()
    .eq("group_name", groupName);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
