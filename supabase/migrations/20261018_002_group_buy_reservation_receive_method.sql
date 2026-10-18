-- 1kg 구매(수요 풀) 예약에도 수령 방식 추가 · 예약이 주문으로 번역될 때 그대로 옮긴다
alter table public.group_buy_reservations
  add column if not exists receive_method text not null default 'delivery'
    check (receive_method in ('delivery', 'dine_in'));

comment on column public.group_buy_reservations.receive_method is
  '수령 방식 · delivery = 냉장 택배 배송, dine_in = 식육식당 매장 수령(현장 취식). dine_in 이면 shipping 주소는 매장 주소';
