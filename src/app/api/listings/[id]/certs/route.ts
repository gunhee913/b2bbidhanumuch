import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import type { CertificateData } from "@/features/listings/types";

const supabase = getAdminClient();

/** 경매장에 노출되는 상장 상태 · 리스트 API 와 동일 조건 */
const VISIBLE_STATUSES = ["approved", "auction", "closed", "completed"];

export interface ListingCertsResponse {
  gradeCert: CertificateData | null;
  slaughterCert: CertificateData | null;
}

/**
 * GET /api/listings/[id]/certs
 * 등급판정확인서 · 도축검사증명서 스캔본 지연 로드.
 * 리스트 API 는 유무 플래그만 내려주고, 상세 패널이 열릴 때 이 엔드포인트로 파일을 가져온다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("cattle_listings")
      .select("id, status, grade_cert, slaughter_cert")
      .eq("id", id)
      .in("status", VISIBLE_STATUSES)
      .maybeSingle();

    if (error) {
      console.error("증명서 조회 오류:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "상장을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body: ListingCertsResponse = {
      gradeCert: (data.grade_cert as CertificateData | null) ?? null,
      slaughterCert: (data.slaughter_cert as CertificateData | null) ?? null,
    };

    return NextResponse.json(body, {
      headers: {
        // 증명서는 승인 후 거의 바뀌지 않음 · 브라우저 캐시 10분
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (e) {
    console.error("증명서 조회 예외:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
