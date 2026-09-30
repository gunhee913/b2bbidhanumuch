/**
 * 배송지시 도메인 프론트엔드 타입.
 * 서버 응답(`/api/delivery/*`) 을 그대로 활용하되, 프론트에서 파생 필드가 필요한 경우 확장한다.
 */

export interface WinningPart {
  partId: string;
  partNo: number;
  partName: string;
  listingPartNo: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
  bidAt: string;
  dealerId: string;
  dealerNo: string;
  dealerName: string;
  listingId: string;
  listingNo: string;
  listingDate: string;
  grade: string;
  traceNo: string;
  breed: string;
  gender: string;
  monthAge: number;
  carcassWeight: number;
  backFat: number;
  eyeMuscle: number;
  marbling: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  slaughterHouse: string;
  slaughterNo: string;
  slaughterDate: string;
  processDate: string;
  processWeight: number;
  /** 개체 사진 (상장 등록 시 업로드) · 없으면 빈 배열 */
  images: string[];
  companyName: string;
}

export interface AssignmentInfo {
  id: string;
  partnerId: string;
  partnerNo: string;
  partnerName: string;
  representative: string;
  phone: string;
  address: string;
}

export interface Partner {
  id: string;
  partnerNo: string;
  name: string;
  representative: string;
  phone: string;
  address: string;
  status: string;
  dealer1: { id: string; dealerNo: string; name: string } | null;
  dealer2: { id: string; dealerNo: string; name: string } | null;
  dealer3: { id: string; dealerNo: string; name: string } | null;
}

export interface WinningPartsResponse {
  winningParts: WinningPart[];
}

export interface AssignmentsResponse {
  assignments: Record<string, AssignmentInfo>;
}

export interface PartnersResponse {
  partners: Partner[];
}
