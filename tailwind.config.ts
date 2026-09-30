import type { Config } from "tailwindcss";

const config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /**
       * 플랫폼 타입 스케일 · 8단계 고정 · 0.5px 단위 arbitrary 값 대신 이 토큰만 쓴다.
       *   micro 10 (칩·단위) · cap 11 (라벨·표 헤더) · label 12 (보조 본문·버튼)
       *   body 13 (본문·표 값) · lead 14 (강조 본문) · title 15 (패널 제목·CTA)
       *   heading 18 (섹션 제목·입력 금액) · display 24 (타이머·페이지 제목)
       * 굵기는 3단계 · medium(보조) · semibold(값·라벨) · bold(제목·핵심 숫자)
       */
      fontSize: {
        micro: ["10px", { lineHeight: "14px" }],
        cap: ["11px", { lineHeight: "14px" }],
        label: ["12px", { lineHeight: "16px" }],
        body: ["13px", { lineHeight: "18px" }],
        lead: ["14px", { lineHeight: "18px" }],
        title: ["15px", { lineHeight: "20px" }],
        heading: ["18px", { lineHeight: "24px" }],
        display: ["24px", { lineHeight: "28px" }],
      },
      colors: {
        // Shadcn-ui 호환 토큰
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /**
         * 브랜드 팔레트 · /main 진입 화면 기준.
         * ink  · 먹색 · 실행 버튼 · 포커스 · 선택 (`--content` 와 같은 값)
         * gold · 금색 · /main 의 농협 심볼 · 하이라이트 전용 · 경매장 화면은 모노톤(ink)
         * 경고는 orange, 오류·패찰은 rose.
         */
        ink: {
          DEFAULT: "#17171c",
          hover: "#2b2b33",
        },
        /**
         * 경매장 서피스 토큰 · 명암 전환의 이음매.
         *
         * 표·차트·패널이 42개 컴포넌트에 흩어져 있어 `dark:` 배리언트를 480곳에 다는 대신
         * 의미 이름 하나만 쓰고 값은 `globals.css` 의 `:root` / `.dark` 에서 갈아끼운다.
         *   canvas  페이지 바탕 · surface 패널 · line 경계 · content 글자
         * 상태색(rose·amber·sky·emerald)은 두 모드에서 같은 뜻이라 토큰화하지 않는다.
         */
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          /** zebra · hover · disabled (light slate-50) */
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
          /** 표 머리 · 선택 행 (light slate-100) */
          accent: "rgb(var(--surface-accent) / <alpha-value>)",
          /** 결과 열 머리 · 회색 칩 (light slate-200) */
          strong: "rgb(var(--surface-strong) / <alpha-value>)",
        },
        /**
         * 반전 면 · 선택 탭·낙찰 배지처럼 "바탕과 글자를 뒤집어" 강조하는 자리.
         * 라이트에서 먹색 바탕 + 흰 글자이던 것이 다크에서는 밝은 바탕 + 먹색 글자가 된다.
         * `ink` 를 그대로 쓰면 다크에서 바탕색과 같아져 칩이 사라진다.
         */
        inverse: {
          DEFAULT: "rgb(var(--inverse) / <alpha-value>)",
          content: "rgb(var(--on-inverse) / <alpha-value>)",
        },
        /**
         * 등락색 · 국내 시세 관례(상승 red / 하락 blue).
         * tailwind 기본 red·blue 는 하락이 하늘색으로 뜨고 상승이 주황으로 기울어
         * 시세 화면 전용 값을 따로 둔다. 다크에서는 `globals.css` 가 한 톤 밝힌다.
         */
        rise: "rgb(var(--rise) / <alpha-value>)",
        fall: "rgb(var(--fall) / <alpha-value>)",
        line: {
          /** 패널 외곽 (light slate-200) */
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          /** 내부 구분선 (light slate-100) */
          soft: "rgb(var(--line-soft) / <alpha-value>)",
        },
        content: {
          /** 본문 최고 대비 (light slate-900) */
          DEFAULT: "rgb(var(--content) / <alpha-value>)",
          /** 값·강조 (light slate-700) */
          mid: "rgb(var(--content-mid) / <alpha-value>)",
          /** 라벨 (light slate-500) */
          soft: "rgb(var(--content-soft) / <alpha-value>)",
          /** 보조 라벨·단위 (light slate-400) */
          faint: "rgb(var(--content-faint) / <alpha-value>)",
          /** placeholder · 빈 값 (light slate-300) */
          ghost: "rgb(var(--content-ghost) / <alpha-value>)",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // 카운트다운 critical(≤30초) 구간 · 기본 pulse 보다 얕게 (0.55) · 숫자 가독성 유지
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-soft": "pulse-soft 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
