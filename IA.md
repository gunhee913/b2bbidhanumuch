# HanuMuch IA (Information Architecture)

> **요약**: 본 문서는 PRD를 바탕으로 **Topbar 내비게이션**을 사용하는 **B2B 한우 부분육 동시경매 웹 플랫폼**의 정보 구조를 정의합니다. 인증은 \*\*필수(required)\*\*이며, 권한에 따라 화면/메뉴가 달라집니다(가공업체·중도매인/매참인·관리자).

---

## 1. Site Map (사이트 맵)

> 괄호( )는 접근 권한을 표기: S=가공업체(판매자), B=중도매인/매참인(구매자), A=관리자

* **/auth/**

  * `/auth/login` (공통, 미인증 전용)
  * `/auth/reset-password` (공통)
* **/** (공통) 대시보드

  * 실시간 경매 카드, 내 입찰/등록 현황, 알림
* **/auctions/** (공통)

  * `/auctions` 실시간 경매 보드(동시경매)
  * `/auctions/[sessionId]` 특정 회차 상세(라운드·타이머·로트 리스트)
  * `/auctions/[sessionId]/lots/[lotId]` 로트 상세
* **/lots/**

  * `/lots` 내 로트 목록 (S) / 관심 로트(찜) (B)
  * `/lots/new` 로트 등록 (S)
  * `/lots/[lotId]/edit` (S)
* **/settlement/** (공통)

  * `/settlement` 정산 요약
  * `/settlement/invoices` 세금계산서/거래명세서
  * `/settlement/[tradeId]` 거래/정산 상세
* **/orders/** (B) 낙찰 주문/인수 현황
* **/fulfillment/** (공통) 물류/인수증 관리
* **/disputes/** (공통) 이의제기/처리
* **/admin/** (A)

  * `/admin/mart` 경매 일정/회차 관리
  * `/admin/review` 로트 검수/승인
  * `/admin/users` 권한/계정
  * `/admin/audit` 감사 로그/규칙
* **/settings/** (공통) 프로필·기업정보·한도/보증

---

## 2. User Flow (사용자 흐름)

### 2.1 판매자(가공업체, S) – 로트 등록→경매→정산

1. **로그인** → 2) **/lots/new 로트 등록**(부위·등급·중량·영상/라벨 업로드) →
2. **관리자 검수/승인** → 4) **회차 자동 배정** →
3. **경매 진행 / 실시간 가격 관찰** → 6) **낙찰 알림 수신** →
4. **정산서 확인** → 8) **물류/인수증 처리** → 9) **종결**

### 2.2 구매자(중도매인/매참인, B) – 탐색→입찰(동시)→인수

1. **로그인** → 2) **/auctions 실시간 보드**(필터/즐겨찾기) →
2. **여러 로트 동시 관찰**(라운드 타이머) → 4) **호가/자동호가 설정** →
3. **라운드 종료 시 낙찰 확정** → 6) **/orders 낙찰 주문 관리** →
4. **정산 및 인수** → 8) **물류 추적/인수증 업로드** → 9) **종결**

### 2.3 관리자(공판장, A) – 운영/감사

1. **로그인** → 2) **/admin/review 로트 검수/승인** →
2. **/admin/mart 회차/라운드 파라미터 설정**(틱/시간) →
3. **경매 모니터링**(일시정지/재개/재경매) → 5) **분쟁 처리** → 6) **감사 로그/리포트**

---

## 3. Navigation Structure (내비게이션 구조: Topbar)

* **Topbar(고정)**

  * **로고/홈**: `/`
  * **경매 보드**: `/auctions`
  * **로트**: (S) `/lots`, (B) `/lots?view=bookmarks`
  * **정산**: `/settlement`
  * **주문/인수**: (B) `/orders`, (공통) `/fulfillment`
  * **관리자**: (A) `/admin`
  * **알림 아이콘**(실시간), **도움말**, **프로필 드롭다운**(설정/로그아웃)
* **보조 내비(페이지 상단 탭/필터 바)**

  * 경매 보드: `모든 로트 | 즐겨찾기 | 진행중만` + 필터(부위/등급/중량/도체일/온도)
  * 정산: `요약 | 전표 | 세금계산서` 탭
  * 관리자: `회차 | 검수 | 사용자 | 감사`

---

## 4. Page Hierarchy (페이지 계층)

```
App Root
├─ Auth (public)
│  ├─ Login
│  └─ Reset Password
├─ Dashboard (/)
├─ Auctions
│  ├─ Session List (/auctions)
│  ├─ Session Detail (/auctions/[sessionId])
│  └─ Lot Detail (/auctions/[sessionId]/lots/[lotId])
├─ Lots
│  ├─ My Lots (/lots) [S]
│  ├─ New Lot (/lots/new) [S]
│  └─ Edit Lot (/lots/[lotId]/edit) [S]
├─ Settlement
│  ├─ Summary (/settlement)
│  ├─ Invoices (/settlement/invoices)
│  └─ Trade Detail (/settlement/[tradeId])
├─ Orders (/orders) [B]
├─ Fulfillment (/fulfillment)
├─ Disputes (/disputes)
├─ Admin (/admin) [A]
│  ├─ Mart (/admin/mart)
│  ├─ Review (/admin/review)
│  ├─ Users (/admin/users)
│  └─ Audit (/admin/audit)
└─ Settings (/settings)
```

