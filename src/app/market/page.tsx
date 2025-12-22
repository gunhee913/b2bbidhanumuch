'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Home as HomeIcon,
  BarChart3,
  FileText,
  User,
  Gavel,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format, subDays, subWeeks, subMonths, isWeekend, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

// 부위 타입
type Part = { id: string; name: string; color: string };

// 등급 타입
type Grade = { id: string; name: string };

// 평균 유형 타입
type AverageType = { id: string; name: string; unit: 'daily' | 'weekly' | 'monthly' };

// 메인 색상 (빨간색 통일)
const PRIMARY_COLOR = '#DC2626';

// 부위 목록
const PARTS: Part[] = [
  { id: 'sirloin', name: '등심', color: PRIMARY_COLOR },
  { id: 'tenderloin', name: '안심', color: PRIMARY_COLOR },
  { id: 'striploin', name: '채끝', color: PRIMARY_COLOR },
  { id: 'rib', name: '갈비', color: PRIMARY_COLOR },
  { id: 'special', name: '특수부위', color: PRIMARY_COLOR },
  { id: 'foreshank', name: '앞다리', color: PRIMARY_COLOR },
  { id: 'topround', name: '우둔', color: PRIMARY_COLOR },
  { id: 'brisket', name: '양지', color: PRIMARY_COLOR },
  { id: 'round', name: '설도', color: PRIMARY_COLOR },
  { id: 'shank', name: '사태', color: PRIMARY_COLOR },
  { id: 'chuck', name: '목심', color: PRIMARY_COLOR },
];

// 등급 목록
const GRADES: Grade[] = [
  { id: 'all', name: '전체' },
  { id: '1++', name: '1++' },
  { id: '1+', name: '1+' },
  { id: '1', name: '1' },
];

// 평균 유형 목록
const AVERAGE_TYPES: AverageType[] = [
  { id: 'daily', name: '일간 평균가', unit: 'daily' },
  { id: 'weekly', name: '주간 평균가', unit: 'weekly' },
  { id: 'monthly', name: '월간 평균가', unit: 'monthly' },
];

// 시세 데이터 타입
type PriceData = {
  date: string;
  price: number;
  displayDate: string;
  fullDate: string;
};

// 날짜/부위/등급 기반 결정론적 해시 함수 (같은 입력 = 같은 출력)
const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // 0~1 사이 값으로 변환
  return Math.abs(Math.sin(hash)) ;
};

// 부위별 기본 가격 설정
const BASE_PRICES: Record<string, number> = {
  sirloin: 85000,
  tenderloin: 112000,
  striploin: 78000,
  rib: 72000,
  special: 95000,
  foreshank: 42000,
  topround: 48000,
  brisket: 38000,
  round: 45000,
  shank: 35000,
  chuck: 52000,
};

// 등급별 가격 조정
const GRADE_MULTIPLIER: Record<string, number> = {
  'all': 1,
  '1++': 1.15,
  '1+': 1,
  '1': 0.85,
};

// 일별 가격 생성 (내부 함수)
const getDailyPrice = (date: Date, partId: string, gradeId: string): number => {
  const basePrice = BASE_PRICES[partId] * GRADE_MULTIPLIER[gradeId];
  const dateStr = format(date, 'yyyy-MM-dd');
  const seed = `${dateStr}-${partId}-${gradeId}`;
  const randomValue = seededRandom(seed);
  const variation = (randomValue - 0.5) * 0.06;
  return Math.round(basePrice * (1 + variation));
};

