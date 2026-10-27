import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { createPureClient } from '@/lib/supabase/server';
import { photoEditParamsSchema, withAdjustDefaults } from '@/features/photo-edit/lib/photoEdit';
import type { ImageEdit } from '@/features/photo-edit/types';

interface Row {
  edited_url: string;
  original_url: string;
  params: ImageEdit['params'];
}

/** 선명도가 생기기 전 기록은 그 칸이 없다 · 읽을 때 기본값으로 채워 내보낸다 */
const toImageEdit = (row: Row): ImageEdit => ({
  editedUrl: row.edited_url,
  originalUrl: row.original_url,
  params: withAdjustDefaults(row.params),
});

const isHttpUrl = (value: string) => /^https?:\/\//.test(value);

const bodySchema = z.object({
  editedUrl: z.string().refine(isHttpUrl, 'URL 이 올바르지 않습니다.'),
  originalUrl: z.string().refine(isHttpUrl, 'URL 이 올바르지 않습니다.'),
  params: photoEditParamsSchema,
});

/** 사진을 올리는 쪽(관리자·상장업체)만 · 중도매인·소비자는 보정 기록을 볼 일이 없다 */
async function requireUploader(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token.userType !== 'admin_user' && token.userType !== 'company_user')) {
    return { error: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }), name: null };
  }
  return { error: null, name: (token.name as string | undefined) ?? null };
}

/** `?url=<결과 URL>` → 보정 기록 · 없으면 `{ edit: null }` */
export async function GET(request: NextRequest) {
  const auth = await requireUploader(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url).searchParams.get('url')?.trim();
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 });
  }

  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from('image_edits')
    .select('edited_url, original_url, params')
    .eq('edited_url', url)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ edit: data ? toImageEdit(data as Row) : null });
}

/** 보정 결과 한 장의 기록을 넣거나 갱신 · 상한을 넘는 값은 400 */
export async function PUT(request: NextRequest) {
  const auth = await requireUploader(request);
  if (auth.error) return auth.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }
  const { editedUrl, originalUrl } = parsed.data;
  const params = parsed.data.params as ImageEdit['params'];

  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from('image_edits')
    .upsert(
      { edited_url: editedUrl, original_url: originalUrl, params, updated_by: auth.name, updated_at: new Date().toISOString() },
      { onConflict: 'edited_url' },
    )
    .select('edited_url, original_url, params')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toImageEdit(data as Row));
}
