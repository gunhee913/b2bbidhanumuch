'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save, Upload, X, Plus, ChevronDown, ChevronUp, Trash2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';

import * as XLSX from 'xlsx';
import { useCreateListing } from '@/features/listings/hooks';
import { useCompanies } from '@/features/companies/hooks';
import { CreateListingInput, CreatePartInput } from '@/features/listings/types';
import { uploadImage } from '@/lib/upload';

// number input 스피너, date input 달력 아이콘 숨기기 스타일
const hideSpinnerStyle = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

// 부위 데이터 타입
interface PartData {
  id: number;
  name: string;
  weight: string;
  minPrice: string;
  isIncluded: boolean; // 등록 포함 여부
}

// 증명서 데이터 타입
interface CertificateData {
  fileName: string;
  fileData: string; // base64
  fileType: string; // 'image' | 'pdf'
}

// 개체 데이터 타입
interface CattleData {
  id: number;
  seqNo: string;
  breed: string;
  gender: string;
  grade: string;
  marbling: string;
  monthAge: string;
  carcassWeight: string;
  unitPrice: string;
  traceNo: string;
  backFat: string;
  eyeMuscle: string;
  fatMarbling: string;
  meatColor: string;
  fatColor: string;
  texture: string;
  maturity: string;
  slaughterHouse: string;
  slaughterDate: string;
  slaughterNo: string;
  processDate: string;
  processWeight: string;
  parts: PartData[];
  images: string[];
  slaughterCert: CertificateData | null; // 도축검사증명서
  gradeCert: CertificateData | null;     // 등급판정확인서
  isExpanded: boolean;
}

