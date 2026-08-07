create table public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) not null unique,
  amount numeric(12,2) not null,
  max_redemptions integer not null default 1,
  redeemed_count integer not null default 0,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.gift_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_code_id uuid not null references public.gift_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (gift_code_id, user_id)
);

alter table public.gift_codes enable row level security;
alter table public.gift_code_redemptions enable row level security;

create policy gift_codes_admin on public.gift_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy gift_code_redemptions_admin on public.gift_code_redemptions for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant all on public.gift_codes to service_role;
grant all on public.gift_code_redemptions to service_role;

create or replace function public.create_gift_code(
  _code text,
  _amount numeric,
  _duration_days integer,
  _max_redemptions integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(_code));
  expires_at timestamptz;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Accès refusé';
  end if;
  if normalized_code = '' then
    raise exception 'Code cadeau requis';
  end if;
  if _amount <= 0 then
    raise exception 'Montant invalide';
  end if;
  if _duration_days <= 0 then
    raise exception 'Durée invalide';
  end if;
  if _max_redemptions <= 0 then
    raise exception 'Nombre d''utilisateurs invalide';
  end if;
  expires_at := now() + (_duration_days || ' days')::interval;
  insert into public.gift_codes (code, amount, max_redemptions, expires_at, created_by)
  values (normalized_code, _amount, _max_redemptions, expires_at, auth.uid());
  return json_build_object('ok', true, 'code', normalized_code, 'amount', _amount, 'expires_at', expires_at, 'max_redemptions', _max_redemptions);
end;
$$;

create or replace function public.claim_gift_code(
  _code text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  gift public.gift_codes;
  me public.profiles;
  updated public.gift_codes;
begin
  select * into gift from public.gift_codes where code = upper(trim(_code));
  if gift is null then
    raise exception 'Code cadeau introuvable';
  end if;
  if now() > gift.expires_at then
    raise exception 'Code cadeau expiré';
  end if;
  select * into me from public.profiles where id = auth.uid();
  if me is null then
    raise exception 'Profil introuvable';
  end if;
  if me.is_frozen then
    raise exception 'Compte gelé';
  end if;
  if exists (select 1 from public.gift_code_redemptions where gift_code_id = gift.id and user_id = auth.uid()) then
    raise exception 'Code déjà utilisé';
  end if;
  update public.gift_codes
    set redeemed_count = redeemed_count + 1
    where id = gift.id and redeemed_count < gift.max_redemptions
    returning * into updated;
  if updated is null then
    raise exception 'Code cadeau épuisé';
  end if;
  insert into public.gift_code_redemptions (gift_code_id, user_id) values (gift.id, auth.uid());
  update public.profiles set balance = balance + gift.amount, total_bonus = total_bonus + gift.amount where id = auth.uid();
  insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
  values (auth.uid(), 'bonus', gift.amount, gift.amount, 'approved', 'Code cadeau ' || gift.code,
    json_build_object('gift_code_id', gift.id));
  return json_build_object('ok', true, 'amount', gift.amount, 'code', gift.code, 'expires_at', gift.expires_at);
end;
$$;

grant execute on function public.create_gift_code(uuid, numeric, integer, integer) to authenticated;
grant execute on function public.create_gift_code(uuid, numeric, integer, integer) to service_role;
grant execute on function public.claim_gift_code(text) to authenticated;
grant execute on function public.claim_gift_code(text) to service_role;
