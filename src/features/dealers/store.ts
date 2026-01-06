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
      name: 'dealer-storage',
    }
  )
);