// 기본 20개 부위 생성
const createDefaultParts = (): PartData[] => [
  { id: 1, name: '등심(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 2, name: '등심(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 3, name: '안심', weight: '', minPrice: '', isIncluded: true },
  { id: 4, name: '채끝', weight: '', minPrice: '', isIncluded: true },
  { id: 5, name: '치마', weight: '', minPrice: '', isIncluded: true },
  { id: 6, name: '부채', weight: '', minPrice: '', isIncluded: true },
  { id: 7, name: '업진', weight: '', minPrice: '', isIncluded: true },
  { id: 8, name: '토시·제비', weight: '', minPrice: '', isIncluded: true },
  { id: 9, name: '설도(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 10, name: '설도(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 11, name: '앞다리', weight: '', minPrice: '', isIncluded: true },
  { id: 12, name: '우둔', weight: '', minPrice: '', isIncluded: true },
  { id: 13, name: '목심', weight: '', minPrice: '', isIncluded: true },
  { id: 14, name: '양지(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 15, name: '양지(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 16, name: '사태', weight: '', minPrice: '', isIncluded: true },
  { id: 17, name: '꼬리', weight: '', minPrice: '', isIncluded: true },
  { id: 18, name: '족', weight: '', minPrice: '', isIncluded: true },
  { id: 19, name: '사골', weight: '', minPrice: '', isIncluded: true },
  { id: 20, name: '잡뼈', weight: '', minPrice: '', isIncluded: true },
];

// 새 개체 생성
const createNewCattle = (id: number, seqNo: string): CattleData => ({
  id,
  seqNo,
  breed: '한우',
  gender: '',
  grade: '',
  marbling: '',
  monthAge: '',
  carcassWeight: '',
  unitPrice: '',
  traceNo: '',
  backFat: '',
  eyeMuscle: '',
  fatMarbling: '',
  meatColor: '',
  fatColor: '',
  texture: '',
  maturity: '',
  slaughterHouse: '농협 음성',
  slaughterDate: '',
  slaughterNo: '',
  processDate: '',
  processWeight: '',
  parts: createDefaultParts(),
  images: [],
  slaughterCert: null,
  gradeCert: null,
  isExpanded: true,
});


const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateString = getTodayDateString();

export default function NewAuctionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 업체 목록 조회
  const { data: companiesData } = useCompanies();
  const companies = useMemo(() => {
    return companiesData?.map(c => ({ id: c.id, name: c.name, companyNo: c.companyNo })) || [];
  }, [companiesData]);
  
  // 상장 등록 mutation
  const createListing = useCreateListing();
  
  // 공통 정보
  const [listingDate, setListingDate] = useState(todayDateString);
  const [companyId, setCompanyId] = useState('');
  
  // 마감 여부 상태
  const [isDateClosed, setIsDateClosed] = useState(false);
  
  // 날짜 변경 시 마감 여부 확인
  useEffect(() => {
    const checkClosed = async () => {
      if (!listingDate) {
        setIsDateClosed(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/auctions/check-closed?date=${listingDate}`);
        if (response.ok) {
          const data = await response.json();
          setIsDateClosed(data.isClosed);
        }
      } catch (error) {
        console.error('마감 여부 확인 실패:', error);
        setIsDateClosed(false);
      }
    };
    
    checkClosed();
  }, [listingDate]);
  
  // 선택된 업체 정보
  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === companyId);
  }, [companies, companyId]);
  
  // 다음 순번 (DB에서 조회)
  const [startSeq, setStartSeq] = useState<number>(1);
  
  // 다음 순번 조회
  const fetchNextSeq = useCallback(async () => {
    if (!companyId || !listingDate) {
      setStartSeq(1);
      return;
    }
    
    try {
      const response = await fetch(
        `/api/listings/next-seq?companyId=${companyId}&listingDate=${listingDate}`
      );
      if (response.ok) {
        const data = await response.json();
        // nextSeq에서 업체번호 prefix를 제외한 순번만 추출 (203 → 3)
        const companyNoPrefix = data.companyNoPrefix;
        const seqOnly = data.nextSeq - parseInt(`${companyNoPrefix}00`);
        setStartSeq(seqOnly);
      }
    } catch (error) {
      console.error('다음 순번 조회 실패:', error);
    }
  }, [companyId, listingDate]);
  
  // 업체/날짜 변경 시 다음 순번 조회
  useEffect(() => {
    fetchNextSeq();
  }, [fetchNextSeq]);
  
  // 이미지 확대 모달
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // 개체 목록 (startSeq 기반으로 초기화)
  const [cattleList, setCattleList] = useState<CattleData[]>([
    createNewCattle(1, '1')
  ]);
  
  // startSeq 변경 시 개체 목록 순번 업데이트
  useEffect(() => {
    setCattleList(prev => prev.map((cattle, index) => ({
      ...cattle,
      seqNo: String(startSeq + index),
    })));
  }, [startSeq]);

  // 상장일자 기반 날짜 코드 생성 (YYMMDD)
  const getDateCode = () => {
    if (!listingDate) return '';
    const date = new Date(listingDate);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 접수번호 생성 (업체번호 첫자리 + 순번)
  // 예: 대구축협(업체번호 200), 순번 3 → 260205-203
  const getAuctionNo = (seqNo: string) => {
    if (!selectedCompany) return '-';
    const dateCode = getDateCode();
    const companyNoPrefix = selectedCompany.companyNo.charAt(0); // 업체번호 첫자리 (200 → 2)
    const fullSeq = parseInt(`${companyNoPrefix}00`) + parseInt(seqNo || '1');
    return `${dateCode}-${fullSeq}`;
  };

  // 상장번호 생성 (접수번호 + 부위번호)
  // 예: 260205-203-01
  const getListingNo = (seqNo: string, partIndex: number) => {
    if (!selectedCompany) return '-';
    const dateCode = getDateCode();
    const companyNoPrefix = selectedCompany.companyNo.charAt(0);
    const fullSeq = parseInt(`${companyNoPrefix}00`) + parseInt(seqNo || '1');
    return `${dateCode}-${fullSeq}-${String(partIndex + 1).padStart(2, '0')}`;
  };

  // 이력번호 포맷팅
  const formatTraceNo = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 8) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 9)}`;
  };

  // 개체 추가
  const addCattle = () => {
    if (cattleList.length >= 10) {
      alert('최대 10두까지 등록할 수 있습니다.');
      return;
    }
    const newSeqNo = String(startSeq + cattleList.length);
    setCattleList([...cattleList, createNewCattle(Date.now(), newSeqNo)]);
  };

  // 개체 삭제
  const removeCattle = (id: number) => {
    if (cattleList.length === 1) {
      alert('최소 1두는 등록해야 합니다.');
      return;
    }
    const newList = cattleList.filter(c => c.id !== id);
    // 순번 재정렬 (startSeq 기반)
    setCattleList(newList.map((c, idx) => ({ ...c, seqNo: String(startSeq + idx) })));
  };

  // 개체 정보 수정
  const updateCattle = (id: number, field: keyof CattleData, value: string | boolean) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== id) return c;
      if (field === 'grade' && !String(value).startsWith('1++')) {
        return { ...c, [field]: String(value), marbling: '' };
      }
      if (field === 'traceNo') {
        return { ...c, [field]: formatTraceNo(String(value)) };
      }
      if (field === 'isExpanded') {
        return { ...c, [field]: Boolean(value) };
      }
      return { ...c, [field]: String(value) };
    }));
  };

  // 부위 정보 수정
  const updatePart = (cattleId: number, partId: number, field: 'weight' | 'minPrice', value: string) => {
    // 최저가격은 콤마 제거하고 숫자만 저장
    const cleanValue = field === 'minPrice' ? value.replace(/,/g, '').replace(/[^0-9]/g, '') : value;
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return {
        ...c,
        parts: c.parts.map(p => p.id === partId ? { ...p, [field]: cleanValue } : p)
      };
    }));
  };

  // 부위 포함/제외 토글
  const togglePartIncluded = (cattleId: number, partId: number) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return {
        ...c,
        parts: c.parts.map(p => p.id === partId ? { ...p, isIncluded: !p.isIncluded } : p)
      };
    }));
  };
  
  // 가격 표시용 포맷 (천단위 콤마)
  const displayPrice = (value: string) => {
    if (!value) return '';
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('ko-KR');
  };

  // 접기/펼치기
  const toggleExpand = (id: number) => {
    setCattleList(cattleList.map(c => 
      c.id === id ? { ...c, isExpanded: !c.isExpanded } : c
    ));
  };

  // 이미지 업로드 중 상태
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});

  // 이미지 업로드 ref
  const imageInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // 이미지 업로드 처리 (Storage 사용)
  const handleImageUpload = async (cattleId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const cattle = cattleList.find(c => c.id === cattleId);
    if (!cattle) return;

    const remainingSlots = 4 - cattle.images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    // 업로드 중 상태 설정
    setUploadingImages(prev => ({ ...prev, [cattleId]: true }));

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        continue;
      }

      try {
        // Base64로 변환
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Storage에 업로드
        const url = await uploadImage(base64, 'listings');
        
        if (url) {
          setCattleList(prev => prev.map(c => {
            if (c.id !== cattleId) return c;
            if (c.images.length >= 4) return c;
            return { ...c, images: [...c.images, url] };
          }));
        }
      } catch (error) {
        console.error('이미지 업로드 오류:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    }

    // 업로드 완료
    setUploadingImages(prev => ({ ...prev, [cattleId]: false }));
    e.target.value = '';
  };

  // 이미지 삭제
  const removeImage = (cattleId: number, index: number) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return { ...c, images: c.images.filter((_, i) => i !== index) };
    }));
  };

  // 증명서 업로드 ref
  const slaughterCertInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const gradeCertInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // 증명서 업로드 중 상태
  const [uploadingCerts, setUploadingCerts] = useState<{ [key: string]: boolean }>({});

  // 증명서 업로드 처리 (Storage 사용)
  const handleCertUpload = async (
    cattleId: number, 
    certType: 'slaughterCert' | 'gradeCert', 
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 가능합니다.');
      e.target.value = '';
      return;
    }

    // 파일 형식 확인 (이미지만)
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      e.target.value = '';
      return;
    }

    const uploadKey = `${cattleId}-${certType}`;
    setUploadingCerts(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // Base64로 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Storage에 업로드
      const url = await uploadImage(base64, 'certificates');
      
      if (url) {
        const certData: CertificateData = {
          fileName: file.name,
          fileData: url, // URL 저장
          fileType: 'image'
        };
        
        setCattleList(prev => prev.map(c => {
          if (c.id !== cattleId) return c;
          return { ...c, [certType]: certData };
        }));
      }
    } catch (error) {
      console.error('증명서 업로드 오류:', error);
      alert('증명서 업로드에 실패했습니다.');
    }

    setUploadingCerts(prev => ({ ...prev, [uploadKey]: false }));
    e.target.value = '';
  };

  // 증명서 삭제
  const removeCert = (cattleId: number, certType: 'slaughterCert' | 'gradeCert') => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return { ...c, [certType]: null };
    }));
  };

  // 증명서 열기 (모달로 크게 보기)
  const openCert = (cert: CertificateData) => {
    setViewingImage(cert.fileData);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      alert('상장업체를 선택해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 각 개체별로 상장 등록
      for (const cattle of cattleList) {
        // 부위 데이터 변환
        const parts: CreatePartInput[] = cattle.parts
          .filter(part => part.isIncluded)
          .map((part, index) => ({
            partNo: index + 1,
            partName: part.name,
            weight: parseFloat(part.weight) || 0,
            minPrice: parseInt(part.minPrice.replace(/,/g, '')) || 0,
            isIncluded: part.isIncluded,
          }));

        // 상장 데이터 생성
        const listingInput: CreateListingInput = {
          listingDate,
          companyId,
          breed: cattle.breed,
          gender: cattle.gender,
          grade: cattle.grade,
          marblingScore: parseInt(cattle.fatMarbling) || null,
          monthAge: parseInt(cattle.monthAge) || null,
          carcassWeight: parseFloat(cattle.carcassWeight) || null,
          unitPrice: parseInt(cattle.unitPrice) || null,
          traceNo: cattle.traceNo || null,
          backFat: parseFloat(cattle.backFat) || null,
          eyeMuscle: parseFloat(cattle.eyeMuscle) || null,
          meatColor: parseInt(cattle.meatColor) || null,
          fatColor: parseInt(cattle.fatColor) || null,
          texture: parseInt(cattle.texture) || null,
          maturity: parseInt(cattle.maturity) || null,
          slaughterHouse: cattle.slaughterHouse || null,
          slaughterDate: cattle.slaughterDate || null,
          slaughterNo: cattle.slaughterNo || null,
          processDate: cattle.processDate || null,
          processWeight: parseFloat(cattle.processWeight) || null,
          images: cattle.images,
          slaughterCert: cattle.slaughterCert ? {
            fileName: cattle.slaughterCert.fileName,
            fileData: cattle.slaughterCert.fileData,
            fileType: cattle.slaughterCert.fileType,
          } : null,
          gradeCert: cattle.gradeCert ? {
            fileName: cattle.gradeCert.fileName,
            fileData: cattle.gradeCert.fileData,
            fileType: cattle.gradeCert.fileType,
          } : null,
          parts,
        };

        await createListing.mutateAsync(listingInput);
      }

      alert(`${cattleList.length}두 상장 등록이 완료되었습니다.`);
      setCattleList([createNewCattle(1, String(startSeq + cattleList.length))]);
      fetchNextSeq();
    } catch (error) {
      console.error('상장 등록 실패:', error);
      alert('상장 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 숫자 천단위 콤마 포맷
  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  
  // 콤마 제거하고 숫자로 파싱
  const parseNumber = (str: string) => String(str).replace(/,/g, '');

  // 엑셀 템플릿 다운로드
  const downloadExcelTemplate = () => {
    const cattleHeaders = [
      '순번', '축종', '성별', '등급', '근내지방등급', '개월령', '도체중', '경락단가(원/kg)', '이력번호',
      '등지방', '등심면적', '근내지방', '육색', '지방색', '조직감', '성숙도',
      '도축장', '도축일', '도축번호', '가공일', '가공중량'
    ];

    const sampleCattleData = [
      ['1', '한우', '거세', '1++A', '9', '32', '520', '28000', '0023-4567-8', '15', '98', '9', '5', '3', '1', '2', '음성', '2026-01-15', '201', '2026-01-16', '312'],
      ['2', '한우', '거세', '1+A',  '7', '30', '490', '25000', '0023-4567-9', '13', '94', '7', '5', '3', '1', '2', '음성', '2026-01-15', '202', '2026-01-16', '295'],
      ['3', '한우', '암',   '1A',   '5', '28', '440', '20000', '0023-4568-0', '11', '88', '5', '4', '3', '1', '2', '음성', '2026-01-15', '203', '2026-01-16', '264'],
      ['4', '한우', '거세', '1++B', '8', '34', '530', '27000', '0023-4568-1', '14', '96', '8', '5', '3', '1', '2', '음성', '2026-01-15', '204', '2026-01-16', '318'],
      ['5', '한우', '거세', '2A',   '3', '26', '410', '18000', '0023-4568-2', '10', '82', '3', '4', '3', '1', '2', '음성', '2026-01-15', '205', '2026-01-16', '246'],
    ];

    const cattleSheet = XLSX.utils.aoa_to_sheet([cattleHeaders, ...sampleCattleData]);
    cattleSheet['!cols'] = cattleHeaders.map(() => ({ wch: 12 }));

    // 부위별 기준 데이터: [부위명, 기준가(1++), 최소중량, 최대중량]
    const partBase: [string, number, number, number][] = [
      ['등심(좌)',   95000,  9.5, 10.5],
      ['등심(우)',   95000,  9.5, 10.5],
      ['안심',      105000,  8.0,  9.0],
      ['채끝',       90000, 11.0, 12.0],
      ['치마',       95000,  2.0,  4.0],
      ['부채',      110000,  3.5,  4.5],
      ['업진',      100000,  2.0,  3.0],
      ['토시·제비',   95000,  1.5,  2.5],
      ['설도(좌)',   25000, 11.0, 11.5],
      ['설도(우)',   25000, 11.0, 11.5],
      ['앞다리',     35000, 32.0, 34.0],
      ['우둔',       23000, 25.0, 28.0],
      ['목심',       25000, 18.0, 20.0],
      ['양지(좌)',   45000,  6.8,  7.3],
      ['양지(우)',   45000,  6.8,  7.3],
      ['사태',       23000, 18.0, 21.0],
      ['꼬리',        4500, 19.0, 20.0],
      ['족',          3000, 10.0, 12.0],
      ['사골',        1500, 25.0, 27.0],
      ['잡뼈',        1000, 24.0, 26.0],
    ];

    // 등급별 가격 보정 비율
    const gradeMultipliers = [1.0, 0.90, 0.75, 1.0, 0.60];

    // 개체별 +-5% 변동 시드 (결정적 데이터)
    const variationSeeds = [
      [1.02, 0.97, 1.04, 0.98, 1.01, 0.96, 1.03, 0.99, 1.02, 0.97, 1.04, 0.98, 1.01, 0.96, 1.03, 0.99, 1.02, 0.97, 1.04, 0.98],
      [0.98, 1.03, 0.96, 1.02, 0.97, 1.04, 0.98, 1.01, 0.97, 1.03, 0.96, 1.02, 0.98, 1.04, 0.97, 1.01, 0.98, 1.03, 0.96, 1.02],
      [1.01, 0.95, 1.03, 0.97, 1.05, 0.98, 0.96, 1.02, 1.01, 0.95, 1.03, 0.97, 1.05, 0.98, 0.96, 1.02, 1.01, 0.95, 1.03, 0.97],
      [0.97, 1.04, 0.98, 1.03, 0.96, 1.01, 1.05, 0.97, 0.98, 1.04, 0.97, 1.03, 0.96, 1.01, 1.05, 0.97, 0.98, 1.04, 0.97, 1.03],
      [1.03, 0.98, 1.01, 0.96, 1.04, 0.97, 1.02, 1.05, 1.03, 0.98, 1.01, 0.96, 1.04, 0.97, 1.02, 1.05, 1.03, 0.98, 1.01, 0.96],
    ];

    // 중량 시드 (0~1 범위, 최소~최대 범위 내 위치)
    const weightSeeds = [
      [0.5, 0.6, 0.4, 0.7, 0.3, 0.8, 0.5, 0.6, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4, 0.5],
      [0.3, 0.7, 0.5, 0.4, 0.6, 0.3, 0.7, 0.4, 0.6, 0.3, 0.7, 0.5, 0.4, 0.6, 0.3, 0.7, 0.5, 0.4, 0.6, 0.3],
      [0.7, 0.3, 0.6, 0.5, 0.4, 0.7, 0.3, 0.5, 0.7, 0.4, 0.3, 0.6, 0.5, 0.7, 0.4, 0.3, 0.6, 0.5, 0.7, 0.4],
      [0.4, 0.8, 0.3, 0.6, 0.7, 0.4, 0.6, 0.3, 0.5, 0.8, 0.4, 0.7, 0.3, 0.5, 0.8, 0.4, 0.7, 0.3, 0.5, 0.6],
      [0.6, 0.4, 0.7, 0.3, 0.5, 0.6, 0.4, 0.7, 0.3, 0.5, 0.6, 0.4, 0.7, 0.3, 0.5, 0.6, 0.4, 0.7, 0.3, 0.7],
    ];

    const roundTo1000 = (v: number) => Math.round(v / 1000) * 1000;

    const partHeaders = ['순번', '부위명', '중량(kg)', '최저가격(원)'];
    const samplePartData: string[][] = [];

    for (let ci = 0; ci < 5; ci++) {
      const mult = gradeMultipliers[ci];
      for (let pi = 0; pi < partBase.length; pi++) {
        const [name, basePrice, minW, maxW] = partBase[pi];
        const price = roundTo1000(basePrice * mult * variationSeeds[ci][pi]);
        const weight = minW + (maxW - minW) * weightSeeds[ci][pi];
        samplePartData.push([
          String(ci + 1),
          name,
          weight.toFixed(1),
          formatNumber(price),
        ]);
      }
    }

    const partsSheet = XLSX.utils.aoa_to_sheet([partHeaders, ...samplePartData]);
    partsSheet['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, cattleSheet, '개체정보');
    XLSX.utils.book_append_sheet(workbook, partsSheet, '부위별정보');

    XLSX.writeFile(workbook, '부분육_상장등록_템플릿.xlsx');
  };

  // 엑셀 파일 업로드 ref
  const excelInputRef = useRef<HTMLInputElement>(null);

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // 개체정보 시트 파싱
        const cattleSheet = workbook.Sheets['개체정보'];
        if (!cattleSheet) {
          alert('개체정보 시트를 찾을 수 없습니다.');
          return;
        }
        const cattleData = XLSX.utils.sheet_to_json<Record<string, string>>(cattleSheet);

        // 부위별정보 시트 파싱
        const partsSheet = workbook.Sheets['부위별정보'];
        if (!partsSheet) {
          alert('부위별정보 시트를 찾을 수 없습니다.');
          return;
        }
        const partsData = XLSX.utils.sheet_to_json<Record<string, string>>(partsSheet);

        // 개체별로 그룹핑
        const newCattleList: CattleData[] = cattleData.map((row, index) => {
          const seqNo = String(row['순번'] || index + 1);
          const cattle = createNewCattle(Date.now() + index, seqNo);
          
          // 개체 정보 매핑
          cattle.breed = row['축종'] || '한우';
          cattle.gender = row['성별'] || '';
          cattle.grade = row['등급'] || '';
          cattle.marbling = row['근내지방등급'] || '';
          cattle.monthAge = row['개월령'] || '';
          cattle.carcassWeight = row['도체중'] || '';
          cattle.unitPrice = String(row['경락단가(원/kg)'] || '').replace(/,/g, '');
          cattle.traceNo = formatTraceNo(row['이력번호'] || '');
          cattle.backFat = row['등지방'] || '';
          cattle.eyeMuscle = row['등심면적'] || '';
          cattle.fatMarbling = row['근내지방'] || '';
          cattle.meatColor = row['육색'] || '';
          cattle.fatColor = row['지방색'] || '';
          cattle.texture = row['조직감'] || '';
          cattle.maturity = row['성숙도'] || '';
          cattle.slaughterHouse = '농협 음성';
          cattle.slaughterDate = row['도축일'] || '';
          cattle.slaughterNo = row['도축번호'] || '';
          cattle.processDate = row['가공일'] || '';
          cattle.processWeight = row['가공중량'] || '';

          // 해당 개체의 부위 정보 찾기
          const cattleParts = partsData.filter(p => String(p['순번']) === seqNo);
          if (cattleParts.length > 0) {
            cattle.parts = cattle.parts.map(part => {
              const partData = cattleParts.find(p => p['부위명'] === part.name);
              if (partData) {
                return {
                  ...part,
                  weight: parseNumber(String(partData['중량(kg)'] || '')),
                  minPrice: parseNumber(String(partData['최저가격(원)'] || '')),
                };
              }
              return part;
            });
          }

          return cattle;
        });

        if (newCattleList.length === 0) {
          alert('업로드할 개체 데이터가 없습니다.');
          return;
        }

        if (newCattleList.length > 10) {
          alert('최대 10두까지만 등록할 수 있습니다. 처음 10두만 등록됩니다.');
          setCattleList(newCattleList.slice(0, 10));
        } else {
          setCattleList(newCattleList);
        }

        alert(`${Math.min(newCattleList.length, 10)}두의 데이터를 불러왔습니다.`);
      } catch (error) {
        console.error('엑셀 파싱 오류:', error);
        alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 템플릿 형식을 확인해주세요.');
      }
    };

    reader.readAsArrayBuffer(file);
    // 같은 파일 다시 선택 가능하도록 초기화
    e.target.value = '';
  };

  // 공통 스타일
  const thClass = "px-2 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-2 text-xs border border-gray-200 text-center";
  const selectClass = "w-full px-2 py-1 border border-gray-200 text-xs text-center outline-none bg-white";
  const inputClass = "px-2 py-1 border border-gray-200 text-xs text-center outline-none bg-white";

  return (
    <AdminLayout>
      <style dangerouslySetInnerHTML={{ __html: hideSpinnerStyle }} />
      
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">부분육상장등록</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{cattleList.length}두</span>
          <span>/ 최대 10두</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 공통 정보 */}
        <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">상장일자</span>
                <input
                  type="date"
                  value={listingDate}
                  onChange={(e) => setListingDate(e.target.value)}
                  required
                  className={`px-3 py-1.5 border text-xs outline-none bg-white ${isDateClosed ? 'border-red-500 text-red-500' : 'border-gray-200'}`}
                />
                {isDateClosed && (
                  <span className="text-xs text-red-500 font-medium">마감된 날짜입니다</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">상장업체</span>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  required
                  className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[120px]"
                >
                  <option value="">선택</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 엑셀 업로드/다운로드 및 등록 버튼 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
                템플릿 다운로드
              </button>
              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                엑셀 업로드
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <button 
                type="submit" 
                disabled={isSubmitting || isDateClosed} 
                className={`flex items-center gap-1.5 px-4 py-1.5 text-white text-xs disabled:opacity-50 ${isDateClosed ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800'}`}
                title={isDateClosed ? '마감된 날짜에는 등록할 수 없습니다' : ''}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    등록 중...
                  </>
                ) : isDateClosed ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    마감됨 (등록 불가)
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {cattleList.length}두 일괄 등록
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 개체 목록 */}
        {cattleList.map((cattle, cattleIndex) => (
          <div key={cattle.id} className="bg-white shadow-sm border border-gray-100 mb-4 overflow-hidden">
            {/* 개체 헤더 */}
            <div 
              className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleExpand(cattle.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 bg-gray-700 text-white text-sm font-bold">
                  {cattleIndex + 1}
                </span>
                <span className="font-medium text-gray-900">
                  {cattle.gender || '성별'} / {cattle.grade || '등급'}{cattle.marbling ? `(${cattle.marbling})` : ''} / {cattle.traceNo || '이력번호'}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5">
                  접수번호: {getAuctionNo(cattle.seqNo)}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5">
                  부위: {cattle.parts.filter(p => p.isIncluded).length}/{cattle.parts.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cattleList.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeCattle(cattle.id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                )}
                {cattle.isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </div>

            {/* 개체 내용 (접기/펼치기) */}
            {cattle.isExpanded && (
              <div className="p-4 space-y-4">
                {/* 개체 정보 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className={`${thClass} w-16`}>순번</th>
                        <th className={`${thClass} w-28`}>접수번호</th>
                        <th className={`${thClass} w-20`}>축종</th>
                        <th className={`${thClass} w-20`}>성별</th>
                        <th className={`${thClass} w-24`}>등급</th>
                        <th className={`${thClass} w-20`}>근내지방</th>
                        <th className={`${thClass} w-20`}>개월령</th>
                        <th className={`${thClass} w-20`}>도체중</th>
                        <th className={`${thClass} w-28`}>경락단가</th>
                        <th className={`${thClass} w-36`}>이력번호</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={`${tdClass} font-medium bg-gray-50`}>{cattle.seqNo}</td>
                        <td className={`${tdClass} font-medium text-gray-900 bg-gray-100`}>{getAuctionNo(cattle.seqNo)}</td>
                        <td className={tdClass}>
                          <select value={cattle.breed} onChange={(e) => updateCattle(cattle.id, 'breed', e.target.value)} className={selectClass}>
                            <option value="한우">한우</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.gender} onChange={(e) => updateCattle(cattle.id, 'gender', e.target.value)} required className={selectClass}>
                            <option value="">선택</option>
                            <option value="거세">거세</option>
                            <option value="암">암</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.grade} onChange={(e) => updateCattle(cattle.id, 'grade', e.target.value)} required className={selectClass}>
                            <option value="">선택</option>
                            <option value="1++A">1++A</option>
                            <option value="1++B">1++B</option>
                            <option value="1++C">1++C</option>
                            <option value="1+A">1+A</option>
                            <option value="1+B">1+B</option>
                            <option value="1+C">1+C</option>
                            <option value="1A">1A</option>
                            <option value="1B">1B</option>
                            <option value="1C">1C</option>
                            <option value="2A">2A</option>
                            <option value="2B">2B</option>
                            <option value="2C">2C</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.marbling} onChange={(e) => updateCattle(cattle.id, 'marbling', e.target.value)} disabled={!cattle.grade.startsWith('1++')} className={`${selectClass} disabled:bg-gray-100`}>
                            <option value="">-</option>
                            <option value="9">9</option>
                            <option value="8">8</option>
                            <option value="7">7</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.monthAge} onChange={(e) => updateCattle(cattle.id, 'monthAge', e.target.value)} placeholder="32" required className={`w-14 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.carcassWeight} onChange={(e) => updateCattle(cattle.id, 'carcassWeight', e.target.value)} placeholder="520" required className={`w-14 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" value={displayPrice(cattle.unitPrice)} onChange={(e) => updateCattle(cattle.id, 'unitPrice', e.target.value.replace(/,/g, '').replace(/[^0-9]/g, ''))} placeholder="0" className={`w-20 ${inputClass}`} />
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">원/kg</span>
                          </div>
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-gray-500">002-</span>
                            <input type="text" value={cattle.traceNo} onChange={(e) => updateCattle(cattle.id, 'traceNo', e.target.value)} placeholder="0000-0000-0" maxLength={11} required className={`w-28 ${inputClass}`} />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 등급 판정 + 도축/가공 정보 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className={thClass}>등지방</th>
                        <th className={thClass}>등심면적</th>
                        <th className={thClass}>근내지방</th>
                        <th className={thClass}>육색</th>
                        <th className={thClass}>지방색</th>
                        <th className={thClass}>조직감</th>
                        <th className={thClass}>성숙도</th>
                        <th className={thClass}>도축장</th>
                        <th className={thClass}>도축일</th>
                        <th className={thClass}>도축번호</th>
                        <th className={thClass}>가공일</th>
                        <th className={thClass}>가공중량</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={tdClass}>
                          <input type="number" value={cattle.backFat} onChange={(e) => updateCattle(cattle.id, 'backFat', e.target.value)} placeholder="15" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.eyeMuscle} onChange={(e) => updateCattle(cattle.id, 'eyeMuscle', e.target.value)} placeholder="98" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.fatMarbling} onChange={(e) => updateCattle(cattle.id, 'fatMarbling', e.target.value)} placeholder="9" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.meatColor} onChange={(e) => updateCattle(cattle.id, 'meatColor', e.target.value)} placeholder="5" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.fatColor} onChange={(e) => updateCattle(cattle.id, 'fatColor', e.target.value)} placeholder="3" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.texture} onChange={(e) => updateCattle(cattle.id, 'texture', e.target.value)} placeholder="1" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.maturity} onChange={(e) => updateCattle(cattle.id, 'maturity', e.target.value)} placeholder="2" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <span className="text-[10px] text-gray-700">농협 음성</span>
                        </td>
                        <td className={tdClass}>
                          <input 
                            type="date" 
                            value={cattle.slaughterDate} 
                            onChange={(e) => updateCattle(cattle.id, 'slaughterDate', e.target.value)} 
                            required 
                            className={`w-36 ${inputClass}`} 
                          />
                        </td>
                        <td className={tdClass}>
                          <input type="text" value={cattle.slaughterNo} onChange={(e) => updateCattle(cattle.id, 'slaughterNo', e.target.value)} placeholder="201" required className={`w-14 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input 
                            type="date" 
                            value={cattle.processDate} 
                            onChange={(e) => updateCattle(cattle.id, 'processDate', e.target.value)} 
                            required 
                            className={`w-36 ${inputClass}`} 
                          />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.processWeight} onChange={(e) => updateCattle(cattle.id, 'processWeight', e.target.value)} placeholder="312" required className={`w-14 ${inputClass}`} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 부위별 정보 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse table-fixed">
                    <thead>
                      <tr>
                        {[0, 1, 2].map(col => (
                          <React.Fragment key={col}>
                            <th className={`${thClass} w-[28px]`}></th>
                            <th className={`${thClass} w-[110px]`}>상장번호</th>
                            <th className={`${thClass} w-[70px]`}>부위</th>
                            <th className={`${thClass} w-[70px]`}>중량</th>
                            <th className={`${thClass} w-[85px]`}>최저가격</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4, 5, 6].map((rowIndex) => (
                        <tr key={rowIndex}>
                          {[0, 1, 2].map((colIndex) => {
                            const partIndex = rowIndex + colIndex * 7;
                            const part = cattle.parts[partIndex];
                            
                            if (!part) {
                              return (
                                <React.Fragment key={colIndex}>
                                  <td className={`${tdClass} text-gray-400`}></td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                </React.Fragment>
                              );
                            }
                            
                            const isIncluded = part.isIncluded;
                            
                            return (
                              <React.Fragment key={colIndex}>
                                <td className={`${tdClass} ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    onChange={() => togglePartIncluded(cattle.id, part.id)}
                                    className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative cursor-pointer
                                      after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
                                  />
                                </td>
                                <td className={`${tdClass} whitespace-nowrap text-[10px] ${!isIncluded ? 'bg-gray-100 text-gray-400 line-through' : 'text-gray-600'}`}>
                                  {isIncluded ? getListingNo(cattle.seqNo, partIndex) : '-'}
                                </td>
                                <td className={`${tdClass} font-medium whitespace-nowrap ${!isIncluded ? 'bg-gray-100 text-gray-400 line-through' : 'text-gray-900 bg-gray-50'}`}>
                                  {part.name}
                                </td>
                                <td className={`${tdClass} ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="number"
                                    value={part.weight}
                                    onChange={(e) => updatePart(cattle.id, part.id, 'weight', e.target.value)}
                                    placeholder="0.0"
                                    required={isIncluded}
                                    disabled={!isIncluded}
                                    step="0.1"
                                    className={`w-16 ${inputClass} ${!isIncluded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                  />
                                </td>
                                <td className={`${tdClass} ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="text"
                                    value={displayPrice(part.minPrice)}
                                    onChange={(e) => updatePart(cattle.id, part.id, 'minPrice', e.target.value)}
                                    placeholder="0"
                                    required={isIncluded}
                                    disabled={!isIncluded}
                                    className={`w-20 ${inputClass} ${!isIncluded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 사진 및 증명서 업로드 (한 줄) */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  {/* 사진 */}
                  <span className="text-xs font-medium text-gray-600">사진:</span>
                  <span className="text-[10px] text-gray-400">({cattle.images.length}/4)</span>
                  {cattle.images.map((img, index) => (
                    <div key={index} className="relative w-14 h-14 border border-gray-200 overflow-hidden bg-gray-50">
                      <img 
                        src={img} 
                        alt={`상품 ${index + 1}`} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80" 
                        onClick={() => setViewingImage(img)}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeImage(cattle.id, index)} 
                        className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {cattle.images.length < 4 && (
                    <>
                      <input
                        ref={el => { imageInputRefs.current[cattle.id] = el; }}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(cattle.id, e)}
                        className="hidden"
                      />
                      <button 
                        type="button" 
                        onClick={() => imageInputRefs.current[cattle.id]?.click()} 
                        disabled={uploadingImages[cattle.id]}
                        className="w-14 h-14 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-500 transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingImages[cattle.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span className="text-[9px] mt-0.5">업로드</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* 구분선 */}
                  <div className="w-px h-10 bg-gray-200 mx-2"></div>

                  {/* 도축검사증명서 */}
                  <span className="text-xs font-medium text-gray-600">도축검사증명서:</span>
                  {cattle.slaughterCert ? (
                    <div className="relative w-14 h-14 border border-gray-200 overflow-hidden bg-gray-50">
                      <img 
                        src={cattle.slaughterCert.fileData} 
                        alt="도축검사증명서" 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        onClick={() => openCert(cattle.slaughterCert!)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCert(cattle.id, 'slaughterCert')}
                        className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={el => { slaughterCertInputRefs.current[cattle.id] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCertUpload(cattle.id, 'slaughterCert', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => slaughterCertInputRefs.current[cattle.id]?.click()}
                        className="w-14 h-14 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-500 transition-colors bg-white"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[9px] mt-0.5">업로드</span>
                      </button>
                    </>
                  )}

                  {/* 등급판정확인서 */}
                  <span className="text-xs font-medium text-gray-600">등급판정확인서:</span>
                  {cattle.gradeCert ? (
                    <div className="relative w-14 h-14 border border-gray-200 overflow-hidden bg-gray-50">
                      <img 
                        src={cattle.gradeCert.fileData} 
                        alt="등급판정확인서" 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        onClick={() => openCert(cattle.gradeCert!)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCert(cattle.id, 'gradeCert')}
                        className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={el => { gradeCertInputRefs.current[cattle.id] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCertUpload(cattle.id, 'gradeCert', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => gradeCertInputRefs.current[cattle.id]?.click()}
                        className="w-14 h-14 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-500 transition-colors bg-white"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[9px] mt-0.5">업로드</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 개체 추가 버튼 */}
        {cattleList.length < 10 && (
          <button
            type="button"
            onClick={addCattle}
            className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">개체 추가</span>
          </button>
        )}

      </form>

      {/* 이미지 확대 모달 */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={viewingImage} 
              alt="확대 이미지" 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
