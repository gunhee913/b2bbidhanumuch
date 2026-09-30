import { NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";

interface Row {
  group_name: string;
  image_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

function toPartGroupImage(row: Row) {
  return {
    groupName: row.group_name,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** 공개 · 부위 대표이미지 전체 목록 (라이브 사이드바 사진 모드) */
export async function GET() {
  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from("part_group_images")
    .select("group_name, image_url, updated_at, updated_by")
    .order("group_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    images: ((data ?? []) as Row[]).map(toPartGroupImage),
  });
}
