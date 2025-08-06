# PRD: **HanuMuch – B2B 기반 한우 부분육 온라인 경매 플랫폼**

## 1) 제품 상세 설명 (Detailed product description)

* **목표**: 가공업체(판매자)와 중도매인/매참인(구매자)이 **동시경매** 방식으로 한우 부분육을 **실시간**으로 거래하는 B2B 플랫폼을 제공한다.
* **핵심 가치**

  * **공정성/투명성**: 영상·등급·도체분석 정보 기반의 사전 검수 정보 제공, 실시간 입찰 로그/감사 이력. (국내 축산·농산물 도매 시장의 온라인·전자경매 도입 기조와 맥락 일치) ([ekape.or.kr][1], [푸드뉴스][2])
  * **속도/효율**: 다수 로트(lot)를 **동시에** 경매하여 거래 효율을 극대화. (동시다중라운드경매(SMRA)와 같은 동시경매 이론적 근거) ([동아사이언스][3], [m.economyinsight.co.kr][4])
  * **접근성**: 웹 기반 반응형 UI로 현장/원격 동시 참여, 실시간 오디오·비디오/메시징 등 동시성 UX 벤치마킹. ([Manheim][5], [MyManheim][6])

> **용어 정의**
>
> * **동시경매**: 복수 로트를 동일 시간대(라운드 또는 틱 단위)로 열고 병렬적으로 가격 형성을 진행하는 경매 운영 방식. (SMRA 등 다중라운드 동시입찰 방식의 실무 변형을 채택) ([KISDI][7])

---

## 2) 레퍼런스 서비스 및 근거 (Reference Services with detailed rationale)

| 구분              | 서비스/자료                                           | 시사점(플랫폼 설계에의 반영)                                                                                                          |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 실시간 도매 경매       | **농협 공판장 통합거래시스템 – 실시간 경매현황**                    | 국내 공판장 기반 실시간 경매 정보 제공 UX/지표 구성 레퍼런스. 실시간 현황판(대시보드) 구성, 경매 결과 피드백 구조 반영. ([newgp.nonghyup.com][8])                        |
| 화훼 전자경매         | **aT 화훼공판장 – 실시간 경매/전자경매 재구축**                   | 경매 시간표/현황 제공, 무선 응찰, 온라인 이미지 경매 등 원격 응찰 신뢰성/속도 개선 사례. 실시간 타임라인, 무선/원격 응찰 안정성 고려. ([Flower][9], [IKP News][10], [유튜브][11]) |
| 축산 온라인 경매 정책·도입 | **축산정책지원사업(온라인경매 시스템 추진)**, **축산물도매시장 온라인경매 적용** | 영상/등급/도체분석 정보의 디지털화·중계 필요성 근거. 메타데이터 표준, 전자거래 절차 설계에 반영. ([ekape.or.kr][1], [푸드뉴스][2])                                    |
| 동시경매 이론         | **SMRA(동시다중라운드경매) 소개 기사/연구**                     | 다품목 동시 가격형성의 승자저주 완화·효율성 근거. 라운드·활성 로트·정지 규칙 설계에 반영. ([동아사이언스][3], [m.economyinsight.co.kr][4])                           |
| B2B 실시간 경매 UX   | **Manheim Simulcast**                            | 실시간 오디오/비디오, 차선(레인) 기반 동시 진행, 채팅/오퍼/재런(재경매) UX 레퍼런스. 동시 진행 화면, 원격 응찰자 메시징/알림 패턴 반영. ([Manheim][5], [MyManheim][6])        |

---

## 3) 핵심 기능 및 명세 (Core features & specifications)

### A. 경매 운영(동시경매)

* **로트(Lot) 관리**: 품목(부위), 등급, 중량/수율, 포장/보관, 유통기한, 영상/이미지, 출하자/가공업체 정보 사전 등록. (영상/등급/도체 분석 정보 공개 필요성 근거) ([ekape.or.kr][1], [푸드뉴스][2])
* **경매 방식**

  * **SMRA-유사 동시 라운드**: N개 로트를 같은 라운드로 묶어 가격 갱신을 병행. 라운드 종료 시 최고가 유효, 추가 호가 없으면 해당 로트 종료. ([동아사이언스][3])
  * **라운드 파라미터**: 라운드 시간(예: 20–60초), 최소 인상 단위(틱), 활동 규칙(활성 로트 유지 요건), 전체 정지 조건(전 로트 추가 호가 없음). *(권장 초기값은 운영 테스트로 보정)*
