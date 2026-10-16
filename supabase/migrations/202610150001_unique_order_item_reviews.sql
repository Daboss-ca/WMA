create unique index if not exists reviews_user_order_product_unique
  on public.reviews (user_id, order_id, product_id);