// 더미 시세 데이터 생성 함수
const generatePriceData = (
  partId: string,
  gradeId: string,
  averageType: 'daily' | 'weekly' | 'monthly'
): PriceData[] => {
  const data: PriceData[] = [];
  const today = new Date();
  
  if (averageType === 'daily') {
    // 일간 평균: 최근 30일 (평일만)
    let dayCount = 0;
    let daysBack = 0;
    
    while (dayCount < 30) {
      const date = subDays(today, daysBack);
      daysBack++;
      
      if (isWeekend(date)) continue;
      
      const price = getDailyPrice(date, partId, gradeId);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      data.unshift({
        date: dateStr,
        displayDate: format(date, 'M.d.(EEE)', { locale: ko }),
        fullDate: format(date, 'yyyy.M.d.(EEE)', { locale: ko }),
        price,
      });
      
      dayCount++;
    }
  } else if (averageType === 'weekly') {
    // 주간 평균: 최근 12주
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      
      // 해당 주의 평일 가격들 평균
      let totalPrice = 0;
      let count = 0;
      
      for (let d = 0; d < 7; d++) {
        const date = subDays(weekEnd, d);
        if (!isWeekend(date) && date <= today) {
          totalPrice += getDailyPrice(date, partId, gradeId);
          count++;
        }
      }
      
      if (count > 0) {
        const avgPrice = Math.round(totalPrice / count);
        const dateStr = format(weekStart, 'yyyy-MM-dd');
        
        data.push({
          date: dateStr,
          displayDate: format(weekStart, 'M.d', { locale: ko }) + '주',
          fullDate: format(weekStart, 'yyyy.M.d', { locale: ko }) + ' ~ ' + format(weekEnd, 'M.d', { locale: ko }),
          price: avgPrice,
        });
      }
    }
  } else if (averageType === 'monthly') {
    // 월간 평균: 최근 12개월
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(today, i));
      const monthEnd = endOfMonth(subMonths(today, i));
      
      // 해당 월의 평일 가격들 평균
      let totalPrice = 0;
      let count = 0;
      let currentDate = monthStart;
      
      while (currentDate <= monthEnd && currentDate <= today) {
        if (!isWeekend(currentDate)) {
          totalPrice += getDailyPrice(currentDate, partId, gradeId);
          count++;
        }
        currentDate = subDays(currentDate, -1);
      }
      
      if (count > 0) {
        const avgPrice = Math.round(totalPrice / count);
        const dateStr = format(monthStart, 'yyyy-MM');
        
        data.push({
          date: dateStr,
          displayDate: format(monthStart, 'yy년 M월', { locale: ko }),
          fullDate: format(monthStart, 'yyyy년 M월', { locale: ko }),
          price: avgPrice,
        });
      }
    }
  }
  
  return data;
};

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PriceData;
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">{data.fullDate}</p>
        <p className="text-base font-bold">
          {payload[0].value.toLocaleString()}원/kg
        </p>
      </div>
    );
  }
  return null;
};