* **응찰 제어**: 자동 호가(프록시 비딩), 상한/보증금 기반 한도관리, 동점 처리(선입찰 우선·무작위·재경합 중 택1 정책).
* **반품/이의 제기**: 품질 이의 제기 SLA(예: 냉장/냉동 파손, 등급 오표시)와 처리 루틴.
* **가공업체 UI**: 로트 일괄 업로드, 영상 업로더, 라벨/QR 생성, 경매 스케줄러.
* **구매자 UI**: **동시경매 보드**(다수 로트 타일/리스트), 실시간 호가 스트림, 즐겨찾기/필터(부위·등급·중량·도체일 등), **스나이핑 방지용 라운드 종료 규칙**(라운드 기반이므로 자연 완화). ([KISDI][7])
* **관리자(공판장) 콘솔**: 경매 개설/종료, 로트 검수 승인, 이의·분쟁 처리, 심판(경매 일시정지/재개), 감사 로그.

### B. 실시간 동기화(저지연)

* **요구 성능**: 동일 경매 라운드 내 **< 300ms(권장) 알림 체감** 목표, 1개 경매 회차에서 동시 시청/응찰 수백 세션 규모 확장. *(구체 수치는 PoC 후 확정)*
* **기술 수단**:

  * **Supabase Realtime – Postgres Changes**로 DB 변경(입찰/라운드 상태) 이벤트를 구독해 **UI 실시간 갱신**. ([Supabase][12])
  * **Supabase Realtime – Broadcast/Presence**로 경매방 접속자 상태/현재가 흐름, 타이머 동기화. ([Supabase][13])
  * **Next.js App Router + Server Actions**로 서버측 입찰 검증/처리 → 라우트 캐시 재검증을 통한 UI 최신화. ([Next.js][14], [GitHub][15])

### C. 정산/대금 결제(필수 권장)

* **정산 시나리오**: 당일 일괄 정산(도매시장 관행), 로트별/회차별 세금계산서 발행, 수수료/하역비/운송비 분리.
* **보증/에스크로**: 사전 보증금(예치)·낙찰 후 자동 상계, 대금 미납 리스크 관리.
* **정산 리포트**: 회차별 정산서, 거래명세서, 세금계산서 연동(전자세금계산 API는 차기 단계).

### D. 권한/보안/RBAC

* **역할**: 가공업체(판매자), 중도매인/매참인(구매자), 관리자(공판장).
* **인증/인가**: Supabase Auth + **RLS(Row Level Security)** 정책으로 접근 제어. ([Supabase][16])
* **감사/기록**: 모든 입찰·상태 전환에 대한 불변 로그(타임스탬프/주체/IP/서명).

### E. 반응형 UX(웹)

* **데스크톱**: 멀티 레인(또는 그리드) **동시경매 보드**, 실시간 티커, 영상 프리뷰 패널.
* **모바일**: 우선순위 로트 집중 보기, 큰 입찰 버튼, 하단 고정 타이머/현재가 바.
* **접근성**: 키보드 숏컷, 명확한 색 대비, 로우밴드 모드(저품질 스트림/지연 허용).
* **운영 보드**: 경매 스케줄/상태, 로트 큐, 이상 탐지 알림.

---

## 4) 제안 추가 기능 (Suggested additional features)

1. **사전 한도·담보 관리/자동 승인 로직**: 신용·보증금·연체 이력 기반 입찰 한도 자동 조정.
2. **라이브 도움말/경매 채팅**: 진행자–응찰자 간 실시간 질의(Manheim의 채팅형 협상 참고). ([MyManheim][6])
3. **이상탐지(페어플레이)**: 동일 IP 다중 계정, 비정상 급등락, 담합 패턴 알림.
4. **물류 연계**: 낙찰→픽업/배송(콜드체인) 상태 추적, 인수증/온도 로그 첨부.
5. **보고서/시세 피드**: 회차별 평균가, 등급·부위별 체결 추이, 운영 KPI 대시보드.
6. **온라인 이미지 경매 옵션**: 현장 검수가 어려운 경우 사전 이미지·영상 기반 “이미지 경매” 세션 운영(화훼 사례 참조). ([유튜브][11])

---

## 5) 사용자 페르소나 & 시나리오 (User persona and scenarios)

### A. 페르소나

