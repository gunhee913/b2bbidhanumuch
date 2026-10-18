-- 1kg 구매 · 손질 옵션 "근막 제거 + 썰어 받기" (kg당 추가 요금)
-- held_amount = kg × (price_per_kg + option_fee_per_kg)

alter table public.group_buy_reservations
  add column if not exists trim_and_slice boolean not null default false,
  add column if not exists option_fee_per_kg integer not null default 0 check (option_fee_per_kg >= 0);

comment on column public.group_buy_reservations.trim_and_slice is '근막 제거 + 썰어 받기 옵션 선택 여부';
comment on column public.group_buy_reservations.option_fee_per_kg is '옵션 kg당 추가 요금 · 주문 시점 값을 고정 저장';

-- 매칭 후 주문으로 옮길 때 포장 담당자가 봐야 하므로 주문에도 남긴다
alter table public.group_buy_orders
  add column if not exists trim_and_slice boolean not null default false;

comment on column public.group_buy_orders.trim_and_slice is 'kg 주문 · 근막 제거 + 썰어 받기 옵션';