export default function MarketPage() {
  const [selectedPart, setSelectedPart] = useState(PARTS[0]);
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [selectedAverageType, setSelectedAverageType] = useState(AVERAGE_TYPES[0]); // 기본 일간 평균
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showAverageDropdown, setShowAverageDropdown] = useState(false);

  // 드래그 스크롤 관련
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 시세 데이터 생성 (메모이제이션)
  const priceData = useMemo(() => {
    return generatePriceData(selectedPart.id, selectedGrade.id, selectedAverageType.unit);
  }, [selectedPart.id, selectedGrade.id, selectedAverageType.unit]);

  // 통계 계산
  const stats = useMemo(() => {
    if (priceData.length < 2) return { today: 0, change: 0, changePercent: 0 };
    
    const today = priceData[priceData.length - 1].price;
    const yesterday = priceData[priceData.length - 2].price;
    const change = today - yesterday;
    const changePercent = ((change / yesterday) * 100).toFixed(1);
    
    const max = Math.max(...priceData.map(d => d.price));
    const min = Math.min(...priceData.map(d => d.price));
    const avg = Math.round(priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length);
    
    // Y축 ticks 계산 (1000원 단위, 동일 간격)
    const yMin = Math.floor(min / 1000) * 1000 - 1000;
    const yMax = Math.ceil(max / 1000) * 1000 + 1000;
    const yTicks: number[] = [];
    for (let v = yMin; v <= yMax; v += 1000) {
      yTicks.push(v);
    }
    
    return { today, change, changePercent: parseFloat(changePercent), max, min, avg, yTicks, yMin, yMax };
  }, [priceData]);

  // 동적 viewport 높이 설정
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = () => {
      setShowGradeDropdown(false);
      setShowAverageDropdown(false);
    };

    if (showGradeDropdown || showAverageDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showGradeDropdown, showAverageDropdown]);

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div 
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col" 
          style={{
            height: 'calc(var(--vh, 1vh) * 100)',
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* 모바일 메인 헤더 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center">
                  <img 
                    src="/Mainlogo.png" 
                    alt="HanuMuch" 
                    className="h-7 w-auto"
                  />
                </Link>
                <div className="flex items-center">
                  <img 
                    src="/음성축산물공판장.png" 
                    alt="음성축산물공판장" 
                    className="h-5 w-auto border border-gray-300 rounded px-1.5 py-0.5 bg-gradient-to-br from-white to-gray-50 shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {/* 페이지 타이틀 */}
            <div className="px-4 py-3 bg-white border-b border-gray-100">
              <h1 className="text-lg font-bold text-gray-900">부위별 시세</h1>
            </div>

            {/* 부위 선택 탭 */}
            <div className="bg-white border-b border-gray-200 overflow-hidden">
              <div 
                ref={scrollRef}
                className="flex overflow-x-auto px-2 py-2 gap-1.5 select-none" 
                style={{ 
                  scrollbarWidth: 'none', 
                  WebkitOverflowScrolling: 'touch',
                  msOverflowStyle: 'none',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {PARTS.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => setSelectedPart(part)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedPart.id === part.id
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedPart.id === part.id ? part.color : undefined,
                    }}
                  >
                    {part.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 필터 영역 */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-3">
              {/* 등급 드롭다운 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGradeDropdown(!showGradeDropdown);
                    setShowAverageDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  등급: {selectedGrade.name}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showGradeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showGradeDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[100px]">
                    {GRADES.map((grade) => (
                      <button
                        key={grade.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGrade(grade);
                          setShowGradeDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          selectedGrade.id === grade.id ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'
                        }`}
                      >
                        {grade.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 평균 유형 드롭다운 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAverageDropdown(!showAverageDropdown);
                    setShowGradeDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {selectedAverageType.name}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAverageDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showAverageDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                    {AVERAGE_TYPES.map((avgType) => (
                      <button
                        key={avgType.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAverageType(avgType);
                          setShowAverageDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          selectedAverageType.id === avgType.id ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-700'
                        }`}
                      >
                        {avgType.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 오늘 시세 요약 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedAverageType.name}</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500">
                  {selectedPart.name} / {selectedGrade.name} / {
                    selectedAverageType.unit === 'daily' 
                      ? format(new Date(), 'yyyy.M.d.(EEE)', { locale: ko })
                      : selectedAverageType.unit === 'weekly'
                        ? `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yy.M.d.', { locale: ko })} ~ ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yy.M.d.', { locale: ko })}`
                        : format(new Date(), 'yyyy년 M월', { locale: ko })
                  }
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span 
                  className="text-3xl font-bold"
                  style={{ color: selectedPart.color }}
                >
                  {stats.today.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm">원/kg</span>
              </div>
            </div>

            {/* 차트 영역 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={priceData}
                    margin={{ top: 15, right: 10, left: 5, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                      interval={selectedAverageType.unit === 'monthly' ? 2 : selectedAverageType.unit === 'weekly' ? 2 : 5}
                      angle={0}
                      textAnchor="middle"
                      height={35}
                      padding={{ left: 15, right: 15 }}
                    />
                    <YAxis 
                      orientation="right"
                      tick={(props: any) => {
                        const { x, y, payload, index } = props;
                        // 맨 아래 tick (index 0)은 라벨 숨김
                        if (index === 0) return null;
                        return (
                          <text x={x} y={y} dy={4} textAnchor="start" fontSize={10} fill="#6B7280">
                            {payload.value.toLocaleString()}
                          </text>
                        );
                      }}
                      tickLine={false}
                      axisLine={false}
                      domain={[stats.yMin, stats.yMax]}
                      ticks={stats.yTicks}
                      width={42}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={selectedPart.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: selectedPart.color }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="mx-4 mt-4 mb-6 grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-gray-500 mb-1">기간 최고가</p>
                <p className="text-sm font-bold text-red-600">{stats.max?.toLocaleString()}원</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-gray-500 mb-1">기간 평균</p>
                <p className="text-sm font-bold text-gray-900">{stats.avg?.toLocaleString()}원</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-gray-500 mb-1">기간 최저가</p>
                <p className="text-sm font-bold text-blue-600">{stats.min?.toLocaleString()}원</p>
              </div>
            </div>

            {/* 하단 여백 */}
            <div className="h-20" />
          </div>

          {/* 하단 네비게이션 */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 py-2 safe-area-pb">
            <div className="flex items-center justify-around">
              {/* 홈 */}
              <Link href="/" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                <HomeIcon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">홈</span>
              </Link>
              
              {/* 경매 */}
              <Link href="/auction" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                <Gavel className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">경매</span>
              </Link>
              
              {/* 시세 */}
              <div className="flex-1 flex flex-col items-center py-2 text-red-600">
                <BarChart3 className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">시세</span>
              </div>
              
              {/* 거래 */}
              <Link href="/trade" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                <FileText className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">거래</span>
              </Link>
              
              {/* 내정보 */}
              <Link href="/profile" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                <User className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">내정보</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
