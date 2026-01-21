// 거래처 타입 (/admin/partners 페이지와 동일한 구조)
export interface DeliveryPartner {
  id: string;
  partnerNo: string;
  name: string;
  businessNo: string;
  representative: string;
  phone: string;
  address: string;
  businessType: string;
  status: 'active' | 'inactive';
  dealer1: string; // 중도매인1 ID (d1, d2, ...)
  dealer2: string;
  dealer3: string;
}

// 거래처 마스터 데이터 (/admin/partners 페이지와 동일)
export const DELIVERY_PARTNERS: DeliveryPartner[] = [
  { id: 'p1', partnerNo: '10001', name: '맛있는정육점', businessNo: '123-45-67890', representative: '홍길동', phone: '02-1234-5678', address: '서울시 강남구 역삼동 123-45', businessType: '일반정육점', status: 'active', dealer1: 'd1', dealer2: '', dealer3: '' },
  { id: 'p2', partnerNo: '10002', name: '소고기천국', businessNo: '234-56-78901', representative: '이순신', phone: '02-2345-6789', address: '서울시 서초구 방배동 456-78', businessType: '음식점', status: 'active', dealer1: 'd1', dealer2: 'd2', dealer3: '' },
  { id: 'p3', partnerNo: '10003', name: '신선마트', businessNo: '345-67-89012', representative: '강감찬', phone: '02-3456-7890', address: '서울시 송파구 잠실동 789-12', businessType: '마트', status: 'inactive', dealer1: 'd1', dealer2: '', dealer3: '' },
  { id: 'p4', partnerNo: '10004', name: '한우명가', businessNo: '456-78-90123', representative: '김유신', phone: '031-1234-5678', address: '경기도 성남시 분당구 정자동 234-56', businessType: '음식점', status: 'active', dealer1: 'd2', dealer2: 'd5', dealer3: '' },
  { id: 'p5', partnerNo: '10005', name: '프리미엄정육', businessNo: '567-89-01234', representative: '을지문덕', phone: '031-2345-6789', address: '경기도 용인시 수지구 동천동 567-89', businessType: '일반정육점', status: 'active', dealer1: 'd2', dealer2: '', dealer3: '' },
  { id: 'p6', partnerNo: '10006', name: '고기굽는마을', businessNo: '678-90-12345', representative: '권율', phone: '043-1234-5678', address: '충북 음성군 음성읍 읍내리 123', businessType: '음식점', status: 'active', dealer1: 'd3', dealer2: '', dealer3: '' },
  { id: 'p7', partnerNo: '10007', name: '육미정', businessNo: '789-01-23456', representative: '장보고', phone: '02-4567-8901', address: '서울시 마포구 상암동 890-12', businessType: '음식점', status: 'active', dealer1: 'd5', dealer2: '', dealer3: '' },
  { id: 'p8', partnerNo: '10008', name: '한우촌', businessNo: '890-12-34567', representative: '최영', phone: '02-5678-9012', address: '서울시 영등포구 여의도동 345-67', businessType: '음식점', status: 'active', dealer1: 'd5', dealer2: '', dealer3: '' },
  { id: 'p9', partnerNo: '10009', name: '신선정육', businessNo: '901-23-45678', representative: '이성계', phone: '02-6789-0123', address: '서울시 종로구 종로동 678-90', businessType: '일반정육점', status: 'inactive', dealer1: 'd5', dealer2: '', dealer3: '' },
];

// 중도매인 ID로 해당 중도매인의 거래처만 필터링
export const getPartnersByDealer = (dealerId: string): DeliveryPartner[] => {
  return DELIVERY_PARTNERS.filter(p => 
    p.status === 'active' && (p.dealer1 === dealerId || p.dealer2 === dealerId || p.dealer3 === dealerId)
  );
};

// sessionStorage 키
const ASSIGNMENTS_STORAGE_KEY = 'delivery_partner_assignments';
const DELIVERY_STATUS_STORAGE_KEY = 'delivery_status';

// 거래처 지정 타입
export type PartnerAssignments = Record<string, string | null>;

// 출고 상태 타입
export type DeliveryStatus = 'pending' | 'shipped';

// 출고 상태 데이터 타입
export interface DeliveryStatusData {
  listingNo: string;
  status: DeliveryStatus;
  shippedAt?: string;
  shippedBy?: string;
}

// 출고 상태 저장소 타입
export type DeliveryStatusMap = Record<string, DeliveryStatusData>;

// 거래처 지정 저장
export const saveAssignments = (assignments: PartnerAssignments): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
};

// 거래처 지정 불러오기
export const loadAssignments = (): PartnerAssignments => {
  if (typeof window === 'undefined') return {};
  
  const stored = sessionStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
};

// 출고 상태 저장
export const saveDeliveryStatus = (statusMap: DeliveryStatusMap): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DELIVERY_STATUS_STORAGE_KEY, JSON.stringify(statusMap));
};

// 출고 상태 불러오기
export const loadDeliveryStatus = (): DeliveryStatusMap => {
  if (typeof window === 'undefined') return {};
  
  const stored = sessionStorage.getItem(DELIVERY_STATUS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
};

// 거래처 ID로 거래처 정보 가져오기
export const getPartnerById = (partnerId: string | null): DeliveryPartner | null => {
  if (!partnerId) return null;
  return DELIVERY_PARTNERS.find(p => p.id === partnerId || p.partnerNo === partnerId) || null;
};
