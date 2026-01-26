'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Calendar as CalendarIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Bell
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
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
  { id: 'round', name: '설도', color: PRIMARY_COLOR },
  { id: 'foreshank', name: '앞다리', color: PRIMARY_COLOR },
  { id: 'topround', name: '우둔', color: PRIMARY_COLOR },
  { id: 'chuck', name: '목심', color: PRIMARY_COLOR },
  { id: 'brisket', name: '양지', color: PRIMARY_COLOR },
  { id: 'shank', name: '사태', color: PRIMARY_COLOR },
  { id: 'tail', name: '꼬리', color: PRIMARY_COLOR },
  { id: 'feet', name: '족', color: PRIMARY_COLOR },
  { id: 'bone', name: '사골', color: PRIMARY_COLOR },
  { id: 'scrap', name: '잡뼈', color: PRIMARY_COLOR },
];

// 등급 목록
const GRADES: Grade[] = [
  { id: 'all', name: '전체' },
  { id: '1++', name: '1++' },
  { id: '1+', name: '1+' },
  { id: '1', name: '1' },
  { id: '2', name: '2' },
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
  round: 45000,
  foreshank: 42000,
  topround: 48000,
  chuck: 52000,
  brisket: 38000,
  shank: 35000,
  tail: 35000,
  feet: 25000,
  bone: 20000,
  scrap: 15000,
};

// 등급별 가격 조정
const GRADE_MULTIPLIER: Record<string, number> = {
  'all': 1,
  '1++': 1.15,
  '1+': 1,
  '1': 0.85,
  '2': 0.7,
};

// 부위별 시세 테이블 데이터 타입
type PartPriceTableData = {
  part: string;
  grade: string;
  count: number;
  totalWeight: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
};

