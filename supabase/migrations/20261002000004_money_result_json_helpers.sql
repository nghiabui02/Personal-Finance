-- =============================================================================
-- Shared shapes for what a money function changed, and the first function to
-- report them.
--
-- The web throws the result away and lets the server re-query, but a native
-- client keeps its own copy of the data and has to know which rows moved.
-- Without that it must re-read after every write, giving back the round trips
-- these functions were meant to save.
--
-- Every money function returns the same keys where they apply:
--   transactions    rows created or changed, each with its category and wallet
--   wallets         [{id, balance}] for every balance that moved
--   debt            the whole debts row when one was touched, else null
--   deleted_*_ids   ids removed, so a local store can drop them
-- =============================================================================

-- The whole row plus the category and wallet it points at. Every column is
-- carried through: callers hand this object straight back to their own clients,
-- and a hand-picked list silently drops whatever was added to the table later.
-- Both relations are null when absent — an uncategorised row, or a wallet that
-- has since been deleted.
create or replace function public.transaction_json(p_tx transactions)
returns json
language sql
stable
set search_path to 'public'
as $$
  select (to_jsonb(p_tx) || jsonb_build_object(
    'categories', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color)
      from categories c where c.id = p_tx.category_id
    ),
    'wallets', (
      select jsonb_build_object('id', w.id, 'name', w.name)
      from wallets w where w.id = p_tx.wallet_id
    )
  ))::json;
$$;

-- Only the balance moves, so only the balance is reported. Ids that no longer
-- exist (a wallet just deleted) simply drop out.
create or replace function public.wallet_balances_json(p_ids uuid[])
returns json
language sql
stable
set search_path to 'public'
as $$
  select coalesce(
    json_agg(json_build_object('id', w.id, 'balance', w.balance) order by w.id),
    '[]'::json
  )
  from wallets w
  where w.id = any(coalesce(p_ids, '{}'));
$$;

create or replace function public.debt_payment_json(p_payment debt_payments)
returns json
language sql
immutable
set search_path to 'public'
as $$
  select case when p_payment.id is null then null else to_json(p_payment) end;
$$;

-- The whole row, not a hand-picked subset. A partial object forces every client
-- to keep a second, looser type just for these replies, and to merge field by
-- field instead of replacing the row it already knows how to decode. The
-- columns are already in memory here, so sending all of them costs nothing.
create or replace function public.debt_json(p_debt debts)
returns json
language sql
immutable
set search_path to 'public'
as $$
  select case when p_debt.id is null then null else to_json(p_debt) end;
$$;

-- =============================================================================
-- Delete a transaction — now reporting what it removed.
--
-- A transfer removes both legs, so deleted_transaction_ids carries two ids.
-- That second one is what a client needs to drop the leg it never saw deleted.
-- =============================================================================
drop function if exists public.delete_transaction(uuid);

create function public.delete_transaction(p_id uuid)
returns json
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid      uuid := require_user();
  v_peek     transactions;
  v_tx       transactions;
  v_leg      transactions;
  v_payment  debt_payments;
  v_debt     debts;
  v_debt_id  uuid;
  v_restored numeric;
  v_wallets  uuid[];
  v_wallet   uuid;
  v_tx_ids   uuid[] := '{}';
  v_pay_ids  uuid[] := '{}';
begin
  select * into v_peek from transactions where id = p_id and user_id = v_uid;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;

  if v_peek.transfer_pair_id is not null then
    if exists (
      select 1 from transactions
        where transfer_pair_id = v_peek.transfer_pair_id
          and user_id = v_uid
          and wallet_id is null
    ) then
      raise exception 'One of the wallets in this transfer no longer exists, so it cannot be undone. Record a correction instead.'
        using errcode = 'P0001';
    end if;

    select array_agg(distinct wallet_id order by wallet_id) into v_wallets
      from transactions
      where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid;

    perform 1 from wallets
      where user_id = v_uid and id = any(coalesce(v_wallets, '{}'))
      order by id
      for update;

    -- Both legs locked in id order, so two deletes racing on the same pair
    -- queue up instead of waiting on each other.
    for v_leg in
      select * from transactions
        where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid
        order by id
        for update
    loop
      -- Re-checked under the lock: a wallet can be deleted between the peek
      -- above and here, and the leg would then have nothing to credit.
      if v_leg.wallet_id is null or not (v_leg.wallet_id = any(v_wallets)) then
        raise exception 'One of the wallets in this transfer no longer exists, so it cannot be undone. Record a correction instead.'
          using errcode = 'P0001';
      end if;
      update wallets
        set balance = balance + case when v_leg.type = 'income' then -v_leg.amount else v_leg.amount end
        where id = v_leg.wallet_id and user_id = v_uid;
      v_tx_ids := v_tx_ids || v_leg.id;
    end loop;

    delete from transactions
      where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid;

    -- Spending the transferred money already may leave the destination short.
    -- Refusing here is the honest answer; undoing it halfway is not.
    foreach v_wallet in array coalesce(v_wallets, '{}') loop
      perform assert_wallet_in_bounds(v_wallet);
    end loop;

    return json_build_object(
      'deleted_transaction_ids',  to_json(v_tx_ids),
      'deleted_debt_payment_ids', '[]'::json,
      'wallets',                  wallet_balances_json(v_wallets),
      'debt',                     null
    );
  end if;

  if v_peek.debt_payment_id is not null then
    select debt_id into v_debt_id from debt_payments where id = v_peek.debt_payment_id;
  end if;

  if v_peek.wallet_id is not null then
    perform 1 from wallets where id = v_peek.wallet_id and user_id = v_uid for update;
  end if;
  if v_debt_id is not null then
    select * into v_debt from debts where id = v_debt_id and user_id = v_uid for update;
    select * into v_payment from debt_payments where id = v_peek.debt_payment_id for update;
  end if;

  select * into v_tx from transactions where id = p_id and user_id = v_uid for update;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;

  -- The locks above were taken for the rows the peek saw. If the transaction
  -- was re-pointed in between, the wallet about to be moved is not the one
  -- under lock, and the ordering guarantee is gone with it.
  if v_tx.wallet_id is distinct from v_peek.wallet_id
     or v_tx.debt_payment_id is distinct from v_peek.debt_payment_id
     or v_tx.transfer_pair_id is distinct from v_peek.transfer_pair_id then
    raise exception 'This transaction changed while it was being deleted. Reopen it and try again.'
      using errcode = 'P0001';
  end if;

  if v_tx.wallet_id is not null then
    update wallets
      set balance = balance + case when v_tx.type = 'income' then -v_tx.amount else v_tx.amount end
      where id = v_tx.wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_tx.wallet_id);
    v_wallets := array[v_tx.wallet_id];
  end if;

  if v_payment.id is not null then
    if v_debt.id is not null then
      -- Capped at the original debt: a payment can only give back what it took off.
      v_restored := least(v_debt.remaining_amount + v_payment.amount, v_debt.amount);
      update debts
        set remaining_amount = v_restored,
            status = case when v_debt.status = 'completed' then 'active' else v_debt.status end
        where id = v_debt.id and user_id = v_uid
        returning * into v_debt;
    end if;
    delete from debt_payments where id = v_payment.id;
    v_pay_ids := array[v_payment.id];
  end if;

  delete from transactions where id = p_id and user_id = v_uid;

  return json_build_object(
    'deleted_transaction_ids',  to_json(array[p_id]),
    'deleted_debt_payment_ids', to_json(v_pay_ids),
    'wallets',                  wallet_balances_json(v_wallets),
    'debt',                     debt_json(v_debt)
  );
end;
$$;
