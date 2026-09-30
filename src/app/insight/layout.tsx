import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "시세·동향 | 부분육 온라인경매",
  description:
    "부위별 낙찰 시세 시계열과 등급 분포·요일별 평균단가 통계를 한 곳에서 확인하세요.",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function InsightLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-w-[1280px] bg-surface-muted text-content">{children}</div>
  );
}
