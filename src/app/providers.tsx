// In Next.js, this file would be called: app/providers.tsx
"use client";

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import DarkModeSync from "@/components/DarkModeSync";
import { TooltipProvider } from "@/components/ui/tooltip";

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
         *
         * 색은 토큰으로 받는다. 흰 배경을 못 박아 두면 어두운 화면에서 토스트만
         * 흰 판으로 떠, 알림 하나가 화면에서 제일 밝은 것이 된다.
         * richColors 는 쓰지 않는다 · 상태는 아이콘 색 하나로만.
         * 모서리는 본문 패널(2px)보다 둥글게 — 바닥에 붙은 판이 아니라 잠깐 떠 있다
         * 사라지는 것이라, 떠 있음을 모양이 먼저 말하게 한다.
         * closeButton 은 우상단 · hover 시만 노출 (globals.css).
         */}
        <SonnerToaster
          position="top-right"
          closeButton
          offset={64}
          /*
           * 토스트 폭 · 기본 토스트와 직접 그린 영수증이 같이 쓴다
           * (`globals.css` 의 `[data-styled="false"]` 규칙이 영수증에도 이 값을 물린다).
           *
           * 영수증은 라벨 좌 · 값 우로 짠 표라 둘 사이가 **적당히** 비어 있어야 한다.
           * 내용 폭(270px 남짓)에 맞추면 「부위」 와 「업진 · 1++A(9) · 2.5kg」 이 붙어
           * 한 덩어리로 읽히고, 480 까지 벌리면 이번엔 라벨과 값이 양 끝으로 달아나
           * 같은 줄인지를 눈으로 이어 붙여야 한다. 가장 긴 줄에 130px 쯤 남는 400.
           */
          style={{ "--width": "400px" } as CSSProperties}
          icons={{
            success: (
              <CircleCheck className="h-4 w-4 text-sky-500" aria-hidden />
            ),
            error: <CircleX className="h-4 w-4 text-rose-500" aria-hidden />,
            warning: (
              <TriangleAlert className="h-4 w-4 text-amber-500" aria-hidden />
            ),
            info: <Info className="h-4 w-4 text-content-soft" aria-hidden />,
          }}
          toastOptions={{
            classNames: {
              /*
               * 카드 껍데기(바탕·테두리·모서리·여백)는 여기 두면 안 된다.
               * 이 클래스는 `toast.custom` 에도 그대로 붙는데, 그쪽은 제 카드를
               * 직접 그리므로 카드 안에 카드가 생긴다. 껍데기는 기본 토스트에만
               * 걸리도록 `globals.css` 의 `[data-styled="true"]` 아래에 둔다.
               */
              toast: "font-pretendard",
              title: "text-[13.5px] font-bold -tracking-[0.01em] tabular-nums",
              description:
                "!mt-0.5 !text-[12.5px] !text-content-soft tabular-nums",
              actionButton:
                "!bg-transparent !text-content !text-[12px] !font-semibold !px-1 hover:!underline",
              cancelButton:
                "!bg-transparent !text-content-soft !text-[12px] !font-medium !px-1 hover:!underline",
              closeButton:
                "!border-0 !bg-transparent !text-content-faint hover:!bg-surface-accent hover:!text-content",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
