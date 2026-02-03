import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyAuctionPassword } from "@/features/dealers/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
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
    const dealerId = session.dealer.id;
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