---

## 5. Content Organization (콘텐츠 구성)

| 페이지                           | 주요 정보(읽기)                           | 주요 입력(쓰기)             | 상태/알림                       |
| ----------------------------- | ----------------------------------- | --------------------- | --------------------------- |
| 대시보드 `/`                      | 진행중 회차, 내 입찰/등록 현황, 알림 요약           | 없음                    | 실시간 알림 스트림, 경매 시작/종료        |
| 경매 보드 `/auctions`             | 회차 리스트, 라운드 타이머, 로트 타일(가격/등급/중량/영상) | 입찰(+틱/맞추기/자동호가), 즐겨찾기 | 가격 갱신, 시간 경고(aria-live), 낙찰 |
| 회차 상세 `/auctions/[sessionId]` | 라운드/규칙, 활성 로트 테이블/그리드               | 다중 로트 동시 입찰           | 동점/무효/재경매 안내                |
| 로트 상세                         | 등급/중량/도체일/포장/영상, 판매자 정보             | 입찰, 문의                | 품질주의/주의사항 토스트               |
| 로트 등록 `/lots/new` (S)         | 등록 가이드                              | 부위/등급/중량/가격조건, 영상 업로드 | 검수 대기/반려 사유                 |
| 정산 `/settlement`              | 정산 합계, 수수료, 전표                      | (없음)                  | 정산 완료/미납 경고                 |
| 주문/인수 `/orders` (B)           | 낙찰 주문, 인수 일정                        | 인수증 업로드, 일정 변경 요청     | 인수 지연/이상 온도 알림              |
| 관리자 `/admin/*` (A)            | 회차·검수·유저·감사 데이터                     | 승인/반려, 파라미터 변경, 제재    | 정책 변경, 일시정지/재개              |

---

## 6. Interaction Patterns (인터랙션 패턴)

* **실시간 갱신**: 가격·타이머·참여자 수는 **저지연 스트리밍**으로 반영.

  * 시각적 변화(숫자 점프)는 **애니메이션 최소화**(깜빡임 방지), **색상 대비 강화**.
* **입찰 행동**

  * **+틱**, **맞추기(현재가로 즉시 제시)**, **자동호가(상한가/틱폭/유효 라운드)**.
  * **서버 검증 후 확정**(낙관적 업데이트 금지), 실패 시 **명확한 사유** 표기.
* **라운드/타이머**

  * 고정 상단 **라운드 바**(남은 시간, 활성 로트 수).
  * 종료 임박 시 **음성/진동 옵션**(접근성), `aria-live="assertive"`로 안내.
* **필터/정렬/즐겨찾기**

  * 부위·등급·중량·도체일·보관(냉장/냉동)·영상 유무.
  * **필터 상태는 URL 쿼리**로 동기화(딥링크 공유).
* **오류/예외 처리**

  * 중복 입찰, 한도 초과, 라운드 종료, 연결 끊김 → **토스트 + 인라인 에러**.
  * 네트워크 복구 시 **자동 재접속** 안내.
* **접근성**

  * 키보드 내비(탭 순서), 큰 호가 버튼(모바일), 적색·청색만에 의존하지 않는 신호, 대체 텍스트(영상 썸네일).
  * 실시간 변동 정보는 스크린 리더용 **라이브 리전** 제공.
* **확인/보호**

  * 고액 자동호가 설정 시 **이중 확인 모달**.
  * 관리자 조치(일시정지/재경매) 시 **전 참가자 브로드캐스트**.

---

## 7. URL Structure (URL 설계)

> Next.js(App Router) 기준, 동적 세그먼트는 대괄호 표기

* 인증: `/auth/login`, `/auth/reset-password`
* 대시보드: `/`
* 경매:

  * 리스트: `/auctions?view=grid&grade=1++&part=ribeye&status=live`
  * 회차 상세: `/auctions/[sessionId]?tab=lots`
  * 로트 상세: `/auctions/[sessionId]/lots/[lotId]`
* 로트: `/lots`, `/lots/new`, `/lots/[lotId]/edit`
* 정산: `/settlement`, `/settlement/invoices`, `/settlement/[tradeId]`
* 주문/인수: `/orders`, `/fulfillment`
* 분쟁: `/disputes/[caseId]?step=review`
* 관리자: `/admin/mart`, `/admin/review`, `/admin/users`, `/admin/audit`
* 설정: `/settings/profile`, `/settings/company`, `/settings/limits`
* **딥링크 원칙**

  * 모든 필터/정렬/탭 상태는 **쿼리스트링**으로 반영(공유/복원 용이).
  * 실시간 화면(보드)은 `?autoRefresh=1` 등 옵션 허용.

