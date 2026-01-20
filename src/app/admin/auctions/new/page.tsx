'use client';

import React, { useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save, Upload, X, Calendar, Plus, ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  input[type="date"]::-webkit-calendar-picker-indicator {
    display: none !important;
    -webkit-appearance: none;
    width: 0;
    height: 0;
    margin: 0;
    padding: 0;
  }
  input[type="date"]::-webkit-inner-spin-button {
    display: none;
  }
  input[type="date"]::-webkit-clear-button {
    display: none;
  }
`;

// 부위 데이터 타입
interface PartData {
  id: number;
  name: string;
  weight: string;
  minPrice: string;
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
  isExpanded: boolean;
}

// 기본 19개 부위 생성
const createDefaultParts = (): PartData[] => [
  { id: 1, name: '등심(좌)', weight: '', minPrice: '' },
  { id: 2, name: '등심(우)', weight: '', minPrice: '' },
  { id: 3, name: '안심', weight: '', minPrice: '' },
  { id: 4, name: '채끝', weight: '', minPrice: '' },
  { id: 5, name: '갈비(좌)', weight: '', minPrice: '' },
  { id: 6, name: '갈비(우)', weight: '', minPrice: '' },
  { id: 7, name: '특수부위', weight: '', minPrice: '' },
  { id: 8, name: '설도(좌)', weight: '', minPrice: '' },
  { id: 9, name: '설도(우)', weight: '', minPrice: '' },
  { id: 10, name: '앞다리', weight: '', minPrice: '' },
  { id: 11, name: '우둔', weight: '', minPrice: '' },
  { id: 12, name: '목심', weight: '', minPrice: '' },
  { id: 13, name: '양지(좌)', weight: '', minPrice: '' },
  { id: 14, name: '양지(우)', weight: '', minPrice: '' },
  { id: 15, name: '사태', weight: '', minPrice: '' },
  { id: 16, name: '꼬리', weight: '', minPrice: '' },
  { id: 17, name: '족', weight: '', minPrice: '' },
  { id: 18, name: '사골', weight: '', minPrice: '' },
  { id: 19, name: '잡뼈', weight: '', minPrice: '' },
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
  traceNo: '',
  backFat: '',
  eyeMuscle: '',
  fatMarbling: '',
  meatColor: '',
  fatColor: '',
  texture: '',
  maturity: '',
  slaughterHouse: '음성',
  slaughterDate: '',
  slaughterNo: '',
  processDate: '',
  processWeight: '',
  parts: createDefaultParts(),
  images: [],
  isExpanded: true,
});

// 가공업체별 접수번호 prefix
const COMPANY_PREFIX: Record<string, string> = {
  '건화': '100',
  '대진엠에스': '200',
  '안심엘피씨': '300',
  '정직한고기': '400',
};

// 내일 날짜 (YYYY-MM-DD) - input date용
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tomorrowDateString = getTomorrowDateString();

export default function NewAuctionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 공통 정보
  const [listingDate, setListingDate] = useState(tomorrowDateString);
  const [company, setCompany] = useState('');
  
  // 날짜 입력 ref
  const listingDateRef = useRef<HTMLInputElement>(null);
  
  // 개체 목록
  const [cattleList, setCattleList] = useState<CattleData[]>([
    createNewCattle(1, '1')
  ]);

  // 상장일자 기반 날짜 코드 생성 (YYMMDD)
  const getDateCode = () => {
    if (!listingDate) return '';
    const date = new Date(listingDate);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 접수번호 생성
  const getAuctionNo = (seqNo: string) => {
    if (!company) return '-';
    const dateCode = getDateCode();
    const basePrefix = COMPANY_PREFIX[company] || '100';
    const prefixBase = basePrefix.charAt(0);
    const seq = String(seqNo || '1').padStart(2, '0');
    return `${dateCode}-${prefixBase}${seq}`;
  };

  // 상장번호 생성
  const getListingNo = (seqNo: string, partIndex: number) => {
    if (!company) return '-';
    const dateCode = getDateCode();
    const basePrefix = COMPANY_PREFIX[company] || '100';
    const prefixBase = basePrefix.charAt(0);
    const seq = String(seqNo || '1').padStart(2, '0');
    return `${dateCode}-${prefixBase}${seq}-${String(partIndex + 1).padStart(4, '0')}`;
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
    const newSeqNo = String(cattleList.length + 1);
    setCattleList([...cattleList, createNewCattle(Date.now(), newSeqNo)]);
  };

  // 개체 삭제
  const removeCattle = (id: number) => {
    if (cattleList.length === 1) {
      alert('최소 1두는 등록해야 합니다.');
      return;
    }
    const newList = cattleList.filter(c => c.id !== id);
    // 순번 재정렬
    setCattleList(newList.map((c, idx) => ({ ...c, seqNo: String(idx + 1) })));
  };

  // 개체 정보 수정
  const updateCattle = (id: number, field: keyof CattleData, value: string | boolean) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== id) return c;
      if (field === 'grade' && !String(value).startsWith('1++')) {
        return { ...c, [field]: value, marbling: '' };
      }
      if (field === 'traceNo') {
        return { ...c, [field]: formatTraceNo(String(value)) };
      }
      return { ...c, [field]: value };
    }));
  };

  // 부위 정보 수정
  const updatePart = (cattleId: number, partId: number, field: 'weight' | 'minPrice', value: string) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return {
        ...c,
        parts: c.parts.map(p => p.id === partId ? { ...p, [field]: value } : p)
      };
    }));
  };

  // 접기/펼치기
  const toggleExpand = (id: number) => {
    setCattleList(cattleList.map(c => 
      c.id === id ? { ...c, isExpanded: !c.isExpanded } : c
    ));
  };

  // 이전 개체 복사
  const copyFromPrevious = (id: number) => {
    const currentIndex = cattleList.findIndex(c => c.id === id);
    if (currentIndex <= 0) return;
    
    const prev = cattleList[currentIndex - 1];
    setCattleList(cattleList.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        breed: prev.breed,
        gender: prev.gender,
        grade: prev.grade,
        marbling: prev.marbling,
        backFat: prev.backFat,
        eyeMuscle: prev.eyeMuscle,
        fatMarbling: prev.fatMarbling,
        meatColor: prev.meatColor,
        fatColor: prev.fatColor,
        texture: prev.texture,
        maturity: prev.maturity,
        slaughterHouse: prev.slaughterHouse,
        slaughterDate: prev.slaughterDate,
        processDate: prev.processDate,
        parts: prev.parts.map((p, i) => ({ ...c.parts[i], minPrice: p.minPrice })),
      };
    }));
  };

  // 이미지 업로드
  const handleImageUpload = (cattleId: number) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      if (c.images.length >= 4) return c;
      return { ...c, images: [...c.images, `/등심${c.images.length + 1}.png`] };
    }));
  };

  // 이미지 삭제
  const removeImage = (cattleId: number, index: number) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return { ...c, images: c.images.filter((_, i) => i !== index) };
    }));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`${cattleList.length}두 상장 등록이 완료되었습니다.`);
    router.push('/admin/auctions');
  };

  // 공통 스타일
  const thClass = "px-2 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-2 text-xs border border-gray-200 text-center";
  const selectClass = "w-full px-2 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none bg-white";

  return (
    <AdminLayout>
      <style dangerouslySetInnerHTML={{ __html: hideSpinnerStyle }} />
      
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">부분육상장등록</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">{cattleList.length}두</span>
          <span>/ 최대 10두</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 공통 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">상장일자</span>
              <div className="relative">
                <input
                  ref={listingDateRef}
                  type="date"
                  value={listingDate}
                  onChange={(e) => setListingDate(e.target.value)}
                  required
                  className="w-36 pl-3 pr-8 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
                />
                <Calendar 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                  onClick={() => listingDateRef.current?.showPicker()}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">상장업체</span>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white min-w-[120px]"
              >
                <option value="">선택</option>
                <option value="건화">건화</option>
                <option value="대진엠에스">대진엠에스</option>
                <option value="안심엘피씨">안심엘피씨</option>
                <option value="정직한고기">정직한고기</option>
              </select>
            </div>
          </div>
        </div>

        {/* 개체 목록 */}
        {cattleList.map((cattle, cattleIndex) => (
          <div key={cattle.id} className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 overflow-hidden">
            {/* 개체 헤더 */}
            <div 
              className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleExpand(cattle.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 bg-red-600 text-white rounded-full text-sm font-bold">
                  {cattleIndex + 1}
                </span>
                <span className="font-medium text-gray-900">
                  {cattle.gender || '성별'} / {cattle.grade || '등급'}{cattle.marbling ? `(${cattle.marbling})` : ''} / {cattle.traceNo || '이력번호'}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                  접수번호: {getAuctionNo(cattle.seqNo)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cattleIndex > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); copyFromPrevious(cattle.id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                    title="이전 개체 정보 복사"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    이전복사
                  </button>
                )}
                {cattleList.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeCattle(cattle.id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
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
                        <th className={thClass}>순번</th>
                        <th className={thClass}>접수번호</th>
                        <th className={thClass}>축종</th>
                        <th className={thClass}>성별</th>
                        <th className={thClass}>등급</th>
                        <th className={thClass}>근내지방</th>
                        <th className={thClass}>개월령</th>
                        <th className={thClass}>도체중</th>
                        <th className={thClass}>이력번호</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={`${tdClass} font-medium bg-gray-50`}>{cattle.seqNo}</td>
                        <td className={`${tdClass} font-medium text-gray-900 bg-blue-50`}>{getAuctionNo(cattle.seqNo)}</td>
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
                            <option value="1+A">1+A</option>
                            <option value="1+B">1+B</option>
                            <option value="1A">1A</option>
                            <option value="1B">1B</option>
                            <option value="2">2</option>
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
                          <input type="number" value={cattle.monthAge} onChange={(e) => updateCattle(cattle.id, 'monthAge', e.target.value)} placeholder="32" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.carcassWeight} onChange={(e) => updateCattle(cattle.id, 'carcassWeight', e.target.value)} placeholder="520" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="text" value={cattle.traceNo} onChange={(e) => updateCattle(cattle.id, 'traceNo', e.target.value)} placeholder="0000-0000-0" maxLength={11} required className="w-28 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
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
                          <input type="number" value={cattle.backFat} onChange={(e) => updateCattle(cattle.id, 'backFat', e.target.value)} placeholder="15" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.eyeMuscle} onChange={(e) => updateCattle(cattle.id, 'eyeMuscle', e.target.value)} placeholder="98" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.fatMarbling} onChange={(e) => updateCattle(cattle.id, 'fatMarbling', e.target.value)} placeholder="9" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.meatColor} onChange={(e) => updateCattle(cattle.id, 'meatColor', e.target.value)} placeholder="5" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.fatColor} onChange={(e) => updateCattle(cattle.id, 'fatColor', e.target.value)} placeholder="3" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.texture} onChange={(e) => updateCattle(cattle.id, 'texture', e.target.value)} placeholder="1" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.maturity} onChange={(e) => updateCattle(cattle.id, 'maturity', e.target.value)} placeholder="2" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.slaughterHouse} onChange={(e) => updateCattle(cattle.id, 'slaughterHouse', e.target.value)} className="w-14 px-1 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white">
                            <option value="음성">음성</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <div className="relative inline-flex items-center">
                            <input 
                              type="date" 
                              value={cattle.slaughterDate} 
                              onChange={(e) => updateCattle(cattle.id, 'slaughterDate', e.target.value)} 
                              required 
                              className="w-36 pl-3 pr-2 py-1 border border-gray-200 rounded text-xs outline-none bg-white" 
                            />
                          </div>
                        </td>
                        <td className={tdClass}>
                          <input type="text" value={cattle.slaughterNo} onChange={(e) => updateCattle(cattle.id, 'slaughterNo', e.target.value)} placeholder="201" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                        <td className={tdClass}>
                          <div className="relative inline-flex items-center">
                            <input 
                              type="date" 
                              value={cattle.processDate} 
                              onChange={(e) => updateCattle(cattle.id, 'processDate', e.target.value)} 
                              required 
                              className="w-36 pl-3 pr-2 py-1 border border-gray-200 rounded text-xs outline-none bg-white" 
                            />
                          </div>
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.processWeight} onChange={(e) => updateCattle(cattle.id, 'processWeight', e.target.value)} placeholder="312" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 부위별 정보 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {[0, 1, 2].map(col => (
                          <React.Fragment key={col}>
                            <th className={thClass}>상장번호</th>
                            <th className={thClass}>부위</th>
                            <th className={thClass}>중량</th>
                            <th className={thClass}>최저가격</th>
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
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                </React.Fragment>
                              );
                            }
                            
                            return (
                              <React.Fragment key={colIndex}>
                                <td className={`${tdClass} text-gray-600 whitespace-nowrap text-[10px]`}>{getListingNo(cattle.seqNo, partIndex)}</td>
                                <td className={`${tdClass} font-medium text-gray-900 bg-gray-50 whitespace-nowrap`}>{part.name}</td>
                                <td className={tdClass}>
                                  <input
                                    type="number"
                                    value={part.weight}
                                    onChange={(e) => updatePart(cattle.id, part.id, 'weight', e.target.value)}
                                    placeholder="0.0"
                                    required
                                    step="0.1"
                                    className="w-16 px-1 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white"
                                  />
                                </td>
                                <td className={tdClass}>
                                  <input
                                    type="number"
                                    value={part.minPrice}
                                    onChange={(e) => updatePart(cattle.id, part.id, 'minPrice', e.target.value)}
                                    placeholder="0"
                                    required
                                    step="1000"
                                    className="w-20 px-1 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white"
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

                {/* 사진 업로드 */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-medium text-gray-600">사진:</span>
                  {cattle.images.map((img, index) => (
                    <div key={index} className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden">
                      <img src={img} alt={`상품 ${index + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(cattle.id, index)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white hover:bg-black/70">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {cattle.images.length < 4 && (
                    <button type="button" onClick={() => handleImageUpload(cattle.id)} className="w-14 h-14 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="text-[9px] mt-0.5">추가</span>
                    </button>
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
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-red-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">개체 추가</span>
          </button>
        )}

        {/* 제출 버튼 */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="inline-flex items-center gap-2 px-8 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                등록 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {cattleList.length}두 일괄 등록
              </>
            )}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
