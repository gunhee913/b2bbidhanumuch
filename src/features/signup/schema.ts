import { z } from "zod";

export const AGREEMENT_ITEMS = [
  {
    id: "service",
    label: "서비스 이용약관 동의",
    required: true,
  },
  {
    id: "privacy",
    label: "개인정보 수집·이용 동의",
    required: true,
  },
  {
    id: "trade",
    label: "거래인 약정 동의 (전자 약정)",
    required: true,
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신 동의",
    required: false,
  },
] as const;

export type AgreementId = (typeof AGREEMENT_ITEMS)[number]["id"];

const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const businessNoRegex = /^\d{3}-?\d{2}-?\d{5}$/;

export const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, "이름은 2자 이상이어야 합니다.")
    .max(30, "이름은 30자 이하여야 합니다."),
  phone: z
    .string()
    .regex(phoneRegex, "휴대전화 번호를 정확히 입력해 주세요."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(64, "비밀번호는 64자 이하여야 합니다."),
  passwordConfirm: z.string(),
  businessName: z
    .string()
    .min(1, "상호(사업장명)를 입력해 주세요."),
  businessNo: z
    .string()
    .regex(businessNoRegex, "사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)"),
  representative: z
    .string()
    .min(1, "대표자명을 입력해 주세요."),
  address: z
    .string()
    .min(1, "사업장 주소를 입력해 주세요."),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ["passwordConfirm"],
  message: "비밀번호가 일치하지 않습니다.",
});

export type SignupFormValues = z.infer<typeof SignupFormSchema>;

export const AGREEMENT_BODY = `제 1 조 (목적)
본 약정은 "부분육 온라인경매 플랫폼"(이하 "플랫폼")과 한우 부분육 경매에 참여하는 매매참여인(이하 "매참인") 간에 전자적 방법으로 체결되는 거래 조건을 정함을 목적으로 합니다.

제 2 조 (용어의 정의)
1. "매참인"이란 본 약정에 따라 플랫폼이 운영하는 부분육 경매에 참여할 수 있는 자격을 가진 중도매인을 말합니다.
2. "상장업체"란 한우 부분육을 상장하여 경매를 요청하는 도축·가공 사업자를 말합니다.
3. "회차 경매"란 사전에 정해진 시간 단위(회차)로 진행되는 비공개 입찰 방식의 경매를 말합니다.

제 3 조 (가입 자격)
1. 매참인으로 가입하고자 하는 자는 관계 법령에 따른 사업자등록을 완료한 사업자여야 합니다.
2. 플랫폼은 필요 시 사업자등록증 사본 등 관련 서류의 제출을 요구할 수 있습니다.

제 4 조 (거래의 성립)
1. 매참인은 부위별로 최저가(원/kg) 이상의 단가로 입찰할 수 있습니다.
2. 회차 마감 시점에 부위별 최고가 입찰자에게 낙찰이 확정됩니다.
3. 낙찰이 확정된 부위에 대하여 매참인은 대금 정산 및 인수 의무를 부담합니다.

제 5 조 (정산 및 대금 지급)
1. 낙찰 대금은 플랫폼이 정하는 정산 주기에 따라 지급됩니다.
2. 정산 관련 세부 사항은 플랫폼의 정산 정책을 따르며, 필요 시 별도로 공지됩니다.

제 6 조 (금지 행위)
매참인은 다음 각 호의 행위를 하여서는 안 됩니다.
1. 타인의 정보를 도용하여 가입·입찰하는 행위
2. 경매 질서를 어지럽히는 담합·허위 입찰 행위
3. 낙찰 후 정당한 사유 없이 인수를 거부하는 행위

제 7 조 (전자 약정의 효력)
매참인이 본 약정의 각 조항을 확인하고 "위 거래인 약정에 동의합니다"에 체크한 후 회원가입을 신청함으로써 본 약정은 전자적으로 체결된 것으로 간주됩니다.

제 8 조 (기타)
본 약정에 규정되지 않은 사항은 관계 법령 및 플랫폼 개별 정책에 따릅니다.

부칙
본 약정은 회원가입 신청 시점부터 효력이 발생합니다.`;
