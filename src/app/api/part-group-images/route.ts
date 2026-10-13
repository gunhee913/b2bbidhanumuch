import { NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";

interface Row {
  company_id: string | null;
  group_name: string;
  image_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

function toPartGroupImage(row: Row) {
  return {
    companyId: row.company_id,
    groupName: row.group_name,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** 공개 · 부위 대표이미지 전체 목록 (전체 기본 + 업체별) · 부위 사진 없는 줄의 대체 사진 */
export async function GET() {
  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from("part_group_images")
    .select("company_id, group_name, image_url, updated_at, updated_by")
    .order("group_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    images: ((data ?? []) as Row[]).map(toPartGroupImage),
  });
}
