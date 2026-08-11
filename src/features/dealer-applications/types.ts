// ============================================
// 매참인 신청 접수 도메인 타입
// ============================================

export type HandleStatus =
  | "unread"
  | "viewed"
  | "contacted"
  | "onhold"
  | "done";

export const HANDLE_STATUS_LABELS: Record<HandleStatus, string> = {
  unread: "미확인",
  viewed: "확인함",
  contacted: "연락완료",
  onhold: "보류",
  done: "처리완료",
};

export const HANDLE_STATUS_ORDER: HandleStatus[] = [
  "unread",
  "viewed",
  "contacted",
  "onhold",
  "done",
];

export interface DealerApplicationRow {
  id: string;
  applicant_name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  auction_password_hash: string;
  business_name: string;
  business_no: string;
  representative_name: string;
  address: string;
  business_type: "individual" | "corporation";
  preferred_slaughter_houses: string[] | null;
  preferred_parts: string[] | null;
  preferred_grades: string[] | null;
  expected_monthly_volume: string | null;
  distribution_channels: string[] | null;
  inquiry: string | null;
  agreed_service: boolean;
  agreed_privacy: boolean;
  agreed_trade: boolean;
  agreed_marketing: boolean;
  agreed_at: string;
  agreed_ip: string | null;
  agreed_user_agent: string | null;
  handle_status: HandleStatus;
  admin_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerApplication {
  id: string;
  applicantName: string;
  phone: string;
  email: string | null;
  businessName: string;
  businessNo: string;
  representativeName: string;
  address: string;
  businessType: "individual" | "corporation";
  preferredSlaughterHouses: string[];
  preferredParts: string[];
  preferredGrades: string[];
  expectedMonthlyVolume: string | null;
  distributionChannels: string[];
  inquiry: string | null;
  agreedService: boolean;
  agreedPrivacy: boolean;
  agreedTrade: boolean;
  agreedMarketing: boolean;
  agreedAt: string;
  agreedIp: string | null;
  agreedUserAgent: string | null;
  handleStatus: HandleStatus;
  adminNote: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealerApplicationSubmitInput {
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
  preferredSlaughterHouses: string[];
  preferredParts: string[];
  preferredGrades: string[];
  expectedMonthlyVolume?: string;
  distributionChannels: string[];
  inquiry?: string;
  agreedService: boolean;
  agreedPrivacy: boolean;
  agreedMarketing: boolean;
}

export function toDealerApplication(
  row: DealerApplicationRow,
): DealerApplication {
  return {
    id: row.id,
    applicantName: row.applicant_name,
    phone: row.phone,
    email: row.email,
    businessName: row.business_name,
    businessNo: row.business_no,
    representativeName: row.representative_name,
    address: row.address,
    businessType: row.business_type,
    preferredSlaughterHouses: row.preferred_slaughter_houses ?? [],
    preferredParts: row.preferred_parts ?? [],
    preferredGrades: row.preferred_grades ?? [],
    expectedMonthlyVolume: row.expected_monthly_volume,
    distributionChannels: row.distribution_channels ?? [],
    inquiry: row.inquiry,
    agreedService: row.agreed_service,
    agreedPrivacy: row.agreed_privacy,
    agreedTrade: row.agreed_trade,
    agreedMarketing: row.agreed_marketing,
    agreedAt: row.agreed_at,
    agreedIp: row.agreed_ip,
    agreedUserAgent: row.agreed_user_agent,
    handleStatus: row.handle_status,
    adminNote: row.admin_note,
    handledBy: row.handled_by,
    handledAt: row.handled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
