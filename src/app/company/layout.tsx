import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '상장업체 | 부분육 온라인경매',
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 0,
  userScalable: true,
};

export default function CompanyRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
