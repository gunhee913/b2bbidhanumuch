import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "부분육 온라인경매 | 한우 B2B 경매 플랫폼",
  description:
    "국내 최초 한우 부분육 B2B 온라인 경매 플랫폼. 실시간 경매 현황과 회차 정보를 확인하세요.",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-w-[1280px] bg-slate-50 text-slate-900">{children}</div>
  );
}
