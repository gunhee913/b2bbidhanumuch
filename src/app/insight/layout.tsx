import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "분석·통계 | 부분육 온라인경매",
  description:
    "부위별 낙찰 시세 시계열과 등급 분포·요일별 평균단가 통계를 한 곳에서 확인하세요.",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * `/insight` 라우트 껍데기.
 *
 * 바탕은 캔버스다 — 경매장·경매내역·배송지시와 같다. 예전엔 `bg-surface-muted`
 * 였는데, 그러면 패널(`bg-surface`)과 바탕이 한 단계밖에 안 벌어져 패널 사이
 * 8px 틈이 틈으로 안 읽혔다. 네 화면이 같은 바탕 위에 서야 오갈 때 눈이 다시
 * 자리를 잡지 않는다.
 *
 * 최소 폭은 여기서 안 잡는다 — 레일 56 까지 더한 값을 본문 껍데기
 * (`insightShellClass`)가 쥐고 있어, 두 군데서 잡으면 작은 쪽이 조용히 묻힌다.
 */
export default function InsightLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-canvas text-content">{children}</div>;
}
