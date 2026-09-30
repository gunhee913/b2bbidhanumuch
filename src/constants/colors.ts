/**
 * 브랜드 컬러 · /main 진입 화면 기준 · tailwind.config 의 `ink` / `gold` 와 같은 값.
 *
 * 클래스로 쓸 수 있는 곳은 tailwind 토큰(`bg-ink`, `text-gold-700` …)을 쓰고,
 * 이 상수는 차트 라이브러리처럼 hex 문자열이 필요한 곳에서만 쓴다.
 *
 * 역할
 * - ink  · 실행 버튼 · 포커스 · 선택 · 본문 텍스트
 * - gold · /main 의 농협 심볼 · 하이라이트 전용 (경매장은 모노톤)
 * - warning(orange) · 저장 안 된 입력 · 마감 임박
 * - danger(rose)    · 오류 · 패찰
 */
export const BRAND_HEX = {
  ink: "#0f172a",
  inkHover: "#1e293b",
  gold400: "#fbbf24",
  gold500: "#f59e0b",
  gold600: "#d97706",
  gold700: "#b45309",
  warning: "#ea580c",
  danger: "#e11d48",
  muted: "#94a3b8",
} as const;
