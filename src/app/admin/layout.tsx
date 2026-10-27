import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '관리자 | 부분육 온라인경매',
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 0,
  userScalable: true,
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
