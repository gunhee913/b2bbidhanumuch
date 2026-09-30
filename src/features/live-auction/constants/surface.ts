/**
 * 경매장 서피스 토큰 · Upbit 형 타이트 패널 그리드.
 *
 * 연회색 캔버스 위에 흰 패널을 8px 간격으로 붙여 하나의 그리드처럼 보이게 한다.
 * 패널 외곽선은 선명한 slate-200 1px, 내부 구분선은 한 단계 낮은 slate-100.
 * 모서리는 0 · 그림자 없음 (패널 간 분리는 캔버스 색 차이로만).
 */

/** 페이지 캔버스 · 라이트는 Upbit 톤 연회색, 다크는 패널보다 한 단계 더 어두운 먹색 */
export const CANVAS_BG_CLASS = "bg-canvas";

/** 컨테이너 외곽 (사이드바 · 차트 · 테이블 · 상세 · rail 카드) */
export const SURFACE_SHELL_CLASS = "border border-line bg-surface";

/** 컨테이너 내부 구분선 (테이블 헤더 하단 · 섹션 헤더 등) */
export const SURFACE_DIVIDER_CLASS = "border-line-soft";
