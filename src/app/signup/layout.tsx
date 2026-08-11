import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "매참인 신청 | 부분육 온라인경매",
  description:
    "한우 부분육 온라인 경매 매참인(중도매인) 신청 및 전자 약정 페이지.",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-white text-slate-900">{children}</div>;
}
