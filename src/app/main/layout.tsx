import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공판장 선택 | 부분육 온라인경매",
  description: "농협 부분육 온라인경매 · 공판장을 선택하고 경매장으로 이동합니다.",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
