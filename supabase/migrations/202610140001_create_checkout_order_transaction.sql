create or replace function public.create_checkout_order(
  p_user_id uuid,
  p_shipping_address text,
  p_contact_number text,
  p_payment_method text,
  p_cart_item_ids text[]
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order_id public.orders.id%type;
  v_total_amount numeric(12, 2);
  v_selected_count integer;
  v_invalid_count integer;
begin
  if p_user_id is null or coalesce(btrim(p_shipping_address), '') = '' then
    raise exception 'A user and shipping address are required.' using errcode = '22023';
  end if;

  if p_cart_item_ids is null or cardinality(p_cart_item_ids) = 0 then
    raise exception 'Select at least one cart item.' using errcode = '22023';
  end if;

  select count(*)::integer
    into v_selected_count
  from public.cart_items ci
  where ci.user_id = p_user_id
    and ci.id::text = any(p_cart_item_ids);

  if v_selected_count <> cardinality(p_cart_item_ids) then
    raise exception 'One or more selected cart items are no longer available.' using errcode = '22023';
  end if;

  select count(*)::integer
    into v_invalid_count
  from public.cart_items ci
  left join public.products p on p.id = ci.product_id
  where ci.user_id = p_user_id
    and ci.id::text = any(p_cart_item_ids)
    and (p.id is null or coalesce(ci.quantity, 0) <= 0 or coalesce(p.price, 0) <= 0);

  if v_invalid_count > 0 then
    raise exception 'Selected cart items must have a positive quantity and product price.' using errcode = '22023';
  end if;

  select round(coalesce(sum(round(p.price, 2) * ci.quantity), 0), 2)
    into v_total_amount
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = p_user_id
    and ci.id::text = any(p_cart_item_ids);

  insert into public.orders (
    user_id,
    total_amount,
    status,
    shipping_address,
    contact_number,
    payment_method
  ) values (
    p_user_id,
    v_total_amount,
    'Pending',
    btrim(p_shipping_address),
    coalesce(p_contact_number, ''),
    coalesce(nullif(btrim(p_payment_method), ''), 'gcash')
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, price)
  select
    v_order_id,
    ci.product_id,
    ci.quantity,
    round(p.price, 2)
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = p_user_id
    and ci.id::text = any(p_cart_item_ids);

  delete from public.cart_items ci
  where ci.user_id = p_user_id
    and ci.id::text = any(p_cart_item_ids);

  return v_order_id::text;
end;
$$;

revoke all on function public.create_checkout_order(uuid, text, text, text, text[]) from public;
grant execute on function public.create_checkout_order(uuid, text, text, text, text[]) to service_role;
