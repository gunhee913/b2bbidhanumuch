/** 소비자 PC 페이지 공통 컨테이너 · 헤더·본문·푸터가 같은 값을 써야 좌우가 맞는다 */
export const GB_CONTAINER_CLASS = 'mx-auto w-full max-w-[1440px] px-10';

export const GB_BRAND_NAME = '농협미트센터';
export const GB_LOGO_SRC = '/cyber_symbol%203.gif';

/** 홈 검색 영역 오른쪽 "확인했어요" 카드 사진 */
export const GB_VERIFIED_IMAGE_SRC = '/group-buy/verified-lab.jpg';

/** 홈은 `/group-buy` (로고 클릭) · 메뉴는 하위 섹션만 가리킨다 */
export const GB_NAV_ITEMS = [
  { label: '벌크구매', href: '/group-buy/products' },
  { label: '1kg 구매', href: '/group-buy/kg' },
  { label: '선물세트', href: '/group-buy/gift' },
  { label: '매장이용', href: '/group-buy/stores' },
  { label: '이용안내', href: '/group-buy/guide' },
] as const;

/** 마이페이지 왼쪽 메뉴 · 주문은 여기서만 본다 */
export const GB_MYPAGE_PATH = '/group-buy/mypage';
export const GB_MYPAGE_ITEMS = [
  { label: '주문내역', href: `${GB_MYPAGE_PATH}/orders` },
  { label: '회원정보', href: `${GB_MYPAGE_PATH}/profile` },
] as const;

export const GRADE_FILTERS = ['1++', '1+', '1', '2'] as const;

export const SLAUGHTER_HOUSES = ['농협 음성', '농협 부천', '농협 나주', '농협 고령'] as const;
