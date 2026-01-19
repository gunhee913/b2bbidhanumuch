'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Trash2,
  Upload,
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 부위 타입
interface PartItem {
  id: string;
  part: string;
  weight: string;
  minPrice: string;
}

export default function NewAuctionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 기본 정보
  const [company, setCompany] = useState('');
  const [auctionDate, setAuctionDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('15:00');
  
  // 개체 정보
  const [traceNo, setTraceNo] = useState('');
  const [type, setType] = useState('');
  const [grade, setGrade] = useState('');
  const [marbling, setMarbling] = useState('');
  const [weight, setWeight] = useState('');
  const [monthAge, setMonthAge] = useState('');
  const [slaughterDate, setSlaughterDate] = useState('');
  
  // 부위별 정보
  const [parts, setParts] = useState<PartItem[]>([
    { id: '1', part: '등심(좌)', weight: '', minPrice: '' },
    { id: '2', part: '등심(우)', weight: '', minPrice: '' },
  ]);

  // 부위 추가
  const addPart = () => {
    setParts([...parts, { 
      id: Date.now().toString(), 
      part: '', 
      weight: '', 
      minPrice: '' 
    }]);
  };

  // 부위 삭제
  const removePart = (id: string) => {
    if (parts.length > 1) {
      setParts(parts.filter(p => p.id !== id));
    }
  };

  // 부위 정보 수정
  const updatePart = (id: string, field: keyof PartItem, value: string) => {
    setParts(parts.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 실제로는 API 호출
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('경매가 등록되었습니다.');
    router.push('/admin/auctions');
  };

  // 부위 옵션
  const partOptions = [
    '등심(좌)', '등심(우)', '안심', '채끝', 
    '갈비(좌)', '갈비(우)', '특수부위',
    '앞다리(좌)', '앞다리(우)', '우둔(좌)', '우둔(우)',
    '설도(좌)', '설도(우)', '양지', '사태', '목심'
  ];

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <Link 
          href="/admin/auctions" 
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          경매 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">경매 등록</h1>
        <p className="text-gray-500 mt-1">새로운 경매를 등록합니다.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 폼 (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    가공업체 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  >
                    <option value="">선택하세요</option>
                    <option value="건화">건화</option>
                    <option value="대진엠에스">대진엠에스</option>
                    <option value="안심엘피씨">안심엘피씨</option>
                    <option value="정직한고기">정직한고기</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    경매일 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={auctionDate}
                      onChange={(e) => setAuctionDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    시작 시간 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    종료 시간 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 개체 정보 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">개체 정보</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    이력번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={traceNo}
                    onChange={(e) => setTraceNo(e.target.value)}
                    placeholder="002-1486-7293-1"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    품종 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  >
                    <option value="">선택하세요</option>
                    <option value="한우거세">한우거세</option>
                    <option value="한우암">한우암</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    등급 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  >
                    <option value="">선택하세요</option>
                    <option value="1++A">1++A</option>
                    <option value="1++B">1++B</option>
                    <option value="1+A">1+A</option>
                    <option value="1+B">1+B</option>
                    <option value="1A">1A</option>
                    <option value="1B">1B</option>
                    <option value="2">2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    근내지방도 {grade.startsWith('1++') && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={marbling}
                    onChange={(e) => setMarbling(e.target.value)}
                    disabled={!grade.startsWith('1++')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">선택하세요</option>
                    <option value="9">9</option>
                    <option value="8">8</option>
                    <option value="7">7</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    도체중량 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="520"
                      required
                      className="w-full px-3 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    월령 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={monthAge}
                      onChange={(e) => setMonthAge(e.target.value)}
                      placeholder="30"
                      required
                      className="w-full px-3 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">개월</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    도축일 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={slaughterDate}
                      onChange={(e) => setSlaughterDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 부위별 정보 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">부위별 정보</h2>
                <button
                  type="button"
                  onClick={addPart}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  부위 추가
                </button>
              </div>

              <div className="space-y-3">
                {parts.map((part, index) => (
                  <div key={part.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={part.part}
                        onChange={(e) => updatePart(part.id, 'part', e.target.value)}
                        required
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                      >
                        <option value="">부위 선택</option>
                        {partOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <input
                          type="number"
                          value={part.weight}
                          onChange={(e) => updatePart(part.id, 'weight', e.target.value)}
                          placeholder="중량"
                          required
                          step="0.1"
                          className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={part.minPrice}
                          onChange={(e) => updatePart(part.id, 'minPrice', e.target.value)}
                          placeholder="최저단가"
                          required
                          className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePart(part.id)}
                      disabled={parts.length === 1}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 사이드바 (1/3) */}
          <div className="space-y-6">
            {/* 이미지 업로드 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">상품 이미지</h2>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">이미지를 드래그하거나</p>
                <button
                  type="button"
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  파일 선택
                </button>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG (최대 5MB)</p>
              </div>
            </div>

            {/* 안내 */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">등록 안내</h3>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    <li>• 이력번호는 축산물품질평가원에서 확인 가능합니다.</li>
                    <li>• 1++등급은 근내지방도를 필수로 입력해주세요.</li>
                    <li>• 부위별 최저단가는 원/kg 단위로 입력합니다.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    경매 등록
                  </>
                )}
              </button>
              <Link
                href="/admin/auctions"
                className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </Link>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
