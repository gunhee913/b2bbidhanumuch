import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';

/** 스카이스캐너 홈 헤드라인과 같은 글꼴(Noto Sans KR 700) · 소비자 홈의 큰 제목에만 쓴다. */
const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-noto-kr',
});

export const metadata: Metadata = {
  title: '농협미트센터 | 한우 부분육 공동구매',
  description:
    '한우 부분육을 구좌 단위로 나누어 도매가에 가깝게 구매하세요. 모집 완료 후 소분 가공, 냉장 배송.',
};

export const viewport: Viewport = {
  width: 1440,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * `/group-buy` 소비자 라우트 껍데기 · PC 우선.
 * 경매장과 같은 토큰(canvas/surface/content)을 쓴다. 라이트 고정은 `GroupBuyShell` 이 맡는다 —
 * 소비자는 테마 토글이 없고, 다크로 남은 중도매인 세션의 영향을 받지 않아야 한다.
 */
export default function GroupBuyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${notoSansKr.variable} bg-canvas text-content`}>{children}</div>;
}
