import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 1280,
  initialScale: 0,
  userScalable: true,
};

export default function DealerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
