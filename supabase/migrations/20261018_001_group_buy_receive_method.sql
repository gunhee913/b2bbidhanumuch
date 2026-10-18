-- 공동구매 주문 수령 방식 · 택배 배송(delivery) 또는 식육식당 매장 수령(dine_in)
-- 사업 확장: 오프라인 식육식당에서 주문한 부위를 받아 자리에서 구워 먹을 수 있게 한다.

alter table public.group_buy_orders
  add column if not exists receive_method text not null default 'delivery'
    check (receive_method in ('delivery', 'dine_in'));

comment on column public.group_buy_orders.receive_method is
  '수령 방식 · delivery = 냉장 택배 배송, dine_in = 식육식당 매장 수령(현장 취식). dine_in 이면 shipping 주소는 매장 주소가 들어간다';

create index if not exists group_buy_orders_receive_method_idx
  on public.group_buy_orders (receive_method)
  where receive_method <> 'delivery';