// 부위별 시세 테이블 더미 데이터 생성
const generatePartPriceTableData = (): PartPriceTableData[] => {
  const data: PartPriceTableData[] = [];
  const grades = ['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'];
  
  // 등급별 가격 배수
  const gradeMultipliers: Record<string, number> = {
    '1++(9)': 1.20,
    '1++(8)': 1.15,
    '1++(7)': 1.10,
    '1+': 1,
    '1': 0.85,
    '2': 0.7,
  };
  
  PARTS.forEach(part => {
    grades.forEach(grade => {
      const basePrice = BASE_PRICES[part.id] * (gradeMultipliers[grade] || 1);
      const seed = `${part.id}-${grade}-table`;
      const randomValue = seededRandom(seed);
      
      // 낙찰건수 (5~25건)
      const count = Math.floor(randomValue * 20) + 5;
      // 총중량 (50~300kg)
      const totalWeight = Math.round((randomValue * 250 + 50) * 10) / 10;
      // 평균단가
      const avgPrice = Math.round(basePrice * (1 + (randomValue - 0.5) * 0.1));
      // 최저/최고단가 (평균의 ±5~10%)
      const minPrice = Math.round(avgPrice * (0.92 + randomValue * 0.03));
      const maxPrice = Math.round(avgPrice * (1.05 + randomValue * 0.03));
      
      data.push({
        part: part.name,
        grade,
        count,
        totalWeight,
        avgPrice,
        minPrice,
        maxPrice,
      });
    });
  });
  
  return data;
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
  const yesterday = subDays(today, 1); // 전일부터 시작 (오늘 제외)
  
  if (averageType === 'daily') {
    // 일간 평균: 최근 30일 (평일만, 전일부터)
    let dayCount = 0;
    let daysBack = 1; // 전일부터 시작
    
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
    // 주간 평균: 최근 12주 (전일까지)
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(yesterday, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(yesterday, i), { weekStartsOn: 1 });
      
      // 해당 주의 평일 가격들 평균
      let totalPrice = 0;
      let count = 0;
      
      for (let d = 0; d < 7; d++) {
        const date = subDays(weekEnd, d);
        if (!isWeekend(date) && date <= yesterday) {
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
    // 월간 평균: 최근 12개월 (전일까지)
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(yesterday, i));
      const monthEnd = endOfMonth(subMonths(yesterday, i));
      
      // 해당 월의 평일 가격들 평균
      let totalPrice = 0;
      let count = 0;
      let currentDate = monthStart;
      
      while (currentDate <= monthEnd && currentDate <= yesterday) {
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
  const [activeTab, setActiveTab] = useState<'시세표' | '시세차트'>('시세표');
  const [selectedPart, setSelectedPart] = useState(PARTS[0]);
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [selectedAverageType, setSelectedAverageType] = useState(AVERAGE_TYPES[0]); // 기본 일간 평균
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showAverageDropdown, setShowAverageDropdown] = useState(false);
  
  // 부위별 탭 - 일자 조회 상태
  const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  };
  const [partTabStartDate, setPartTabStartDate] = useState<Date>(getYesterdayDate());
  const [partTabEndDate, setPartTabEndDate] = useState<Date>(getYesterdayDate());
  const [partTabSearchStartDate, setPartTabSearchStartDate] = useState<Date>(getYesterdayDate());
  const [partTabSearchEndDate, setPartTabSearchEndDate] = useState<Date>(getYesterdayDate());
  
  // 시세표 탭 - 필터 상태
  const [partTabFilterPart, setPartTabFilterPart] = useState<string>('전체');
  const [partTabFilterGrade, setPartTabFilterGrade] = useState<string>('전체');
  const [showPartFilterDropdown, setShowPartFilterDropdown] = useState(false);
  const [showGradeFilterDropdown, setShowGradeFilterDropdown] = useState(false);
  
  // 시세차트 탭 - 일자 조회 상태
  const [chartStartDate, setChartStartDate] = useState<Date>(getYesterdayDate());
  const [chartEndDate, setChartEndDate] = useState<Date>(getYesterdayDate());
  const [chartSearchStartDate, setChartSearchStartDate] = useState<Date>(getYesterdayDate());
  const [chartSearchEndDate, setChartSearchEndDate] = useState<Date>(getYesterdayDate());
  
  // 시세차트 탭 - 필터 상태
  const [chartFilterPart, setChartFilterPart] = useState<string>('등심');
  const [chartFilterGrade, setChartFilterGrade] = useState<string>('전체');
  const [showChartPartDropdown, setShowChartPartDropdown] = useState(false);
  const [showChartGradeDropdown, setShowChartGradeDropdown] = useState(false);
  
  const handleChartSearch = () => {
    setChartSearchStartDate(chartStartDate);
    setChartSearchEndDate(chartEndDate);
  };
  
  const formatDateDisplay = (date: Date) => {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };
  
  const handlePartTabSearch = () => {
    setPartTabSearchStartDate(partTabStartDate);
    setPartTabSearchEndDate(partTabEndDate);
  };
  
  // 차트 드래그 스크롤 관련
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isChartDragging, setIsChartDragging] = useState(false);
  const [chartStartX, setChartStartX] = useState(0);
  const [chartScrollLeft, setChartScrollLeft] = useState(0);

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

  // 테이블 표시 개수
  const [tableDisplayCount, setTableDisplayCount] = useState(10);

  // 기간 직접 선택
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // 필터 변경 시 테이블 표시 개수 초기화
  useEffect(() => {
    setTableDisplayCount(10);
  }, [selectedPart.id, selectedGrade.id, selectedAverageType.unit]);

  // 시세 데이터 생성 (메모이제이션)
  const priceData = useMemo(() => {
    let data: PriceData[] = [];
    
    // 기간 직접 선택인 경우
    if (selectedAverageType.id === 'custom' && customDateRange.from && customDateRange.to) {
      let currentDate = new Date(customDateRange.to);
      const endDate = new Date(customDateRange.from);
      
      while (currentDate >= endDate) {
        if (!isWeekend(currentDate)) {
          const price = getDailyPrice(currentDate, selectedPart.id, selectedGrade.id);
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          data.unshift({
            date: dateStr,
            displayDate: format(currentDate, 'M.d.(EEE)', { locale: ko }),
            fullDate: format(currentDate, 'yyyy.M.d.(EEE)', { locale: ko }),
            price,
          });
        }
        currentDate = subDays(currentDate, 1);
      }
    } else {
      data = generatePriceData(selectedPart.id, selectedGrade.id, selectedAverageType.unit);
    }
    
    return data;
  }, [selectedPart.id, selectedGrade.id, selectedAverageType.unit, selectedAverageType.id, customDateRange.from, customDateRange.to]);

  // 통계 계산
  const stats = useMemo(() => {
    if (priceData.length < 2) return { today: 0, change: 0, changePercent: 0, latestDate: '', latestFullDate: '' };
    
    const max = Math.max(...priceData.map(d => d.price));
    const min = Math.min(...priceData.map(d => d.price));
    const avg = Math.round(priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length);
    
    // 차트의 마지막 데이터 (가장 최근 평일)
    const latestData = priceData[priceData.length - 1];
    const latestPrice = latestData.price;
    const latestDate = latestData.displayDate;
    const latestFullDate = latestData.fullDate;
    
    // 전일 대비 변동 계산
    const previousPrice = priceData[priceData.length - 2].price;
    const change = latestPrice - previousPrice;
    const changePercent = ((change / previousPrice) * 100).toFixed(1);
    
    // Y축 ticks 계산 (1000원 단위, 동일 간격)
    const yMin = Math.floor(min / 1000) * 1000 - 1000;
    const yMax = Math.ceil(max / 1000) * 1000 + 1000;
    const yTicks: number[] = [];
    for (let v = yMin; v <= yMax; v += 1000) {
      yTicks.push(v);
    }
    
    // 상단에 표시되는 가격을 차트 마지막 데이터 가격과 동일하게, 날짜도 차트 마지막 데이터와 동일
    return { today: latestPrice, change, changePercent: parseFloat(changePercent), max, min, avg: latestPrice, yTicks, yMin, yMax, latestDate, latestFullDate };
  }, [priceData]);

  // 차트 드래그 함수들
  const handleChartMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chartScrollRef.current) return;
    setIsChartDragging(true);
    setChartStartX(e.pageX - chartScrollRef.current.offsetLeft);
    setChartScrollLeft(chartScrollRef.current.scrollLeft);
  }, []);

  const handleChartMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isChartDragging || !chartScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartScrollRef.current.offsetLeft;
    const walk = (x - chartStartX) * 1.5;
    chartScrollRef.current.scrollLeft = chartScrollLeft - walk;
  }, [isChartDragging, chartStartX, chartScrollLeft]);

  const handleChartMouseUp = useCallback(() => {
    setIsChartDragging(false);
  }, []);

  // 줌 함수들
  const handleZoomIn = useCallback(() => {
    if (!chartScrollRef.current) return;
    const scrollContainer = chartScrollRef.current;
    const innerDiv = scrollContainer.firstElementChild as HTMLElement;
    if (!innerDiv) return;
    
    const currentWidth = parseInt(innerDiv.style.width) || scrollContainer.clientWidth;
    const newWidth = currentWidth * 1.3;
    innerDiv.style.width = `${newWidth}px`;
    
    // 오른쪽 끝(오늘)으로 스크롤
    setTimeout(() => {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    }, 10);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartScrollRef.current) return;
    const scrollContainer = chartScrollRef.current;
    const innerDiv = scrollContainer.firstElementChild as HTMLElement;
    if (!innerDiv) return;
    
    const currentWidth = parseInt(innerDiv.style.width) || scrollContainer.clientWidth;
    const minWidth = scrollContainer.clientWidth;
    const newWidth = Math.max(minWidth, currentWidth * 0.7);
    innerDiv.style.width = `${newWidth}px`;
    
    // 오른쪽 끝(오늘)으로 스크롤
    setTimeout(() => {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    }, 10);
  }, []);

  const handleZoomReset = useCallback(() => {
    if (!chartScrollRef.current) return;
    const scrollContainer = chartScrollRef.current;
    const innerDiv = scrollContainer.firstElementChild as HTMLElement;
    if (!innerDiv) return;
    
    const defaultWidth = priceData.length > 30 ? `${Math.max(priceData.length * 12, 500)}px` : '100%';
    innerDiv.style.width = defaultWidth;
    
    // 오른쪽 끝(오늘)으로 스크롤
    setTimeout(() => {
      scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    }, 10);
  }, [priceData.length]);

  // 초기 로드 시 오늘 날짜(오른쪽 끝)로 스크롤
  useEffect(() => {
    if (chartScrollRef.current && priceData.length > 30) {
      const scrollContainer = chartScrollRef.current;
      setTimeout(() => {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      }, 100);
    }
  }, [priceData.length]);

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
      setShowPartFilterDropdown(false);
      setShowGradeFilterDropdown(false);
      setShowChartPartDropdown(false);
      setShowChartGradeDropdown(false);
    };

    if (showGradeDropdown || showAverageDropdown || showPartFilterDropdown || showGradeFilterDropdown || showChartPartDropdown || showChartGradeDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showGradeDropdown, showAverageDropdown, showPartFilterDropdown, showGradeFilterDropdown, showChartPartDropdown, showChartGradeDropdown]);

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
          <style jsx global>{`
            .recharts-wrapper,
            .recharts-surface,
            .recharts-wrapper svg,
            .recharts-wrapper svg:focus,
            .recharts-surface:focus {
              outline: none !important;
              border: none !important;
              box-shadow: none !important;
            }
          `}</style>
          
          {/* 모바일 메인 헤더 */}
          <div className="flex-shrink-0 bg-white">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                {/* 왼쪽 여백 (오른쪽과 동일한 크기) */}
                <div className="w-[72px]"></div>
                {/* 가운데 타이틀 */}
                <h1 className="text-base font-bold text-gray-900">시세</h1>
                {/* 오른쪽 아이콘 */}
                <div className="flex items-center gap-0">
                  <Link 
                    href="/settings"
                    className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                  <Link 
                    href="/notifications"
                    className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center relative"
                  >
                    <Bell className="w-5 h-5 translate-y-[0.5px]" />
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                      2
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {/* 부위별/기간별 탭 - 스크롤 영역 안에 위치 */}
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('시세표')}
                  className={`text-sm font-semibold pb-1 transition-colors ${
                    activeTab === '시세표'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  시세표
                </button>
                <button
                  onClick={() => setActiveTab('시세차트')}
                  className={`text-sm font-semibold pb-1 transition-colors ${
                    activeTab === '시세차트'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  시세차트
                </button>
              </div>
            </div>

            {activeTab === '시세표' ? (
              /* 시세표 탭 - 테이블 */
              <div className="pb-24 bg-white">
                {/* 일자 조회 */}
                <div className="bg-white px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">일자</span>
                    <input
                      type="date"
                      value={`20${formatDateDisplay(partTabStartDate).replace(/\./g, '-')}`}
                      onChange={(e) => setPartTabStartDate(new Date(e.target.value))}
                      className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                    />
                    <span className="text-xs text-gray-400">~</span>
                    <input
                      type="date"
                      value={`20${formatDateDisplay(partTabEndDate).replace(/\./g, '-')}`}
                      onChange={(e) => setPartTabEndDate(new Date(e.target.value))}
                      className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                    />
                    <button
                      onClick={handlePartTabSearch}
                      className="px-3 py-1 text-xs font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                    >
                      조회
                    </button>
                  </div>
                </div>

                {/* 필터 영역 */}
                <div className="bg-white px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    {/* 부위 필터 */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPartFilterDropdown(!showPartFilterDropdown);
                          setShowGradeFilterDropdown(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        부위: {partTabFilterPart}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPartFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showPartFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px] max-h-[200px] overflow-y-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPartTabFilterPart('전체');
                              setShowPartFilterDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg ${
                              partTabFilterPart === '전체' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            전체
                          </button>
                          {PARTS.map((part) => (
                            <button
                              key={part.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPartTabFilterPart(part.name);
                                setShowPartFilterDropdown(false);
                              }}
                              className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 last:rounded-b-lg ${
                                partTabFilterPart === part.name ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {part.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 등급 필터 */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGradeFilterDropdown(!showGradeFilterDropdown);
                          setShowPartFilterDropdown(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        등급: {partTabFilterGrade}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showGradeFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showGradeFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPartTabFilterGrade('전체');
                              setShowGradeFilterDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg ${
                              partTabFilterGrade === '전체' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            전체
                          </button>
                          {['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'].map((grade) => (
                            <button
                              key={grade}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPartTabFilterGrade(grade);
                                setShowGradeFilterDropdown(false);
                              }}
                              className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 last:rounded-b-lg ${
                                partTabFilterGrade === grade ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 테이블 헤더 - sticky로 고정 */}
                <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <div className="grid px-3 py-1.5 text-xs font-medium text-gray-500" style={{gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr'}}>
                    <div className="text-center">부위</div>
                    <div className="text-center">등급</div>
                    <div className="text-center">낙찰건수</div>
                    <div className="text-center">평균단가</div>
                    <div className="text-center">최저단가</div>
                    <div className="text-center">최고단가</div>
                  </div>
                </div>

                {/* 테이블 데이터 */}
                <div>
                  {generatePartPriceTableData()
                    .filter(row => partTabFilterPart === '전체' || row.part === partTabFilterPart)
                    .filter(row => partTabFilterGrade === '전체' || row.grade === partTabFilterGrade)
                    .map((row, index) => (
                    <div 
                      key={`${row.part}-${row.grade}`}
                      className={`grid px-3 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors text-xs ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                      style={{gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr'}}
                    >
                      <div className="text-center font-medium text-gray-900">{row.part}</div>
                      <div className="text-center text-gray-700">{row.grade}</div>
                      <div className="text-center text-gray-700">{row.count}</div>
                      <div className="text-center font-medium text-gray-900">{row.avgPrice.toLocaleString()}</div>
                      <div className="text-center text-blue-600">{row.minPrice.toLocaleString()}</div>
                      <div className="text-center text-red-600">{row.maxPrice.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            /* 시세차트 탭 - 차트 */
            <>
            {/* 일자 조회 + 필터 영역 */}
            <div className="bg-white">
              {/* 일자 조회 */}
              <div className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">일자</span>
                  <input
                    type="date"
                    value={`20${formatDateDisplay(chartStartDate).replace(/\./g, '-')}`}
                    onChange={(e) => setChartStartDate(new Date(e.target.value))}
                    className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                  />
                  <span className="text-xs text-gray-400">~</span>
                  <input
                    type="date"
                    value={`20${formatDateDisplay(chartEndDate).replace(/\./g, '-')}`}
                    onChange={(e) => setChartEndDate(new Date(e.target.value))}
                    className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                  />
                  <button
                    onClick={handleChartSearch}
                    className="px-3 py-1 text-xs font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                  >
                    조회
                  </button>
                </div>
              </div>

              {/* 필터 영역 */}
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  {/* 부위 필터 */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChartPartDropdown(!showChartPartDropdown);
                        setShowChartGradeDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      부위: {chartFilterPart}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChartPartDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showChartPartDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px] max-h-[200px] overflow-y-auto">
                        {PARTS.map((part) => (
                          <button
                            key={part.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setChartFilterPart(part.name);
                              setSelectedPart(part);
                              setShowChartPartDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                              chartFilterPart === part.name ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {part.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 등급 필터 */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChartGradeDropdown(!showChartGradeDropdown);
                        setShowChartPartDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      등급: {chartFilterGrade}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChartGradeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showChartGradeDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChartFilterGrade('전체');
                            setSelectedGrade(GRADES[0]);
                            setShowChartGradeDropdown(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 first:rounded-t-lg ${
                            chartFilterGrade === '전체' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                          }`}
                        >
                          전체
                        </button>
                        {['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'].map((grade) => (
                          <button
                            key={grade}
                            onClick={(e) => {
                              e.stopPropagation();
                              setChartFilterGrade(grade);
                              const gradeObj = GRADES.find(g => g.name === grade) || GRADES[0];
                              setSelectedGrade(gradeObj);
                              setShowChartGradeDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-50 last:rounded-b-lg ${
                              chartFilterGrade === grade ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 시세 요약 */}
            <div className="mx-4 mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm text-gray-600">평균 시세</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500">
                  {chartFilterPart} / {chartFilterGrade} / {formatDateDisplay(chartSearchStartDate)} ~ {formatDateDisplay(chartSearchEndDate)}
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
              {/* 줌 컨트롤 */}
              <div className="flex justify-end gap-1 mb-2">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="확대"
                >
                  <ZoomIn className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="축소"
                >
                  <ZoomOut className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="초기화"
                >
                  <RotateCcw className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              {/* 차트 + Y축 고정 레이아웃 */}
              <div className="relative h-[280px]">
                {/* 스크롤 가능한 차트 영역 */}
                <div 
                  ref={chartScrollRef}
                  className="absolute inset-0 right-[45px] overflow-x-auto overflow-y-hidden select-none outline-none focus:outline-none"
                  style={{ 
                    cursor: isChartDragging ? 'grabbing' : 'grab',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                  tabIndex={-1}
                  onMouseDown={handleChartMouseDown}
                  onMouseMove={handleChartMouseMove}
                  onMouseUp={handleChartMouseUp}
                  onMouseLeave={handleChartMouseUp}
                >
                  <div style={{ 
                    width: priceData.length > 30 ? `${Math.max(priceData.length * 12, 500)}px` : '100%',
                    height: '100%',
                    minWidth: '100%'
                  }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={priceData}
                        margin={{ top: 15, right: 5, left: 5, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis 
                          dataKey="displayDate" 
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                          interval={Math.max(0, Math.floor(priceData.length / 6) - 1)}
                          angle={0}
                          textAnchor="middle"
                          height={35}
                          padding={{ left: 15, right: 15 }}
                        />
                        <YAxis 
                          hide={true}
                          domain={[stats.yMin, stats.yMax]}
                          ticks={stats.yTicks}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={selectedPart.color}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: selectedPart.color }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* 고정된 Y축 */}
                <div className="absolute top-0 right-0 w-[45px] h-full bg-white flex flex-col justify-between py-[15px] pb-[45px]">
                  {stats.yTicks?.slice().reverse().slice(0, -1).map((tick, index) => (
                    <span key={index} className="text-[10px] text-gray-500 text-right pr-1">
                      {tick.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
              
              {priceData.length > 30 && (
                <p className="text-xs text-gray-400 text-center mt-1">← 마우스로 드래그하여 좌우 이동 →</p>
              )}
            </div>

            {/* 통계 카드 */}
            <div className="mx-4 mt-4 mb-4 grid grid-cols-3 gap-3">
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

            {/* 시세 데이터 테이블 */}
            <div className="mx-4 mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900">시세 상세 데이터</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left font-bold text-gray-700">날짜</th>
                      <th className="px-4 py-2.5 text-right font-bold text-gray-700">평균가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...priceData].reverse().slice(0, tableDisplayCount).map((item, index) => (
                      <tr 
                        key={item.date} 
                        className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-4 py-2.5 text-gray-900 font-medium">
                          {item.fullDate}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-900 font-bold">
                          {item.price.toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {priceData.length > tableDisplayCount && (
                <button 
                  onClick={() => setTableDisplayCount(prev => Math.min(prev + 10, priceData.length))}
                  className="w-full px-4 py-3 border-t border-gray-200 bg-gray-50 text-center hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-red-600">
                    더 보기 ({tableDisplayCount}/{priceData.length})
                  </span>
                </button>
              )}
            </div>

            {/* 하단 여백 */}
            <div className="h-20" />
            </>
            )}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