* **가공업체(판매자)**: 부분육 재고를 회전시키고 고정 거래처 외 신규 수요를 확보하고자 함. 로트 대량 업로드와 스케줄 관리, 클레임 최소화가 중요.
* **중도매인/매참인(구매자)**: 원하는 부위·등급을 **동시에** 비교하고 빠르게 체결, 명확한 정산/인수 프로세스 선호.
* **관리자(공판장)**: 공정한 진행·분쟁 최소화가 최우선. 회차 운영/감사/리포팅 도구 필요.

### B. 대표 시나리오(간략)

1. **경매 개설(관리자)** → 회차 시간/라운드 길이/입찰 틱 설정 → 승인된 로트 자동 큐잉.
2. **로트 등록(가공업체)** → 영상/등급/중량/라벨 업로드 → 검수 승인 후 회차 배정. ([ekape.or.kr][1])
3. **입찰(구매자)** → 반응형 보드에서 관심 로트 복수 선택 → 라운드 타이머에 맞춰 호가 → **라운드 종료 시 추가 호가 없는 로트 확정**(동시 라운드). ([동아사이언스][3])
4. **체결/정산** → 낙찰 통지 → 세금계산/수수료 정산 → 픽업/운송 연계 → 인수확정/종결.
5. **이의 제기** → 근거자료 제출 → 심사/조정/환불(필요 시) → 로그 보관.

---

## 6) 기술 스택 권고 (Technical stack recommendations)

### A. 프런트엔드

* **Next.js(App Router)**: 서버 컴포넌트/Suspense/Server Actions로 **입찰 서버검증→UI 재검증** 플로우 단순화. ([Next.js][14])
* **데이터 최신화**: Server Action 호출 후 관련 경로/레이아웃 재검증(캐시 무효화) 전략. ([GitHub][15])
* **UI**: 경매보드(그리드/레인), 실시간 티커, 타이머 동기화 컴포넌트, 저지연 영상 플레이어.
* **반응형**: Tailwind 혹은 CSS Modules. (Next.js CSS/Tailwind 지원) ([Next.js][17])

### B. 백엔드/데이터

* **Supabase(Postgres)**:

  * **Realtime – Postgres Changes**로 입찰/상태 변경 실시간 반영. ([Supabase][12])
  * **Realtime – Broadcast/Presence**로 경매방 접속자/타이머/알림 동기화. ([Supabase][13])
  * **Auth & RLS**로 역할별 접근 제어 및 보안 정책. ([Supabase][16])
  * (필요 시) **Self-hosted Realtime**로 초저지연·규모화 튜닝. ([Supabase][18])

### C. 아키텍처 개요

* **호가 처리**: 클라이언트→Server Action(입찰 검증/한도·라운드 규칙 확인)→DB 트랜잭션→Postgres Changes 이벤트 브로드캐스트→UI 자동 갱신. ([Next.js][19], [Supabase][20])
* **타이머/라운드**: 서버 권위(authoritative) 타이머를 기준으로 라운드 상태 전이, 지연·재시도 대비.
* **관측성**: 로그/메트릭 수집(입찰 지연, 이벤트 드랍율, 세션 수), 슬로우 쿼리/WS 드랍 알림.

### D. 비기능 요구사항(권장)

* **성능**: 단일 회차 동시 접속 수백 단위, 지연 < 300ms 체감 목표(지역 PoP/엣지 고려).
* **가용성**: 경매 시간대 **99.9%+**(권장). 다운타임 대비 수동 개입 툴 제공.
* **보안/컴플라이언스**: 전송/저장 암호화, 활동 로그, 접근 정책 감사.
* **접근성/다국어**: 한국어 우선, 향후 영어/베트남어 확장 여지.

---

## 부록) 인터랙션 예시(한국어 UI)

* **입찰 버튼**: `+1틱`, `맞추기(현재가 동결 시)`, `자동호가 설정`
* **라운드 정보**: `라운드 3/7 · 남은시간 18초 · 활성로트 12`
* **알림**: `로트 A-12 최고가 갱신(₩12,300) · 남은시간 +10초 연장`(정책에 따라)
* **정산 안내**: `오늘 16:00 회차 정산 진행 · 전표 확인/세금계산서 발행`

---

### 참고/출처(References)

