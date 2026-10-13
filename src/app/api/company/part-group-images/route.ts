import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isHttpUrl,
  isValidPartGroup,
  removePartGroupImage,
  savePartGroupImage,
} from "@/features/part-group-images/lib/store";

interface UpsertBody {
  groupName: string;
  imageUrl: string;
}

/**
 * 업체 사용자 · 제 업체의 부위 대표이미지만 다룬다.
 *
 * company_id 는 요청이 아니라 **세션에서** 가져온다. 몸통에 실어 보내게 하면 다른 업체
 * id 를 적어 넣는 길이 생긴다. 전체 기본(company_id NULL)은 관리자만 만진다.
 */
async function requireCompany(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const company = token?.company as { id?: string; name?: string } | null;
  if (!token || token.userType !== "company_user" || !company?.id) {
    return {
      error: NextResponse.json(
        { error: "업체 로그인이 필요합니다." },
        { status: 403 },
      ),
      companyId: null,
      updatedBy: null,
    };
  }
  const who = [company.name, token.name as string | undefined]
    .filter(Boolean)
    .join(" · ");
  return { error: null, companyId: company.id, updatedBy: who || "업체" };
}

/** 업체 · 제 업체 부위 대표이미지 등록/교체 */
export async function PUT(request: NextRequest) {
  const auth = await requireCompany(request);
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
  if (!groupName || !isValidPartGroup(groupName)) {
    return NextResponse.json(
      { error: "알 수 없는 부위입니다." },
      { status: 400 },
    );
  }
  if (!isHttpUrl(imageUrl)) {
    return NextResponse.json(
      { error: "이미지 URL 이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const result = await savePartGroupImage({
    companyId: auth.companyId,
    groupName,
    imageUrl,
    updatedBy: auth.updatedBy,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

/** 업체 · 제 업체 부위 대표이미지 삭제 (`?group=등심`) · 지우면 전체 기본으로 돌아간다 */
export async function DELETE(request: NextRequest) {
  const auth = await requireCompany(request);
  if (auth.error) return auth.error;

  const groupName = new URL(request.url).searchParams.get("group")?.trim();
  if (!groupName) {
    return NextResponse.json(
      { error: "group 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const { error } = await removePartGroupImage({
    companyId: auth.companyId,
    groupName,
  });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
