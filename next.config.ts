import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    // 모바일 앱 웹 체험판(Flutter web) · public/app/ 에 빌드 결과물 · /app 으로 들어오면 index.html
    return [{ source: '/app', destination: '/app/index.html' }];
  },
  async redirects() {
    // 공동구매 관리자가 /admin/mall(직거래몰 관리자)로 이동함 · 북마크 호환
    return [
      {
        source: '/admin/group-buy/:path*',
        destination: '/admin/mall/group-buy/:path*',
        permanent: false,
      },
      {
        source: '/group-buy/quote',
        destination: '/group-buy/gift',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
