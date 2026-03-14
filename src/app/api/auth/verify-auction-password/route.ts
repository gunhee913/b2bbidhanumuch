import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/resolve-auth";
import { verifyAuctionPassword } from "@/features/dealers/auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);

    if (!auth?.dealerId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { auctionPassword } = await request.json();

    if (!auctionPassword) {
      return NextResponse.json(
        { error: "경매 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 소속 중도매인의 경매 비밀번호로 검증
    const dealerId = auth.dealerId;
    const isValid = await verifyAuctionPassword(dealerId, auctionPassword);

    if (!isValid) {
      return NextResponse.json(
        { error: "경매 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auction password verification error:", error);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
