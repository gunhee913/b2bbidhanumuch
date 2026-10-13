import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isHttpUrl,
  isValidPartGroup,
  parseCompanyId,
  removePartGroupImage,
  savePartGroupImage,
} from "@/features/part-group-images/lib/store";

interface UpsertBody {
  /** null 또는 비움 = 전체 기본 */
  companyId?: string | null;
  groupName: string;
  imageUrl: string;
}

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

  if (!groupName || !isValidPartGroup(groupName)) {
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
  if (!isHttpUrl(imageUrl)) {
    return NextResponse.json(
      { error: "이미지 URL 이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const result = await savePartGroupImage({
    companyId,
    groupName,
    imageUrl,
    updatedBy: auth.adminName,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
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

  const { error } = await removePartGroupImage({ companyId, groupName });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
