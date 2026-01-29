'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AttachedFile {
  name: string;
  size: number;
  type: string;
}

export interface Dealer {
  id: string;
  name: string;
  contact: string;
  address: string;
  businessNo?: string;
  representative?: string;
  businessType?: string;
  businessCategory?: string;
  managerName?: string;
  managerContact?: string;
  managerEmail?: string;
  deliveryAddress?: string;
  businessLicense?: AttachedFile;
  reportCertificate?: AttachedFile;
  status: 'pending' | 'approved';
  createdAt: string;
}

interface DealerStore {
  dealers: Dealer[];
  addDealer: (dealer: Omit<Dealer, 'id' | 'status' | 'createdAt'>) => void;
  updateDealer: (id: string, updates: Partial<Dealer>) => void;
  removeDealer: (id: string) => void;
  getDealerById: (id: string) => Dealer | undefined;
  getApprovedDealers: () => Dealer[];
}

const initialDealers: Dealer[] = [
  { 
    id: '1', 
    name: '서울축산', 
    contact: '02-1234-5678', 
    address: '서울시 마포구 상암동 123', 
    businessNo: '123-45-67890', 
    representative: '김서울', 
    businessType: '도소매', 
    businessCategory: '축산물', 
    managerName: '김담당', 
    managerContact: '010-1234-5678', 
    managerEmail: 'kim@seoul.com', 
    deliveryAddress: '서울시 마포구 상암동 123-1', 
    status: 'approved', 
    createdAt: '25.01.02' 
  },
  { 
    id: '2', 
    name: '경기미트', 
    contact: '031-987-6543', 
    address: '경기도 수원시 팔달구 456', 
    businessNo: '234-56-78901', 
    representative: '이경기', 
    businessType: '도매', 
    businessCategory: '육류', 
    managerName: '이담당', 
    managerContact: '010-2345-6789', 
    managerEmail: 'lee@gyeonggi.com', 
    deliveryAddress: '경기도 수원시 팔달구 456-2', 
    status: 'approved', 
    createdAt: '25.01.01' 
  },
  { 
    id: '3', 
    name: '부산정육', 
    contact: '051-111-2222', 
    address: '부산시 해운대구 우동 789', 
    businessNo: '345-67-89012', 
    representative: '박부산', 
    businessType: '소매', 
    businessCategory: '정육', 
    managerName: '박담당', 
    managerContact: '010-3456-7890', 
    managerEmail: 'park@busan.com', 
    status: 'approved', 
    createdAt: '24.12.28' 
  },
  { 
    id: '4', 
    name: '대전한우', 
    contact: '042-333-4444', 
    address: '대전시 서구 둔산동 101', 
    businessNo: '456-78-90123', 
    representative: '최대전', 
    businessType: '도소매', 
    businessCategory: '한우전문', 
    status: 'pending', 
    createdAt: '24.12.25' 
  },
  { 
    id: '5', 
    name: '광주축산', 
    contact: '062-555-6666', 
    address: '광주시 북구 용봉동 202', 
    businessNo: '567-89-01234', 
    representative: '정광주', 
    businessType: '도매', 
    businessCategory: '축산물', 
    status: 'approved', 
    createdAt: '24.12.20' 
  },
  { 
    id: '6', 
    name: '강남정육점', 
    contact: '02-555-1234', 
    address: '서울시 강남구 역삼동 303', 
    businessNo: '678-90-12345', 
    representative: '홍강남', 
    businessType: '소매', 
    businessCategory: '정육', 
    status: 'approved', 
    createdAt: '24.12.18' 
  },
  { 
    id: '7', 
    name: '대한민국최고정육점', 
    contact: '02-777-8888', 
    address: '서울시 서초구 반포동 404', 
    businessNo: '789-01-23456', 
    representative: '박최고', 
    businessType: '도소매', 
    businessCategory: '한우/육류', 
    status: 'approved', 
    createdAt: '24.12.15' 
  },
  { 
    id: '8', 
    name: '인천미트센터', 
    contact: '032-456-7890', 
    address: '인천시 남동구 논현동 505', 
    businessNo: '890-12-34567', 
    representative: '강인천', 
    businessType: '도매', 
    businessCategory: '육류도매', 
    managerName: '강매니저', 
    managerContact: '010-4567-8901', 
    managerEmail: 'kang@incheon.com', 
    deliveryAddress: '인천시 남동구 논현동 505-1', 
    status: 'approved', 
    createdAt: '24.12.10' 
  },
  { 
    id: '9', 
    name: '울산한우명가', 
    contact: '052-234-5678', 
    address: '울산시 남구 삼산동 606', 
    businessNo: '901-23-45678', 
    representative: '윤울산', 
    businessType: '소매', 
    businessCategory: '한우전문', 
    managerName: '윤담당', 
    managerContact: '010-5678-9012', 
    managerEmail: 'yoon@ulsan.com', 
    status: 'approved', 
    createdAt: '24.12.08' 
  },
  { 
    id: '10', 
    name: '세종프리미엄정육', 
    contact: '044-111-2233', 
    address: '세종시 조치원읍 신흥리 707', 
    businessNo: '012-34-56789', 
    representative: '임세종', 
    businessType: '도소매', 
    businessCategory: '프리미엄육류', 
    managerName: '임매니저', 
    managerContact: '010-6789-0123', 
    managerEmail: 'lim@sejong.com', 
    deliveryAddress: '세종시 조치원읍 신흥리 707-2', 
    status: 'approved', 
    createdAt: '24.12.05' 
  },
  { 
    id: '11', 
    name: '제주흑우마켓', 
    contact: '064-777-8899', 
    address: '제주시 노형동 808', 
    businessNo: '123-56-78901', 
    representative: '오제주', 
    businessType: '소매', 
    businessCategory: '제주흑우', 
    managerName: '오담당', 
    managerContact: '010-7890-1234', 
    managerEmail: 'oh@jeju.com', 
    status: 'approved', 
    createdAt: '24.12.01' 
  },
  { 
    id: '12', 
    name: '강원산지직송', 
    contact: '033-456-1234', 
    address: '강원도 춘천시 효자동 909', 
    businessNo: '234-67-89012', 
    representative: '한강원', 
    businessType: '도매', 
    businessCategory: '산지직송', 
    managerName: '한매니저', 
    managerContact: '010-8901-2345', 
    managerEmail: 'han@gangwon.com', 
    deliveryAddress: '강원도 춘천시 효자동 909-1', 
    status: 'approved', 
    createdAt: '24.11.28' 
  },
  { 
    id: '13', 
    name: '충남축산유통', 
    contact: '041-333-5566', 
    address: '충남 천안시 서북구 불당동 1010', 
    businessNo: '345-78-90123', 
    representative: '서충남', 
    businessType: '도소매', 
    businessCategory: '축산유통', 
    managerName: '서담당', 
    managerContact: '010-9012-3456', 
    managerEmail: 'seo@chungnam.com', 
    status: 'approved', 
    createdAt: '24.11.25' 
  },
  { 
    id: '14', 
    name: '전북한우랜드', 
    contact: '063-222-4455', 
    address: '전북 전주시 완산구 효자동 1111', 
    businessNo: '456-89-01234', 
    representative: '김전북', 
    businessType: '도매', 
    businessCategory: '한우전문', 
    managerName: '김담당', 
    managerContact: '010-0123-4567', 
    managerEmail: 'kim@jeonbuk.com', 
    deliveryAddress: '전북 전주시 완산구 효자동 1111-1', 
    status: 'approved', 
    createdAt: '24.11.20' 
  },
  { 
    id: '15', 
    name: '경북청정한우', 
    contact: '054-888-9900', 
    address: '경북 포항시 남구 오천읍 1212', 
    businessNo: '567-90-12345', 
    representative: '이경북', 
    businessType: '소매', 
    businessCategory: '청정한우', 
    managerName: '이매니저', 
    managerContact: '010-1234-5670', 
    managerEmail: 'lee@gyeongbuk.com', 
    status: 'approved', 
    createdAt: '24.11.15' 
  },
  { 
    id: '16', 
    name: '경남프리미엄미트', 
    contact: '055-444-6677', 
    address: '경남 창원시 성산구 상남동 1313', 
    businessNo: '678-01-23456', 
    representative: '박경남', 
    businessType: '도소매', 
    businessCategory: '프리미엄육류', 
    managerName: '박담당', 
    managerContact: '010-2345-6780', 
    managerEmail: 'park@gyeongnam.com', 
    deliveryAddress: '경남 창원시 성산구 상남동 1313-2', 
    status: 'approved', 
    createdAt: '24.11.10' 
  },
  { 
    id: '17', 
    name: '충북명품한우', 
    contact: '043-555-7788', 
    address: '충북 청주시 흥덕구 복대동 1414', 
    businessNo: '789-12-34567', 
    representative: '최충북', 
    businessType: '소매', 
    businessCategory: '명품한우', 
    managerName: '최매니저', 
    managerContact: '010-3456-7891', 
    managerEmail: 'choi@chungbuk.com', 
    status: 'approved', 
    createdAt: '24.11.05' 
  },
];

export const useDealerStore = create<DealerStore>()(
  persist(
    (set, get) => ({
      dealers: initialDealers,
      
      addDealer: (dealerData) => {
        const newDealer: Dealer = {
          ...dealerData,
          id: Date.now().toString(),
          status: 'pending',
          createdAt: new Date().toLocaleDateString('ko-KR', { 
            year: '2-digit', 
            month: '2-digit', 
            day: '2-digit' 
          }).replace(/\. /g, '.').replace('.', ''),
        };
        set((state) => ({
          dealers: [newDealer, ...state.dealers],
        }));
      },
      
      updateDealer: (id, updates) => {
        set((state) => ({
          dealers: state.dealers.map((dealer) =>
            dealer.id === id ? { ...dealer, ...updates } : dealer
          ),
        }));
      },
      
      removeDealer: (id) => {
        set((state) => ({
          dealers: state.dealers.filter((dealer) => dealer.id !== id),
        }));
      },
      
      getDealerById: (id) => {
        return get().dealers.find((dealer) => dealer.id === id);
      },
      
      getApprovedDealers: () => {
        return get().dealers.filter((dealer) => dealer.status === 'approved');
      },
    }),
    {
      name: 'dealer-storage-v2',
    }
  )
);