* **국내 도매/전자경매**: 농협 공판장 실시간 경매현황, aT 화훼공판장 경매·재구축·온라인 이미지 경매, 축산 온라인 경매 추진/적용 기사. ([newgp.nonghyup.com][8], [Flower][9], [IKP News][10], [유튜브][11], [ekape.or.kr][1], [푸드뉴스][2])
* **동시경매 이론(SMRA)**: 국내 매체/연구 요약(노벨상 수상자 연구 소개 등). ([동아사이언스][3], [m.economyinsight.co.kr][4])
* **B2B 실시간 경매 UX**: Manheim Simulcast 가이드/헬프/튜토리얼/신규 채팅 기능. ([Manheim][21], [MyManheim][6])
* **기술 스택**: Next.js(App Router/Server Actions) 공식 문서, Supabase Realtime(포스트그레스 변경/브로드캐스트/프레즌스/셀프호스팅) 문서. ([Next.js][14], [Supabase][12])

---

> **메모**
>
> * 본 PRD는 초기 제품 정의에 초점을 맞추며, **데이터 스키마/저장 설계의 세부는 의도적으로 제외**했습니다(요청사항 반영).
> * 동시경매 파라미터(라운드 길이, 틱 단위, 연장 규칙)는 **파일럿 테스트**로 보정하는 것을 권장합니다. 필요 시 PoC 기준안을 추가로 드리겠습니다.

[1]: https://www.ekape.or.kr/contents/list.do?menuId=menu120021&utm_source=chatgpt.com "온라인경매시스템 < 축산정책지원사업 < 주요사업"
[2]: https://www.foodnews.co.kr/news/articleView.html?idxno=101386&utm_source=chatgpt.com "올 상반기 3개 축산물도매시장에 온라인경매시스템 적용"
[3]: https://m.dongascience.com/news.php?idx=40621&utm_source=chatgpt.com "노벨경제학상 수상자가 만든 '동시 다중 경매' 주파수 ..."
[4]: https://m.economyinsight.co.kr/news/articleView.html?idxno=5105&utm_source=chatgpt.com "셋, 둘, 하나… 낙찰이다! 우아한 경매이론"
[5]: https://site.manheim.com/tutorials/how-to-buy-on-simulcast?utm_source=chatgpt.com "How to Buy on Simulcast"
[6]: https://www.mymanheim.com/news/enhancing-efficiency-manheims-simulcast-buyer-auctioneer-chat/?utm_source=chatgpt.com "Manheim's Simulcast Buyer-Auctioneer Chat"
[7]: https://kisdi.re.kr/report/fileView.do?arrMasterId=3934560&id=656076&key=m2101113024153&utm_source=chatgpt.com "서 언"
[8]: https://newgp.nonghyup.com/naieJsp/ui/ienb/IENB5010.jsp?utm_source=chatgpt.com "실시간 경매현황 - 농협 공판장 인터넷 통합거래시스템"
[9]: https://flower.at.or.kr/real/real2.do?utm_source=chatgpt.com "실시간 경매실적 - 화훼유통정보"
[10]: https://www.ikpnews.net/news/articleView.html?idxno=24591&utm_source=chatgpt.com "aT 화훼공판장, 전자경매시스템 재구축"
[11]: https://www.youtube.com/watch?v=r6Hgp29CwmQ&utm_source=chatgpt.com "화훼 온라인 이미지 경매 최초 도입, 거래 안정성 확보"
[12]: https://supabase.com/features/realtime-postgres-changes?utm_source=chatgpt.com "Realtime - Postgres changes | Supabase Features"
[13]: https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"
[14]: https://nextjs.org/docs/app?utm_source=chatgpt.com "Next.js Docs: App Router"
[15]: https://github.com/vercel/next.js/discussions/78029?utm_source=chatgpt.com "Does a Server Action always invalidate the Router Cache?"
[16]: https://supabase.com/docs/guides/database/overview?utm_source=chatgpt.com "Database | Supabase Docs"
[17]: https://nextjs.org/?utm_source=chatgpt.com "Next.js by Vercel - The React Framework"
[18]: https://supabase.com/docs/reference/self-hosting-realtime/introduction?utm_source=chatgpt.com "Self-Hosting Realtime"
[19]: https://nextjs.org/docs/app/getting-started/updating-data?utm_source=chatgpt.com "Getting Started: Updating Data"
[20]: https://supabase.com/docs/guides/realtime/postgres-changes?utm_source=chatgpt.com "Postgres Changes | Supabase Docs"
[21]: https://site.manheim.com/en/help/simulcast.html?utm_source=chatgpt.com "Simulcast Help"
