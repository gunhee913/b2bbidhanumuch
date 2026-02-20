'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  ChevronDown,
  Settings,
  Bell
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { createChart, ColorType, Time, HistogramSeries, HistogramData, AreaSeries, LineSeries, LineData, AreaData } from 'lightweight-charts';
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
  { id: 'chima', name: '치마', color: PRIMARY_COLOR },
  { id: 'buchae', name: '부채', color: PRIMARY_COLOR },
  { id: 'upjin', name: '업진', color: PRIMARY_COLOR },
  { id: 'tosi', name: '토시·제비', color: PRIMARY_COLOR },
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
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // 거래량 (낙찰건수)
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

// 일별 가격 생성 (내부 함수) - 캔들스틱용 OHLC + 거래량 데이터
const getDailyPriceOHLC = (date: Date, partId: string, gradeId: string): { open: number; high: number; low: number; close: number; price: number; volume: number } => {
  const basePrice = BASE_PRICES[partId] * GRADE_MULTIPLIER[gradeId];
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // 날짜 기반 추세 (시간이 지남에 따라 가격 변동 추세 생성)
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const trendSeed = seededRandom(`${partId}-${gradeId}-trend`);
  const trendDirection = trendSeed > 0.5 ? 1 : -1;
  const trendStrength = 0.15; // 15% 추세 범위
  const cyclePeriod = 60 + Math.floor(seededRandom(`${partId}-cycle`) * 40); // 60~100일 주기
  const trendVariation = Math.sin((dayOfYear / cyclePeriod) * Math.PI * 2) * trendStrength * trendDirection;
  
  // 각각 다른 시드로 open, high, low, close, volume 생성
  const openSeed = `${dateStr}-${partId}-${gradeId}-open`;
  const highSeed = `${dateStr}-${partId}-${gradeId}-high`;
  const lowSeed = `${dateStr}-${partId}-${gradeId}-low`;
  const closeSeed = `${dateStr}-${partId}-${gradeId}-close`;
  const volumeSeed = `${dateStr}-${partId}-${gradeId}-volume`;
  
  // 일간 변동폭 증가 (±10%)
  const openVariation = (seededRandom(openSeed) - 0.5) * 0.20;
  const closeVariation = (seededRandom(closeSeed) - 0.5) * 0.20;
  
  const open = Math.round(basePrice * (1 + trendVariation + openVariation));
  const close = Math.round(basePrice * (1 + trendVariation + closeVariation));
  
  // high는 open, close 중 큰 값보다 높게, low는 더 낮게
  const maxOC = Math.max(open, close);
  const minOC = Math.min(open, close);
  const highExtra = seededRandom(highSeed) * 0.08; // 8%까지 추가
  const lowExtra = seededRandom(lowSeed) * 0.08;
  
  const high = Math.round(maxOC * (1 + highExtra));
  const low = Math.round(minOC * (1 - lowExtra));
  
  // price는 평균가 (종가 기준)
  const price = close;
  
  // 거래량 (낙찰건수) - 5~50건 사이
  const volume = Math.floor(seededRandom(volumeSeed) * 45) + 5;
  
  return { open, high, low, close, price, volume };
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
      
      const ohlc = getDailyPriceOHLC(date, partId, gradeId);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // 1월 1일이면 년도 포함
      const isNewYear = date.getMonth() === 0 && date.getDate() === 1;
      const displayDate = isNewYear 
        ? format(date, 'yy.M.d.(EEE)', { locale: ko })
        : format(date, 'M.d.(EEE)', { locale: ko });
      
      data.unshift({
        date: dateStr,
        displayDate,
        fullDate: format(date, 'yyyy.M.d.(EEE)', { locale: ko }),
        ...ohlc,
      });
      
      dayCount++;
    }
  } else if (averageType === 'weekly') {
    // 주간 평균: 최근 12주 (전일까지)
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(yesterday, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(yesterday, i), { weekStartsOn: 1 });
      
      // 해당 주의 평일 가격들
      const weekPrices: { open: number; high: number; low: number; close: number; volume: number }[] = [];
      
      for (let d = 0; d < 7; d++) {
        const date = subDays(weekEnd, d);
        if (!isWeekend(date) && date <= yesterday) {
          const ohlc = getDailyPriceOHLC(date, partId, gradeId);
          weekPrices.push(ohlc);
        }
      }
      
      if (weekPrices.length > 0) {
        const avgPrice = Math.round(weekPrices.reduce((sum, p) => sum + p.close, 0) / weekPrices.length);
        const high = Math.max(...weekPrices.map(p => p.high));
        const low = Math.min(...weekPrices.map(p => p.low));
        const open = weekPrices[weekPrices.length - 1].open; // 주 첫날
        const close = weekPrices[0].close; // 주 마지막날
        const volume = weekPrices.reduce((sum, p) => sum + p.volume, 0); // 주간 낙찰건수 합계
        const dateStr = format(weekStart, 'yyyy-MM-dd');
        
        data.push({
          date: dateStr,
          displayDate: format(weekStart, 'yy.M.d', { locale: ko }),
          fullDate: format(weekStart, 'yyyy.M.d', { locale: ko }) + ' ~ ' + format(weekEnd, 'M.d', { locale: ko }),
          price: avgPrice,
          open, high, low, close, volume,
        });
      }
    }
  } else if (averageType === 'monthly') {
    // 월간 평균: 최근 12개월 (전일까지)
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(yesterday, i));
      const monthEnd = endOfMonth(subMonths(yesterday, i));
      
      // 해당 월의 평일 가격들
      const monthPrices: { open: number; high: number; low: number; close: number; volume: number }[] = [];
      let currentDate = monthStart;
      
      while (currentDate <= monthEnd && currentDate <= yesterday) {
        if (!isWeekend(currentDate)) {
          const ohlc = getDailyPriceOHLC(currentDate, partId, gradeId);
          monthPrices.push(ohlc);
        }
        currentDate = subDays(currentDate, -1);
      }
      
      if (monthPrices.length > 0) {
        const avgPrice = Math.round(monthPrices.reduce((sum, p) => sum + p.close, 0) / monthPrices.length);
        const high = Math.max(...monthPrices.map(p => p.high));
        const low = Math.min(...monthPrices.map(p => p.low));
        const open = monthPrices[0].open; // 월 첫날
        const close = monthPrices[monthPrices.length - 1].close; // 월 마지막날
        const volume = monthPrices.reduce((sum, p) => sum + p.volume, 0); // 월간 낙찰건수 합계
        const dateStr = format(monthStart, 'yyyy-MM-dd');
        
        data.push({
          date: dateStr,
          displayDate: format(monthStart, 'yy년 M월', { locale: ko }),
          fullDate: format(monthStart, 'yyyy년 M월', { locale: ko }),
          price: avgPrice,
          open, high, low, close, volume,
        });
      }
    }
  }
  
  return data;
};


