// In Next.js, this file would be called: app/providers.tsx
'use client';

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';
import DarkModeSync from '@/components/DarkModeSync';
import { TooltipProvider } from '@/components/ui/tooltip';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <DarkModeSync />
      <QueryClientProvider client={queryClient}>
        {/*
         * TooltipProvider · @radix-ui/react-tooltip 은 상위 provider 필요.
         * root 배치로 모든 페이지 tooltip 이 동일 delay/skip 설정 공유.
         * delayDuration 200 · 빠르게 노출되되 hover 이동 시 노이즈 방지.
         */}
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
          {children}
        </TooltipProvider>
        {/*
         * sonner · 우측 상단 스택 토스트 · 앱 전역 root 마운트
         * · richColors : success/error/warning 표준 톤 자동 적용
         * · closeButton: hover 시 X 버튼 노출
         * · offset     : 상단 헤더 (64px) 아래 살짝 여백
         * · 트레이딩 UI 컨텍스트: 밀림/최고가 갱신 등 realtime 알림에 사용
         */}
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          offset={80}
          toastOptions={{
            classNames: {
              toast:
                'font-pretendard border border-slate-200 shadow-lg',
              title: 'text-[13px] font-bold -tracking-[0.01em]',
              description: 'text-[12px] text-slate-600',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
