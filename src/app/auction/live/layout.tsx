import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "경매장 | 부분육 온라인경매",
  description:
    "농협 공판장별 부분육 실시간 경매를 참여하고 관전하세요. 회차별 진행 상황과 상장 개체 정보를 한 눈에 확인할 수 있습니다.",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AuctionLiveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-w-[1280px] bg-surface-muted text-content">
      {children}
    </div>
  );
}
