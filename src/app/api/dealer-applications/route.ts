import { NextRequest, NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

interface SubmitBody {
  applicantName: string;
  phone: string;
  email?: string;
  password: string;
  auctionPassword: string;
  businessName: string;
  businessNo: string;
  representativeName: string;
  address: string;
  businessType: "individual" | "corporation";
  preferredSlaughterHouses?: string[];
  preferredParts?: string[];
  preferredGrades?: string[];
  expectedMonthlyVolume?: string;
  distributionChannels?: string[];
  inquiry?: string;
  agreedService: boolean;
  agreedPrivacy: boolean;
  agreedMarketing: boolean;
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

export async function POST(request: NextRequest) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const {
    applicantName,
    phone,
    email,
    password,
    auctionPassword,
    businessName,
    businessNo,
    representativeName,
    address,
    businessType,
    preferredSlaughterHouses,
    preferredParts,
    preferredGrades,
    expectedMonthlyVolume,
    distributionChannels,
    inquiry,
    agreedService,
    agreedPrivacy,
    agreedMarketing,
  } = body;

  if (
    !applicantName ||
    !phone ||
    !password ||
    !auctionPassword ||
    !businessName ||
    !businessNo ||
    !representativeName ||
    !address ||
    !businessType
  ) {
    return NextResponse.json(
      { error: "필수 항목이 누락되었습니다." },
      { status: 400 },
    );
  }

  if (!agreedService || !agreedPrivacy) {
    return NextResponse.json(
      { error: "필수 약관에 동의해 주세요." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const auctionPasswordHash = await bcrypt.hash(auctionPassword, SALT_ROUNDS);

    const supabase = await createPureClient();
    const nowIso = new Date().toISOString();
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const { data, error } = await supabase
      .from("dealer_applications")
      .insert({
        applicant_name: applicantName,
        phone,
        email: email || null,
        password_hash: passwordHash,
        auction_password_hash: auctionPasswordHash,
        business_name: businessName,
        business_no: businessNo,
        representative_name: representativeName,
        address,
        business_type: businessType,
        preferred_slaughter_houses: preferredSlaughterHouses ?? [],
        preferred_parts: preferredParts ?? [],
        preferred_grades: preferredGrades ?? [],
        expected_monthly_volume: expectedMonthlyVolume || null,
        distribution_channels: distributionChannels ?? [],
        inquiry: inquiry || null,
        agreed_service: agreedService,
        agreed_privacy: agreedPrivacy,
        agreed_trade: false,
        agreed_marketing: agreedMarketing,
        agreed_at: nowIso,
        agreed_ip: ip,
        agreed_user_agent: userAgent,
        handle_status: "unread",
      })
      .select("id, applicant_name, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      applicantName: data.applicant_name,
      createdAt: data.created_at,
    });
  } catch (err) {
    console.error("POST /dealer-applications error:", err);
    return NextResponse.json(
      { error: "신청 접수 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
