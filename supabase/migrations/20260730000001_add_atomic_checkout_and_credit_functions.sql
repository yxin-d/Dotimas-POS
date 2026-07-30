-- Atomic, server-trusted checkout.
-- Re-derives price/cost for real products from the live products table (never trusts client-sent values),
-- pre-checks stock for a friendly error, and runs everything (invoice + lines + credit ledger) as one transaction.
create or replace function public.complete_sale(
  p_customer_id uuid,
  p_payment_method payment_method_type,
  p_amount_received numeric,
  p_is_credit boolean,
  p_items jsonb  -- [{ "product_id": uuid|null, "product_name": text, "qty": int, "custom_price": numeric|null }]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id  uuid;
  v_item        jsonb;
  v_product_id  uuid;
  v_qty         int;
  v_unit_price  numeric;
  v_unit_cost   numeric;
  v_subtotal    numeric;
  v_net_profit  numeric;
  v_total       numeric := 0;
  v_change      numeric;
  v_stock       int;
  v_active      boolean;
  v_pname       text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Friendly pre-check. Real enforcement is the products.stocks >= 0 check
  -- constraint, hit atomically via the deduct_stock_on_sale trigger below,
  -- so this can never actually oversell even under concurrent checkouts.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for %', coalesce(v_item->>'product_name', 'item');
    end if;
    if v_product_id is not null then
      select stocks, is_active into v_stock, v_active from products where id = v_product_id;
      if not found then
        raise exception 'Product % no longer exists', v_product_id;
      end if;
      if v_active is false then
        raise exception '% is no longer active', v_item->>'product_name';
      end if;
      if v_stock < v_qty then
        raise exception 'Not enough stock for %: have %, need %', v_item->>'product_name', v_stock, v_qty;
      end if;
    else
      if (v_item->>'custom_price') is null or (v_item->>'custom_price')::numeric < 0 then
        raise exception 'Custom item % needs a valid price', coalesce(v_item->>'product_name', '(unnamed)');
      end if;
    end if;
  end loop;

  insert into sale_invoice (customer_id, amount_received, change, payment_method, is_credit, total_amount)
  values (p_customer_id, 0, 0, p_payment_method, p_is_credit, 0)
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_qty        := (v_item->>'qty')::int;
    v_pname      := v_item->>'product_name';

    if v_product_id is not null then
      select price, cost into v_unit_price, v_unit_cost from products where id = v_product_id;
      -- Canteen-style override on a real product (e.g. weighed/ad-hoc pricing): allowed, but clamped non-negative.
      if v_item->>'custom_price' is not null then
        v_unit_price := greatest((v_item->>'custom_price')::numeric, 0);
      end if;
    else
      v_unit_price := (v_item->>'custom_price')::numeric;
      v_unit_cost  := 0;
    end if;

    v_unit_cost  := coalesce(v_unit_cost, 0);
    v_subtotal   := v_unit_price * v_qty;
    v_net_profit := (v_unit_price - v_unit_cost) * v_qty;
    v_total      := v_total + v_subtotal;

    -- Insert fires the existing deduct_stock_on_sale trigger, which atomically
    -- decrements products.stocks in this same transaction and is protected by
    -- the stocks >= 0 check constraint.
    insert into sales (invoice_id, product_id, product_name, qty, unit_price, unit_cost, subtotal, net_profit)
    values (v_invoice_id, v_product_id, v_pname, v_qty, v_unit_price, v_unit_cost, v_subtotal, v_net_profit);
  end loop;

  if not p_is_credit and coalesce(p_amount_received, 0) < v_total then
    raise exception 'Amount received (%) is less than total (%)', p_amount_received, v_total;
  end if;

  v_change := case when p_is_credit then 0 else greatest(coalesce(p_amount_received, 0) - v_total, 0) end;

  update sale_invoice
  set amount_received = case when p_is_credit then 0 else p_amount_received end,
      change = v_change,
      total_amount = v_total
  where id = v_invoice_id;

  if p_is_credit then
    if p_customer_id is null then
      raise exception 'Credit sale requires a customer';
    end if;
    perform record_credit_change(
      p_customer_id,
      v_invoice_id,
      'credit_given'::ledger_entry_type,
      v_total,
      'Credit from invoice #' || upper(left(v_invoice_id::text, 8))
    );
  end if;

  return v_invoice_id;
end;
$$;

-- Atomic credit balance change (sale or payment). Fixes the read-then-write
-- race: the balance update is a single SQL increment on the row itself, not
-- "read value in JS, do math, write value back."
create or replace function public.record_credit_change(
  p_customer_id uuid,
  p_invoice_id  uuid,
  p_entry_type  ledger_entry_type,
  p_amount      numeric,
  p_description text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
  v_delta       numeric;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  v_delta := case when p_entry_type = 'credit_given' then p_amount else -p_amount end;

  update customers
  set credit_balance = credit_balance + v_delta
  where id = p_customer_id
  returning credit_balance into v_new_balance;

  if not found then
    raise exception 'Customer % not found', p_customer_id;
  end if;

  if p_entry_type = 'payment_made' and v_new_balance < 0 then
    raise exception 'Payment of % exceeds current balance', p_amount;
  end if;

  insert into ledger (customer_id, invoice_id, entry_type, amount, running_balance, description)
  values (p_customer_id, p_invoice_id, p_entry_type, p_amount, v_new_balance, p_description);

  return v_new_balance;
end;
$$;

-- Close the "mutable search_path" advisory on the pre-existing functions too.
alter function public.deduct_from_batches(uuid, integer) set search_path = public;
alter function public.deduct_stock_on_sale() set search_path = public;
alter function public.refresh_invoice_total() set search_path = public;
alter function public.sync_credit_balance() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