export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<'시세차트' | '시세표'>('시세차트');
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
  const [partTabFilterPart, setPartTabFilterPart] = useState<string>('등심');
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
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [tooltipData, setTooltipData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    date: string;
    visible: boolean;
  } | null>(null);
  
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
  
  // TradingView 캔들스틱 차트 관련
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // 무한 스크롤 관련
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
    return generatePriceData(selectedPart.id, selectedGrade.id, chartPeriod);
  }, [selectedPart.id, selectedGrade.id, chartPeriod]);

  // 통계 계산
  const stats = useMemo(() => {
    if (priceData.length < 2) return { today: 0, change: 0, changePercent: 0, latestDate: '', latestFullDate: '', max: 0, min: 0, avg: 0, yMin: 0, yMax: 0, yTicks: [] };
    
    // 캔들스틱용 high/low 기준으로 min/max 계산
    const max = Math.max(...priceData.map(d => d.high));
    const min = Math.min(...priceData.map(d => d.low));
    const avg = Math.round(priceData.reduce((sum, d) => sum + d.close, 0) / priceData.length);
    
    // 차트의 마지막 데이터 (가장 최근 평일)
    const latestData = priceData[priceData.length - 1];
    const latestPrice = latestData.close;
    const latestDate = latestData.displayDate;
    const latestFullDate = latestData.fullDate;
    
    // 전일 대비 변동 계산
    const previousPrice = priceData[priceData.length - 2].close;
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
    return { today: latestPrice, change, changePercent: parseFloat(changePercent), max, min, avg, yTicks, yMin, yMax, latestDate, latestFullDate };
  }, [priceData]);

  // TradingView Lightweight Charts
  useEffect(() => {
    // 시세차트 탭이 아니면 차트 생성하지 않음
    if (activeTab !== '시세차트') return;
    if (!chartContainerRef.current) return;
    
    // 차트 생성
    const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#6B7280',
        },
        grid: {
          vertLines: { color: '#F3F4F6' },
          horzLines: { color: '#F3F4F6' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 450,
        timeScale: {
          borderColor: '#E5E7EB',
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
          barSpacing: 6,
          minBarSpacing: 2,
          rightOffset: 2,
        },
        rightPriceScale: {
          borderColor: '#E5E7EB',
          scaleMargins: {
            top: 0.15,
            bottom: 0.35,
          },
          minimumWidth: 80,
        },
        localization: {
          priceFormatter: (price: number) => {
            if (price < 0) return '';
            return Math.round(price).toLocaleString() + '원';
          },
          dateFormat: 'yyyy.MM.dd',
          locale: 'ko-KR',
        },
        crosshair: {
          mode: 0,
          vertLine: {
            width: 1,
            color: '#9CA3AF',
            style: 2,
            labelBackgroundColor: '#374151',
          },
          horzLine: {
            width: 1,
            color: '#9CA3AF',
            style: 2,
            labelBackgroundColor: '#374151',
          },
        },
      });

      // 최고가 영역 시리즈 (밴드 상단 - 색칠)
      const highAreaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(220, 38, 38, 0.2)',
        bottomColor: 'rgba(220, 38, 38, 0.2)',
        lineColor: 'rgba(220, 38, 38, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });

      // 최저가 영역 시리즈 (흰색으로 덮어서 밴드 효과)
      const lowAreaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(255, 255, 255, 1)',
        bottomColor: 'rgba(255, 255, 255, 1)',
        lineColor: 'rgba(220, 38, 38, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });

      // 평균가 라인 시리즈 (메인)
      const avgLineSeries = chart.addSeries(LineSeries, {
        color: '#DC2626',
        lineWidth: 2,
      });

      // 거래량 시리즈 추가 (낙찰건수)
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => Math.round(price).toLocaleString() + '건',
        },
        priceScaleId: 'volume',
      });

      // 거래량 프라이스 스케일 설정
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
        visible: false,
      });

      // 최고가 데이터 (밴드 상단)
      const highData: AreaData<Time>[] = priceData.map(d => ({
        time: d.date as Time,
        value: d.high,
      }));

      // 최저가 데이터 (밴드 하단 - 흰색 영역)
      const lowData: AreaData<Time>[] = priceData.map(d => ({
        time: d.date as Time,
        value: d.low,
      }));

      // 평균가 데이터 (메인 라인)
      const avgData: LineData<Time>[] = priceData.map(d => ({
        time: d.date as Time,
        value: d.price,
      }));

      // 거래량 데이터
      const volumeData: HistogramData<Time>[] = priceData.map(d => ({
        time: d.date as Time,
        value: d.volume,
        color: 'rgba(220, 38, 38, 0.4)',
      }));

      highAreaSeries.setData(highData);
      lowAreaSeries.setData(lowData);
      avgLineSeries.setData(avgData);
      volumeSeries.setData(volumeData);

      // 최근 2개월(약 40 평일)만 보이도록 설정
      const dataLength = avgData.length;
      const visibleBars = 40;
      if (dataLength > visibleBars) {
        chart.timeScale().setVisibleLogicalRange({
          from: dataLength - visibleBars,
          to: dataLength - 1,
        });
      } else {
        chart.timeScale().fitContent();
      }

      // 크로스헤어 이동 시 툴팁 업데이트
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setTooltipData(null);
          return;
        }

        const avgDataPoint = param.seriesData.get(avgLineSeries) as LineData<Time> | undefined;
        const highDataPoint = param.seriesData.get(highAreaSeries) as AreaData<Time> | undefined;
        const lowDataPoint = param.seriesData.get(lowAreaSeries) as AreaData<Time> | undefined;
        const volumeDataPoint = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;

        if (avgDataPoint) {
          const dataPoint = priceData.find(d => d.date === param.time);
          setTooltipData({
            open: avgDataPoint.value,
            high: highDataPoint?.value || 0,
            low: lowDataPoint?.value || 0,
            close: avgDataPoint.value,
            volume: volumeDataPoint?.value || 0,
            date: dataPoint?.fullDate || String(param.time),
            visible: true,
          });
        }
      });

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [priceData, activeTab]);

  // 무한 스크롤 - IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && tableDisplayCount < priceData.length) {
          setTableDisplayCount(prev => Math.min(prev + 10, priceData.length));
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [tableDisplayCount, priceData.length]);

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
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                {/* 왼쪽 여백 (오른쪽과 동일한 크기) */}
                <div className="w-[80px]"></div>
                {/* 가운데 타이틀 */}
                <h1 className="text-[17px] font-bold text-gray-900">시세</h1>
                {/* 오른쪽 아이콘 */}
                <div className="flex items-center gap-1">
                  <Link 
                    href="/settings"
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center"
                  >
                    <Settings className="w-[22px] h-[22px]" />
                  </Link>
                  <Link 
                    href="/notifications"
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center relative"
                  >
                    <Bell className="w-[22px] h-[22px] translate-y-[0.5px]" />
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
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
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setActiveTab('시세차트')}
                  className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                    activeTab === '시세차트'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  시세차트
                </button>
                <button
                  onClick={() => setActiveTab('시세표')}
                  className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                    activeTab === '시세표'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  시세표
                </button>
              </div>
            </div>

            {activeTab === '시세표' ? (
              /* 시세표 탭 - 테이블 */
              <div className="pb-24 bg-white">
                {/* 일자 조회 */}
                <div className="bg-white px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] text-gray-500">일자</span>
                    <input
                      type="date"
                      value={`20${formatDateDisplay(partTabStartDate).replace(/\./g, '-')}`}
                      onChange={(e) => setPartTabStartDate(new Date(e.target.value))}
                      className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                    />
                    <span className="text-[13px] text-gray-400">~</span>
                    <input
                      type="date"
                      value={`20${formatDateDisplay(partTabEndDate).replace(/\./g, '-')}`}
                      onChange={(e) => setPartTabEndDate(new Date(e.target.value))}
                      className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                    />
                    <button
                      onClick={handlePartTabSearch}
                      className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                    >
                      조회
                    </button>
                  </div>
                </div>

                {/* 필터 영역 */}
                <div className="bg-white px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center gap-2.5">
                    {/* 부위 필터 */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPartFilterDropdown(!showPartFilterDropdown);
                          setShowGradeFilterDropdown(false);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        부위: {partTabFilterPart}
                        <ChevronDown className={`h-4 w-4 transition-transform ${showPartFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showPartFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px] max-h-[200px] overflow-y-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPartTabFilterPart('전체');
                              setShowPartFilterDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 first:rounded-t-lg ${
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
                              className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 last:rounded-b-lg ${
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
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        등급: {partTabFilterGrade}
                        <ChevronDown className={`h-4 w-4 transition-transform ${showGradeFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showGradeFilterDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPartTabFilterGrade('전체');
                              setShowGradeFilterDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 first:rounded-t-lg ${
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
                              className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 last:rounded-b-lg ${
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
                  <div className="grid px-3 h-9 items-center text-[13px] font-medium text-gray-500" style={{gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr'}}>
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
                      className={`grid px-3 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors text-[13px] ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`}
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
            {/* 필터 영역 */}
            <div className="bg-white">
              <div className="px-4 py-2.5 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  {/* 부위 필터 */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChartPartDropdown(!showChartPartDropdown);
                        setShowChartGradeDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      부위: {chartFilterPart}
                      <ChevronDown className={`h-4 w-4 transition-transform ${showChartPartDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showChartPartDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px] max-h-[200px] overflow-y-auto">
                        {PARTS.map((part) => (
                          <button
                            key={part.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setChartFilterPart(part.name);
                              setSelectedPart(part);
                              setShowChartPartDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
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
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      등급: {chartFilterGrade}
                      <ChevronDown className={`h-4 w-4 transition-transform ${showChartGradeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showChartGradeDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChartFilterGrade('전체');
                            setSelectedGrade(GRADES[0]);
                            setShowChartGradeDropdown(false);
                          }}
                          className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 first:rounded-t-lg ${
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
                            className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 last:rounded-b-lg ${
                              chartFilterGrade === grade ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 기간 선택 버튼 */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[
                      { id: 'daily', label: '일간' },
                      { id: 'weekly', label: '주간' },
                      { id: 'monthly', label: '월간' },
                    ].map((period) => (
                      <button
                        key={period.id}
                        onClick={() => setChartPeriod(period.id as 'daily' | 'weekly' | 'monthly')}
                        className={`px-3 py-1.5 text-[13px] font-medium rounded transition-colors ${
                          chartPeriod === period.id
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
            </div>

            {/* TradingView 캔들스틱 차트 */}
            <div className="bg-white overflow-hidden relative">
              <div ref={chartContainerRef} style={{ width: '100%', height: '450px' }} />
              {/* 커스텀 툴팁 */}
              {tooltipData && tooltipData.visible && (
                <div className="absolute top-4 left-4 bg-white border border-gray-200 text-xs px-3 py-2 rounded-lg shadow-lg z-10">
                  <div className="text-gray-500 mb-1.5">{tooltipData.date}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">평균단가</span>
                      <span className="font-medium text-gray-900">{Math.round(tooltipData.close).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">최고단가</span>
                      <span className="font-medium text-red-600">{Math.round(tooltipData.high).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">최저단가</span>
                      <span className="font-medium text-blue-600">{Math.round(tooltipData.low).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-1 border-t border-gray-100">
                      <span className="text-gray-500">낙찰건수</span>
                      <span className="font-medium text-gray-900">{Math.round(tooltipData.volume).toLocaleString()}건</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 시세 테이블 */}
            <div className="bg-white border-t border-gray-200">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-sm font-bold text-gray-700">
                  {chartPeriod === 'daily' ? '일별' : chartPeriod === 'weekly' ? '주별' : '월별'} 시세
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">일자</th>
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">부위</th>
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">등급</th>
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">낙찰건수</th>
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">평균단가</th>
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">최저단가</th>
                      <th className="px-2 py-2.5 text-center font-medium text-gray-600 whitespace-nowrap">최고단가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...priceData].reverse().slice(0, tableDisplayCount).map((item, index) => (
                      <tr 
                        key={item.date} 
                        className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-2 py-3 text-center text-gray-900 whitespace-nowrap">
                          {item.displayDate}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-900 whitespace-nowrap">
                          {chartFilterPart}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-900 whitespace-nowrap">
                          {chartFilterGrade}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-900 whitespace-nowrap">
                          {item.volume}건
                        </td>
                        <td className="px-2 py-3 text-center text-gray-900 font-medium whitespace-nowrap">
                          {item.price.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-center text-blue-600 whitespace-nowrap">
                          {item.low.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-center text-red-600 whitespace-nowrap">
                          {item.high.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 무한 스크롤 감시 요소 */}
              {priceData.length > tableDisplayCount && (
                <div 
                  ref={loadMoreRef}
                  className="w-full px-4 py-3 border-t border-gray-200 bg-gray-50 text-center"
                >
                  <span className="text-xs text-gray-400">불러오는 중...</span>
                </div>
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
