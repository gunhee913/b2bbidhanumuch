-- 매장 수령 · 매장 선택 + 픽업 시간 예약
--   group_buy_stores            식육식당 매장 (서울 6곳 시드)
--   group_buy_orders            store_id · pickup_at
--   group_buy_reservations      store_id · pickup_at (매칭 시 주문으로 그대로 옮긴다)

create table if not exists public.group_buy_stores (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  zipcode         text,
  address         text not null,
  address_detail  text,
  phone           text,
  lat             double precision not null,
  lng             double precision not null,
  open_time       time not null default '11:00',
  close_time      time not null default '21:00',
  -- 휴무 요일 · 0=일 … 6=토
  closed_weekdays smallint[] not null default '{}',
  -- 픽업 슬롯 간격(분) · 슬롯당 받을 수 있는 주문 수
  slot_minutes    integer not null default 30 check (slot_minutes between 10 and 120),
  slot_capacity   integer not null default 6 check (slot_capacity >= 1),
  description     text,
  directions      text,
  parking         text,
  image_url       text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.group_buy_stores is '매장 수령 가능한 식육식당 · 소비자 매장안내 페이지와 주문서 매장 선택에 쓴다';
comment on column public.group_buy_stores.closed_weekdays is '휴무 요일 · 0=일요일 … 6=토요일';
comment on column public.group_buy_stores.slot_capacity is '픽업 슬롯(slot_minutes 간격) 하나에 받을 수 있는 주문 수';

drop trigger if exists trigger_group_buy_stores_updated_at on public.group_buy_stores;
create trigger trigger_group_buy_stores_updated_at
  before update on public.group_buy_stores
  for each row execute function group_buy_set_updated_at();

alter table public.group_buy_orders
  add column if not exists store_id  uuid references public.group_buy_stores(id),
  add column if not exists pickup_at timestamptz;

alter table public.group_buy_reservations
  add column if not exists store_id  uuid references public.group_buy_stores(id),
  add column if not exists pickup_at timestamptz;

comment on column public.group_buy_orders.store_id  is '매장 수령 · 받을 매장';
comment on column public.group_buy_orders.pickup_at is '매장 수령 · 예약한 픽업 시작 시각';

create index if not exists idx_group_buy_orders_store_pickup       on public.group_buy_orders (store_id, pickup_at);
create index if not exists idx_group_buy_reservations_store_pickup on public.group_buy_reservations (store_id, pickup_at);

-- 서울 매장 6곳 (임의) · 좌표는 해당 지번 근처 값
insert into public.group_buy_stores
  (slug, name, zipcode, address, address_detail, phone, lat, lng, open_time, close_time, closed_weekdays, description, directions, parking, image_url, sort_order)
values
  ('gangnam',   '농협미트센터 강남 역삼점',  '06236', '서울 강남구 테헤란로 152',   '1층',           '02-555-0101', 37.5001, 127.0364, '11:00', '21:00', '{}',  '역삼역 바로 앞. 소분·손질 전용 작업장을 갖춰 벌크 주문도 바로 받아가실 수 있습니다.', '2호선 역삼역 3번 출구 도보 2분', '건물 지하 주차 2시간 무료', 'https://picsum.photos/seed/gb-store-gangnam/960/640', 1),
  ('jamsil',    '농협미트센터 송파 잠실점',  '05551', '서울 송파구 올림픽로 300',   '지하 1층',      '02-555-0102', 37.5133, 127.1028, '11:00', '21:00', '{}',  '잠실 롯데월드몰 인근. 주말 가족 손님이 많아 구이용 손질 요청이 가장 많은 매장입니다.', '2·8호선 잠실역 10번 출구 도보 5분', '건물 주차장 1시간 무료', 'https://picsum.photos/seed/gb-store-jamsil/960/640', 2),
  ('hapjeong',  '농협미트센터 마포 합정점',  '04039', '서울 마포구 양화로 45',      '1층',           '02-555-0103', 37.5496, 126.9139, '11:00', '21:00', '{1}', '합정역 메세나폴리스 옆. 1kg 구매 손님이 많아 진공 소포장 재고가 넉넉합니다.', '2·6호선 합정역 9번 출구 도보 3분', '인근 공영주차장 이용', 'https://picsum.photos/seed/gb-store-hapjeong/960/640', 3),
  ('jongno',    '농협미트센터 종로점',       '03161', '서울 종로구 종로 51',        '2층',           '02-555-0104', 37.5704, 126.9826, '10:00', '20:00', '{0}', '종각역 인근 직장인 상권. 점심시간 픽업 예약이 빨리 찹니다.', '1호선 종각역 4번 출구 도보 1분', '주차 불가 · 대중교통 이용 권장', 'https://picsum.photos/seed/gb-store-jongno/960/640', 4),
  ('yeouido',   '농협미트센터 영등포 여의도점','07326', '서울 영등포구 국제금융로 10', 'Two IFC 지하 2층', '02-555-0105', 37.5251, 126.9255, '10:30', '20:30', '{0}', 'IFC몰 지하. 퇴근길 픽업이 편하고 선물용 포장도 가능합니다.', '5·9호선 여의도역 3번 출구 지하 연결', 'IFC몰 주차장 2시간 무료', 'https://picsum.photos/seed/gb-store-yeouido/960/640', 5),
  ('nowon',     '농협미트센터 노원점',       '01695', '서울 노원구 동일로 1414',    '1층',           '02-555-0106', 37.6543, 127.0608, '11:00', '21:00', '{}',  '노원역 롯데백화점 맞은편. 매장 식당이 넓어 받으신 고기를 바로 구워 드실 수 있습니다.', '4·7호선 노원역 9번 출구 도보 2분', '건물 주차 1시간 무료', 'https://picsum.photos/seed/gb-store-nowon/960/640', 6)
on conflict (slug) do nothing;
