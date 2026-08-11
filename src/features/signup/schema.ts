import { z } from "zod";

// ============================================
// 약관 항목
// ============================================
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
    id: "marketing",
    label: "마케팅 정보 수신 동의",
    required: false,
  },
] as const;

export type AgreementId = (typeof AGREEMENT_ITEMS)[number]["id"];

// ============================================
// 옵션 프리셋
// ============================================
export const SLAUGHTER_HOUSE_OPTIONS = [
  { value: "eumseong", label: "음성공판장" },
  { value: "bucheon", label: "부천공판장" },
  { value: "naju", label: "나주공판장" },
  { value: "goryeong", label: "고령공판장" },
] as const;

export const PART_OPTIONS = [
  "등심",
  "안심",
  "채끝",
  "목심",
  "앞다리",
  "부채살",
  "살치살",
  "치마살",
  "우둔",
  "설도",
  "양지",
  "차돌박이",
  "사태",
  "갈비",
  "특수부위",
] as const;

export const GRADE_OPTIONS = ["1++", "1+", "1", "2-이하"] as const;

export const MONTHLY_VOLUME_OPTIONS = [
  { value: "under_500kg", label: "500kg 미만" },
  { value: "500_2000", label: "500kg ~ 2톤" },
  { value: "2000_5000", label: "2톤 ~ 5톤" },
  { value: "over_5000", label: "5톤 이상" },
] as const;

export const DISTRIBUTION_CHANNEL_OPTIONS = [
  { value: "wholesale", label: "도매" },
  { value: "retail", label: "소매" },
  { value: "foodservice", label: "식자재" },
  { value: "butcher", label: "정육점" },
  { value: "distributor", label: "유통업체" },
  { value: "etc", label: "기타" },
] as const;

export const BUSINESS_TYPE_OPTIONS = [
  { value: "individual", label: "개인사업자" },
  { value: "corporation", label: "법인사업자" },
] as const;

// ============================================
// 스키마
// ============================================
const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const businessNoRegex = /^\d{3}-?\d{2}-?\d{5}$/;

export const SignupFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "이름은 2자 이상이어야 합니다.")
      .max(30, "이름은 30자 이하여야 합니다."),
    phone: z.string().regex(phoneRegex, "휴대번호를 정확히 입력해 주세요."),
    email: z
      .string()
      .email("이메일 형식이 올바르지 않습니다.")
      .or(z.literal(""))
      .optional(),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .max(64, "비밀번호는 64자 이하여야 합니다."),
    passwordConfirm: z.string(),
    auctionPassword: z
      .string()
      .min(4, "경매 비밀번호는 4자 이상이어야 합니다.")
      .max(20, "경매 비밀번호는 20자 이하여야 합니다."),
    businessType: z.enum(["individual", "corporation"], {
      required_error: "사업 형태를 선택해 주세요.",
    }),
    businessName: z.string().min(1, "상호(사업장명)를 입력해 주세요."),
    businessNo: z
      .string()
      .regex(
        businessNoRegex,
        "사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)",
      ),
    representative: z.string().min(1, "대표자명을 입력해 주세요."),
    address: z.string().min(1, "사업장 주소를 입력해 주세요."),
    preferredSlaughterHouses: z.array(z.string()).default([]),
    preferredParts: z.array(z.string()).default([]),
    preferredGrades: z.array(z.string()).default([]),
    expectedMonthlyVolume: z.string().optional().or(z.literal("")),
    distributionChannels: z.array(z.string()).default([]),
    inquiry: z.string().max(1000, "1000자 이내로 입력해 주세요.").optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export type SignupFormValues = z.infer<typeof SignupFormSchema>;
