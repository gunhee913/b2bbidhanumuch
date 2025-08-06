/**
 * HanuMuch 브랜드 컬러 시스템
 * 
 * 디자인 가이드: 모노크롬 기반 + Primary Red(#c40000) 포인트 컬러
 * 
 * 사용법:
 * - Primary: 콜투액션(입찰/확정), 활성 상태, 포커스 링
 * - Neutral: 대부분 배경·텍스트·보더
 * - Secondary: 본문 텍스트/헤더(명도 높은 블랙)
 * - Accent: 약한 구분선/입력창 내부 구획
 */

export const colors = {
  /**
   * Primary Red - 메인 브랜드 컬러
   * 용도: CTA 버튼, 활성 상태, 포커스, 에러 상태
   */
  primary: {
    50: '#fff5f5',
    100: '#ffe3e3',
    200: '#ffc8c8',
    300: '#ff9d9d',
    400: '#ff6b6b',
    500: '#c40000', // 메인 브랜드 컬러
    600: '#a10000',
    700: '#7d0000',
    800: '#580000',
    900: '#3b0000',
    DEFAULT: '#c40000',
  },

  /**
   * Neutral Gray - 메인 컬러 시스템
   * 용도: 텍스트, 배경, 보더, 아이콘
   */
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5', // 보더 기본색
    300: '#d4d4d4',
    400: '#a3a3a3', // placeholder
    500: '#737373', // 보조 텍스트
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    DEFAULT: '#737373',
  },

  /**
   * Semantic 컬러
   */
  semantic: {
    /** 본문 텍스트/헤더 */
    secondary: '#111111',
    /** 약한 구분선/입력창 내부 */
    accent: '#dcdcdc',
    /** 보더 기본색 */
    border: '#e5e5e5',
    /** 구분선 */
    divider: '#eeeeee',
    /** 포커스 링 */
    focus: '#c40000',
    /** 모달/드로어 오버레이 */
    overlay: 'rgba(0, 0, 0, 0.4)',
  },

  /**
   * 배경 컬러
   */
  background: {
    /** 메인 배경 */
    primary: '#ffffff',
    /** 카드 배경 */
    card: '#ffffff',
    /** 섹션 배경 */
    section: '#fafafa',
    /** 비활성 배경 */
    disabled: '#f5f5f5',
  },

  /**
   * 텍스트 컬러
   */
  text: {
    /** 메인 텍스트 */
    primary: '#111111',
    /** 보조 텍스트 */
    secondary: '#737373',
    /** 플레이스홀더 */
    placeholder: '#a3a3a3',
    /** 비활성 텍스트 */
    disabled: 'rgba(17, 17, 17, 0.4)',
    /** 반전 텍스트 (Primary 배경용) */
    inverse: '#ffffff',
  },

  /**
   * 상태 컬러
   */
  status: {
    /** 성공 */
    success: {
      bg: '#f0fdf4',
      text: '#166534',
      border: '#bbf7d0',
    },
    /** 경고 */
    warning: {
      bg: '#fffbeb',
      text: '#92400e',
      border: '#fde68a',
    },
    /** 에러 */
    error: {
      bg: '#fef2f2',
      text: '#c40000',
      border: '#fecaca',
    },
    /** 정보 */
    info: {
      bg: '#f8fafc',
      text: '#475569',
      border: '#cbd5e1',
    },
  },

  /**
   * 버튼 상태별 컬러
   */
  button: {
    primary: {
      bg: '#c40000',
      text: '#ffffff',
      hover: '#a10000',
      pressed: '#7d0000',
      disabled: '#e5e5e5',
    },
    secondary: {
      bg: 'transparent',
      text: '#111111',
      border: '#e5e5e5',
      hover: '#f5f5f5',
      pressed: '#e5e5e5',
    },
    ghost: {
      bg: 'transparent',
      text: 'rgba(17, 17, 17, 0.7)',
      hover: '#f5f5f5',
      pressed: '#e5e5e5',
    },
  },
} as const;

/**
 * Tailwind 클래스명으로 사용할 수 있는 컬러 유틸리티
 */
export const colorUtils = {
  /** Primary 컬러 클래스 생성 */
  primary: (shade: keyof typeof colors.primary = 'DEFAULT') => 
    `hm-primary-${shade === 'DEFAULT' ? '500' : shade}`,
  
  /** Neutral 컬러 클래스 생성 */
  neutral: (shade: keyof typeof colors.neutral = 'DEFAULT') => 
    `hm-neutral-${shade === 'DEFAULT' ? '500' : shade}`,
  
  /** 텍스트 컬러 클래스 */
  textPrimary: () => 'text-hm-secondary',
  textSecondary: () => 'text-hm-neutral-500',
  textPlaceholder: () => 'text-hm-neutral-400',
  
  /** 배경 컬러 클래스 */
  bgPrimary: () => 'bg-white',
  bgCard: () => 'bg-white',
  bgSection: () => 'bg-hm-neutral-50',
  
  /** 보더 컬러 클래스 */
  border: () => 'border-hm-border',
  borderFocus: () => 'border-hm-focus',
  
  /** 상태 컬러 클래스 */
  success: () => 'text-green-700 bg-green-50 border-green-200',
  warning: () => 'text-amber-700 bg-amber-50 border-amber-200',
  error: () => 'text-hm-primary-500 bg-hm-primary-50 border-hm-primary-200',
  info: () => 'text-slate-600 bg-slate-50 border-slate-200',
} as const;

/**
 * 자주 사용되는 컬러 조합
 */
export const colorCombinations = {
  /** 카드 스타일 */
  card: 'bg-white border border-hm-border rounded-xl shadow-sm',
  
  /** Primary 버튼 */
  buttonPrimary: 'bg-hm-primary-500 text-white hover:bg-hm-primary-600 active:bg-hm-primary-700 disabled:bg-hm-neutral-200',
  
  /** Secondary 버튼 */
  buttonSecondary: 'bg-transparent text-hm-secondary border border-hm-border hover:bg-hm-neutral-50 active:bg-hm-neutral-100',
  
  /** Ghost 버튼 */
  buttonGhost: 'bg-transparent text-hm-neutral-700 hover:bg-hm-neutral-50 active:bg-hm-neutral-100',
  
  /** 입력 필드 */
  input: 'bg-white border border-hm-border text-hm-secondary placeholder:text-hm-neutral-400 focus:border-hm-focus focus:ring-2 focus:ring-hm-focus focus:ring-opacity-20',
  
  /** 포커스 링 */
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-hm-focus focus:ring-opacity-50',
} as const;