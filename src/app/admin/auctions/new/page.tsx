'use client';

import React, { useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save, Upload, X, Calendar } from 'lucide-react';
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

// 부위 데이터 (기본 19개 부위)
const DEFAULT_PARTS = [
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

// 가공업체별 접수번호 prefix
const COMPANY_PREFIX: Record<string, string> = {
  '건화': '100',
  '대진엠에스': '200',
  '안심엘피씨': '300',
  '정직한고기': '400',
};

// 내일 날짜 코드 생성 (YYMMDD)
const getTomorrowDateCode = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = String(tomorrow.getFullYear()).slice(-2);
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
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
  
  // 기본 정보
  const [listingDate, setListingDate] = useState(tomorrowDateString); // 상장일자 (기본: 내일)
  const [company, setCompany] = useState('');
  const [seqNo, setSeqNo] = useState('1');
  
  // 개체 정보
  const [breed, setBreed] = useState('한우');
  const [gender, setGender] = useState('');
  const [grade, setGrade] = useState('');
  const [marbling, setMarbling] = useState('');
  const [monthAge, setMonthAge] = useState('');
  const [carcassWeight, setCarcassWeight] = useState('');
  const [traceNo, setTraceNo] = useState('');
  
  // 등급 판정 정보
  const [backFat, setBackFat] = useState('');
  const [eyeMuscle, setEyeMuscle] = useState('');
  const [fatMarbling, setFatMarbling] = useState(''); // 근내지방도
  const [meatColor, setMeatColor] = useState('');
  const [fatColor, setFatColor] = useState('');
  const [texture, setTexture] = useState('');
  const [maturity, setMaturity] = useState('');
  
  // 도축/가공 정보
  const [slaughterHouse, setSlaughterHouse] = useState('음성');
  const [slaughterDate, setSlaughterDate] = useState('');
  const [slaughterNo, setSlaughterNo] = useState('');
  const [processDate, setProcessDate] = useState('');
  const [processWeight, setProcessWeight] = useState('');
  
  // 날짜 입력 ref
  const listingDateRef = useRef<HTMLInputElement>(null);
  const slaughterDateRef = useRef<HTMLInputElement>(null);
  const processDateRef = useRef<HTMLInputElement>(null);
  
  // 부위별 정보
  const [parts, setParts] = useState(DEFAULT_PARTS);
  
  // 이미지
  const [images, setImages] = useState<string[]>([]);

  // 상장일자 기반 날짜 코드 생성 (YYMMDD)
  const getDateCodeFromListingDate = () => {
    if (!listingDate) return getTomorrowDateCode();
    const date = new Date(listingDate);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 접수번호 자동 생성
  const getAuctionNo = () => {
    if (!company) return '-';
    const dateCode = getDateCodeFromListingDate();
    const basePrefix = COMPANY_PREFIX[company] || '100';
    const prefixBase = basePrefix.charAt(0);
    const seq = String(seqNo || '1').padStart(2, '0');
    return `${dateCode}-${prefixBase}${seq}`;
  };

  // 등급 표시 형식
  const getGradeDisplay = () => {
    if (!grade) return '-';
    if (grade.startsWith('1++') && marbling) {
      return `${grade}(${marbling})`;
    }
    return grade;
  };

  // 이력번호 포맷팅 (0000-0000-0)
  const formatTraceNo = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 8) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 9)}`;
  };

  const handleTraceNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTraceNo(formatTraceNo(e.target.value));
  };

  // 부위 정보 수정
  const updatePart = (id: number, field: 'weight' | 'minPrice', value: string) => {
    setParts(parts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // 상장번호 생성
  const getListingNo = (partIndex: number) => {
    if (!company) return '-';
    const dateCode = getDateCodeFromListingDate();
    const basePrefix = COMPANY_PREFIX[company] || '100';
    const prefixBase = basePrefix.charAt(0);
    const seq = String(seqNo || '1').padStart(2, '0');
    return `${dateCode}-${prefixBase}${seq}-${String(partIndex + 1).padStart(4, '0')}`;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('상장 등록이 완료되었습니다.');
    router.push('/admin/auctions');
  };

  // 이미지 업로드 핸들러 (임시)
  const handleImageUpload = () => {
    setImages([...images, `/등심${images.length + 1}.png`]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 공통 스타일
  const thClass = "px-2 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-2 text-xs border border-gray-200 text-center";
  const inputClass = "w-full px-2 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none bg-white";
  const selectClass = "w-full px-2 py-1 border border-gray-200 rounded text-xs text-center focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none bg-white";

  return (
    <AdminLayout>
      <style dangerouslySetInnerHTML={{ __html: hideSpinnerStyle }} />
      
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">부분육상장등록</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 개체 정보 테이블 (한 줄 테이블) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>상장일자</th>
                  <th className={thClass}>상장업체</th>
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
                  <td className={tdClass}>
                    <div className="relative inline-flex items-center">
                      <input 
                        ref={listingDateRef}
                        type="date" 
                        value={listingDate} 
                        onChange={(e) => setListingDate(e.target.value)} 
                        required 
                        className="w-36 pl-8 pr-2 py-1 border border-gray-200 rounded text-xs outline-none bg-white cursor-pointer" 
                      />
                      <Calendar 
                        className="absolute left-2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                        onClick={() => listingDateRef.current?.showPicker()}
                      />
                    </div>
                  </td>
                  <td className={tdClass}>
                    <select value={company} onChange={(e) => setCompany(e.target.value)} required className={selectClass}>
                      <option value="">선택</option>
                      <option value="건화">건화</option>
                      <option value="대진엠에스">대진엠에스</option>
                      <option value="안심엘피씨">안심엘피씨</option>
                      <option value="정직한고기">정직한고기</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={seqNo} onChange={(e) => setSeqNo(e.target.value)} min="1" max="99" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={`${tdClass} font-medium text-gray-900 bg-blue-50`}>{getAuctionNo()}</td>
                  <td className={tdClass}>
                    <select value={breed} onChange={(e) => setBreed(e.target.value)} className={selectClass}>
                      <option value="한우">한우</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} required className={selectClass}>
                      <option value="">선택</option>
                      <option value="거세">거세</option>
                      <option value="암">암</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <select value={grade} onChange={(e) => { setGrade(e.target.value); if(!e.target.value.startsWith('1++')) setMarbling(''); }} required className={selectClass}>
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
                    <select value={marbling} onChange={(e) => setMarbling(e.target.value)} disabled={!grade.startsWith('1++')} className={`${selectClass} disabled:bg-gray-100`}>
                      <option value="">-</option>
                      <option value="9">9</option>
                      <option value="8">8</option>
                      <option value="7">7</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={monthAge} onChange={(e) => setMonthAge(e.target.value)} placeholder="32" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={carcassWeight} onChange={(e) => setCarcassWeight(e.target.value)} placeholder="520" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="text" value={traceNo} onChange={handleTraceNoChange} placeholder="0000-0000-0" maxLength={11} required className="w-28 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 등급 판정 + 도축/가공 정보 (한 줄 테이블) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 overflow-hidden">
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
                    <input type="number" value={backFat} onChange={(e) => setBackFat(e.target.value)} placeholder="15" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={eyeMuscle} onChange={(e) => setEyeMuscle(e.target.value)} placeholder="98" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={fatMarbling} onChange={(e) => setFatMarbling(e.target.value)} placeholder="9" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={meatColor} onChange={(e) => setMeatColor(e.target.value)} placeholder="5" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={fatColor} onChange={(e) => setFatColor(e.target.value)} placeholder="3" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={texture} onChange={(e) => setTexture(e.target.value)} placeholder="1" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={maturity} onChange={(e) => setMaturity(e.target.value)} placeholder="2" required className="w-12 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <select value={slaughterHouse} onChange={(e) => setSlaughterHouse(e.target.value)} className="w-14 px-1 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white">
                      <option value="음성">음성</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <div className="relative inline-flex items-center">
                      <input 
                        ref={slaughterDateRef}
                        type="date" 
                        value={slaughterDate} 
                        onChange={(e) => setSlaughterDate(e.target.value)} 
                        required 
                        className="w-36 pl-8 pr-2 py-1 border border-gray-200 rounded text-xs outline-none bg-white cursor-pointer" 
                      />
                      <Calendar 
                        className="absolute left-2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                        onClick={() => slaughterDateRef.current?.showPicker()}
                      />
                    </div>
                  </td>
                  <td className={tdClass}>
                    <input type="text" value={slaughterNo} onChange={(e) => setSlaughterNo(e.target.value)} placeholder="201" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                  <td className={tdClass}>
                    <div className="relative inline-flex items-center">
                      <input 
                        ref={processDateRef}
                        type="date" 
                        value={processDate} 
                        onChange={(e) => setProcessDate(e.target.value)} 
                        required 
                        className="w-36 pl-8 pr-2 py-1 border border-gray-200 rounded text-xs outline-none bg-white cursor-pointer" 
                      />
                      <Calendar 
                        className="absolute left-2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                        onClick={() => processDateRef.current?.showPicker()}
                      />
                    </div>
                  </td>
                  <td className={tdClass}>
                    <input type="number" value={processWeight} onChange={(e) => setProcessWeight(e.target.value)} placeholder="312" required className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 부위별 정보 테이블 (3열 7행) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 overflow-hidden">
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
                      const part = parts[partIndex];
                      
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
                      
                      // 탭 순서: 세로로 이동 (같은 열 내에서 아래로)
                      const localIndex = partIndex % 7;
                      const colGroup = Math.floor(partIndex / 7);
                      const weightTabIndex = colGroup * 14 + localIndex * 2 + 1;
                      const priceTabIndex = colGroup * 14 + localIndex * 2 + 2;
                      
                      return (
                        <React.Fragment key={colIndex}>
                          <td className={`${tdClass} text-gray-600 whitespace-nowrap`}>{getListingNo(partIndex)}</td>
                          <td className={`${tdClass} font-medium text-gray-900 bg-gray-50 whitespace-nowrap`}>{part.name}</td>
                          <td className={tdClass}>
                            <input
                              type="number"
                              value={part.weight}
                              onChange={(e) => updatePart(part.id, 'weight', e.target.value)}
                              placeholder="0.0"
                              required
                              step="0.1"
                              tabIndex={weightTabIndex}
                              className="w-16 px-1 py-1 border border-gray-200 rounded text-xs text-center outline-none bg-white"
                            />
                          </td>
                          <td className={tdClass}>
                            <input
                              type="number"
                              value={part.minPrice}
                              onChange={(e) => updatePart(part.id, 'minPrice', e.target.value)}
                              placeholder="0"
                              required
                              step="1000"
                              tabIndex={priceTabIndex}
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
        </div>

        {/* 사진 업로드 + 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden">
                <img src={img} alt={`상품 ${index + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(index)} className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <button type="button" onClick={handleImageUpload} className="w-16 h-16 rounded border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">사진</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  상장 등록
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