---

## 8. Component Hierarchy (컴포넌트 계층)

### 8.1 전역 레이아웃

* `AppLayout`

  * `Topbar`(로고, 주요 메뉴, 검색/필터 접근, 알림, 프로필)
  * `Toaster`(전역 알림)
  * `RealtimeProvider`(WS/Presence)
  * `AuthGuard`(필수 인증, RBAC)

### 8.2 경매 영역

* `AuctionBoardPage`

  * `BoardHeader`(라운드/타이머/필터바)
  * `LotGrid` / `LotTable`

    * `LotCard`(가격/등급/중량/썸네일/상태 뱃지)

      * `BidControls`(+틱/맞추기/자동호가)
      * `FavoriteButton`
  * `TickerBar`(최근 체결/호가 스트림)
* `SessionDetailPage`

  * `RoundTimer`
  * `ActiveLotsPanel`
  * `ChatHelp`(선택) / `SystemNotice`
* `LotDetailDrawer/Page`

  * `MediaViewer`(영상/이미지)
  * `SpecsPanel`(부위/등급/중량/포장/도체일)
  * `BidPanel`(입찰/자동호가 설정)

### 8.3 로트 관리(판매자)

* `LotForm`(스텝폼: 기본정보 → 규격 → 미디어 → 검수 제출)
* `BulkUploadModal`(CSV/영상 업로드)
* `LabelQRGenerator`

### 8.4 정산/주문/물류

* `SettlementSummary` / `InvoiceList` / `TradeDetail`
* `OrderList` / `PickupSchedule` / `ProofOfDeliveryUploader`

### 8.5 관리자

* `SessionConfigurator`(틱/라운드/일정)
* `LotReviewTable`(승인/반려)
* `UserRoleManager`
* `AuditLogTable`

---

## 9. UX & Responsive (UX/반응형 고려)

* **모바일(≤768px)**:

  * 상단 고정 **타이머 바**, 하단 고정 **입찰 바**(큰 버튼).
  * 그리드 → 단일 카드 스택, 핵심 메타 우선.
* **태블릿**: 2열 카드, 고정 필터 드로어.
* **데스크톱(≥1024px)**: 3–4열 카드/테이블, 보조 패널(티커/채팅).
* **성능**: 이미지 지연 로딩, 비디오 저화질 프리뷰 옵션, 스켈레톤 로딩.

---

## 10. 접근성 & UX 가이드 (Accessibility & UX)

* **색 대비**: WCAG 준수(텍스트 대비 4.5:1 이상), 상태 변화는 색상 외 아이콘/텍스트 병행.
* **라이브 리전**: 가격/타이머 변경을 `aria-live`로 낭독.
* **키보드 조작**: 탭 순서 보장, 입찰 단축키(예: `+`=+틱, `Enter`=입찰).
* **에러 가시성**: 인라인 에러 + 토스트 병행, 문제 해결 가이드 링크.

---

## 11. SEO & 링크 전략 (인증 필수 앱 기준)

* **인증 전 노출 가능 페이지**: `/auth/*`와 간략 소개/도움말(선택).
* **메타데이터**: 각 페이지 `title/description` 구성, 공유용 OG는 **로트 상세**의 비공개 썸네일 대신 기본 템플릿 사용(보안).
* **URL 일관성**: 영문 슬러그, 하이픈 구분, 쿼리 파라미터는 의미 명확히.
* **성능**: SSR/Streaming으로 초기 TTFB 최적화, 중요 상호작용은 지연 로딩 억제.

---

## 12. 보안 & 권한(IA 관점)

* **AuthGuard + RBAC**: 메뉴/페이지 단위 접근 제어(Topbar 렌더도 권한 기반).
* **감사 목적 링크**: `/admin/audit`는 쿼리로 기간/사용자/행위 필터 지원(딥링크 공유).

---

## 13. 데이터 노출 원칙(IA 범위 내)

* 실시간 화면에 표시되는 정보는 **최소 필요 필드**(등급/중량/현재가/남은시간/영상 썸네일).
* 상세 정보(계약/정산/개인/기업)는 **상세 페이지에서 단계적 공개**.

---

### 부록) 예시 내비게이션(Topbar, 권한별)

| 역할     | Topbar 메뉴                             |
| ------ | ------------------------------------- |
| 구매자(B) | 홈 · 경매 · 로트(즐겨찾기) · 정산 · 주문/인수 · (설정) |
| 판매자(S) | 홈 · 경매 · 로트(내 로트/등록) · 정산 · 물류 · (설정) |
| 관리자(A) | 홈 · 경매 · 관리자(회차/검수/유저/감사) · 정산 · (설정) |

> 본 IA는 **데이터 스키마/저장 설계**를 포함하지 않으며, PRD의 동시경매·실시간·정산 요구를 반영한 화면 구조와 상호작용 패턴에 집중합니다. 필요 시 와이어플로우/와이어프레임 단계로 확장 가능합니다.
