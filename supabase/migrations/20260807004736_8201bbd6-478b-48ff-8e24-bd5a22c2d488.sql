-- ============ ENUM / ROLES ============
create type public.app_role as enum ('user','promoter','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone varchar(20) unique not null,
  country_code varchar(10) not null default '+225',
  referral_code varchar(6) unique,
  referred_by uuid references public.profiles(id),
  balance numeric(12,2) not null default 0,
  is_frozen boolean not null default false,
  total_deposits numeric(12,2) not null default 0,
  total_withdrawals numeric(12,2) not null default 0,
  total_bonus numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  unique (user_id, role)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  image_url text,
  price numeric(10,2) not null,
  daily_yield numeric(10,2) not null,
  total_yield numeric(10,2) not null,
  vip_level varchar(20),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  purchase_date timestamptz not null default now(),
  last_claim_date timestamptz,
  total_earned numeric(12,2) not null default 0,
  status varchar(20) not null default 'active'
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type varchar(20) not null,
  amount numeric(12,2) not null,
  fee numeric(12,2) not null default 0,
  net_amount numeric(12,2),
  status varchar(20) not null default 'pending',
  reference varchar(50),
  description text,
  metadata jsonb,
  processed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider varchar(20) not null,
  account_number varchar(30) not null,
  account_name varchar(100),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider, account_number)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  description text,
  requirement_type varchar(30) not null,
  requirement_value integer not null,
  bonus_amount numeric(10,2) not null,
  icon_name varchar(50),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  progress integer not null default 0,
  is_completed boolean not null default false,
  bonus_claimed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  difference numeric(12,2) not null default 0,
  reason text,
  status varchar(20) not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============ GRANTS ============
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select on public.products to authenticated;
grant select on public.products to anon;
grant all on public.products to service_role;
grant select, insert, update, delete on public.user_products to authenticated;
grant all on public.user_products to service_role;
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
grant select, insert, update, delete on public.bank_accounts to authenticated;
grant all on public.bank_accounts to service_role;
grant select on public.missions to authenticated, anon;
grant all on public.missions to service_role;
grant select, insert, update, delete on public.user_missions to authenticated;
grant all on public.user_missions to service_role;
grant select, insert, update, delete on public.fraud_alerts to authenticated;
grant all on public.fraud_alerts to service_role;

-- ============ HELPERS ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public, row_security = off as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, row_security = off as $$
  select public.has_role(auth.uid(), 'admin');
$$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.user_products enable row level security;
alter table public.transactions enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.missions enable row level security;
alter table public.user_missions enable row level security;
alter table public.fraud_alerts enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin());

create policy roles_select_own on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to authenticated, anon using (true);
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy up_select on public.user_products for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy up_admin on public.user_products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy tx_select on public.transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy tx_admin on public.transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy bank_own on public.bank_accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bank_admin_read on public.bank_accounts for select to authenticated using (public.is_admin());

create policy missions_read on public.missions for select to authenticated, anon using (true);
create policy missions_admin on public.missions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy um_own on public.user_missions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy um_admin on public.user_missions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy fraud_admin on public.fraud_alerts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ PROFILE TRIGGERS ============
create or replace function public.profiles_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare code text; tries int := 0;
begin
  if new.referral_code is null then
    loop
      code := upper(substring(md5(gen_random_uuid()::text) from 1 for 6));
      exit when not exists (select 1 from public.profiles p where p.referral_code = code) or tries > 20;
      tries := tries + 1;
    end loop;
    new.referral_code := code;
  end if;
  new.balance := coalesce(new.balance,0) + 1500;
  new.total_bonus := coalesce(new.total_bonus,0) + 1500;
  return new;
end; $$;

create trigger profiles_before_insert_trg before insert on public.profiles
for each row execute function public.profiles_before_insert();

create or replace function public.profiles_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (new.id, 'bonus', 1500, 1500, 'approved', 'Bonus de bienvenue - 1 500 FCFA');
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

create trigger profiles_after_insert_trg after insert on public.profiles
for each row execute function public.profiles_after_insert();

-- ============ COMMISSIONS ============
create or replace function public.distribute_commissions(_user_id uuid, _amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare l1 uuid; l2 uuid; l3 uuid; c numeric;
begin
  select referred_by into l1 from public.profiles where id = _user_id;
  if l1 is null then return; end if;
  c := round(_amount * 0.27, 2);
  update public.profiles set balance = balance + c, total_bonus = total_bonus + c where id = l1;
  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (l1, 'commission', c, c, 'approved', 'Commission niveau 1 (27%)');

  select referred_by into l2 from public.profiles where id = l1;
  if l2 is null then return; end if;
  c := round(_amount * 0.02, 2);
  update public.profiles set balance = balance + c, total_bonus = total_bonus + c where id = l2;
  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (l2, 'commission', c, c, 'approved', 'Commission niveau 2 (2%)');

  select referred_by into l3 from public.profiles where id = l2;
  if l3 is null then return; end if;
  c := round(_amount * 0.01, 2);
  update public.profiles set balance = balance + c, total_bonus = total_bonus + c where id = l3;
  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (l3, 'commission', c, c, 'approved', 'Commission niveau 3 (1%)');
end; $$;

-- ============ BUSINESS RPCs ============
create or replace function public.purchase_product(_product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare p public.products; me public.profiles; upid uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then raise exception 'Profil introuvable'; end if;
  if me.is_frozen then raise exception 'Compte gelé'; end if;
  select * into p from public.products where id = _product_id and is_active;
  if p is null then raise exception 'Produit indisponible'; end if;
  if me.balance < p.price then raise exception 'Solde insuffisant'; end if;

  update public.profiles set balance = balance - p.price where id = me.id;
  insert into public.user_products (user_id, product_id) values (me.id, p.id) returning id into upid;
  insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
  values (me.id, 'purchase', p.price, p.price, 'approved', 'Achat ' || p.name, json_build_object('product_id', p.id));
  perform public.refresh_missions(me.id);
  return json_build_object('ok', true, 'user_product_id', upid);
end; $$;

create or replace function public.claim_yield(_user_product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare up public.user_products; p public.products; gain numeric; cap numeric;
begin
  select * into up from public.user_products where id = _user_product_id and user_id = auth.uid();
  if up is null then raise exception 'Produit introuvable'; end if;
  if up.status <> 'active' then raise exception 'Produit terminé'; end if;
  if up.last_claim_date is not null and up.last_claim_date > now() - interval '24 hours' then
    raise exception 'Revenu déjà réclamé, patientez 24h';
  end if;
  select * into p from public.products where id = up.product_id;
  gain := p.daily_yield;
  cap := p.total_yield;
  if up.total_earned + gain > cap then gain := cap - up.total_earned; end if;
  if gain <= 0 then
    update public.user_products set status = 'completed' where id = up.id;
    raise exception 'Rendement total atteint';
  end if;
  update public.user_products
    set total_earned = total_earned + gain,
        last_claim_date = now(),
        status = case when total_earned + gain >= cap then 'completed' else 'active' end
  where id = up.id;
  update public.profiles set balance = balance + gain, total_bonus = total_bonus + gain where id = auth.uid();
  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (auth.uid(), 'yield', gain, gain, 'approved', 'Revenu quotidien ' || p.name);
  return json_build_object('ok', true, 'gain', gain);
end; $$;

create or replace function public.request_withdrawal(_amount numeric, _bank_account_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me public.profiles; fee numeric; net numeric; ba public.bank_accounts;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then raise exception 'Profil introuvable'; end if;
  if me.is_frozen then raise exception 'Compte gelé'; end if;
  if _amount < 1000 then raise exception 'Montant minimum de retrait : 1 000 FCFA'; end if;
  if me.balance < _amount then raise exception 'Solde insuffisant'; end if;
  select * into ba from public.bank_accounts where id = _bank_account_id and user_id = auth.uid();
  if ba is null then raise exception 'Compte de retrait introuvable'; end if;
  fee := round(_amount * 0.15, 2);
  net := _amount - fee;
  update public.profiles set balance = balance - _amount where id = me.id;
  insert into public.transactions (user_id, type, amount, fee, net_amount, status, description, metadata)
  values (me.id, 'withdraw', _amount, fee, net, 'pending', 'Demande de retrait',
    json_build_object('provider', ba.provider, 'account_number', ba.account_number, 'account_name', ba.account_name));
  return json_build_object('ok', true, 'fee', fee, 'net', net);
end; $$;

create or replace function public.refresh_missions(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.missions; prog int;
begin
  for m in select * from public.missions loop
    if m.requirement_type = 'referrals' then
      select count(*) into prog from public.profiles where referred_by = _user_id;
    else
      select count(*) into prog from public.user_products up
        join public.products p on p.id = up.product_id
        where up.user_id = _user_id and p.vip_level = 'VIP' || m.requirement_value::text;
    end if;
    insert into public.user_missions (user_id, mission_id, progress, is_completed)
    values (_user_id, m.id, prog, prog >= (case when m.requirement_type = 'referrals' then m.requirement_value else 1 end))
    on conflict (user_id, mission_id) do update
      set progress = excluded.progress,
          is_completed = excluded.is_completed,
          updated_at = now();
  end loop;
end; $$;

create or replace function public.claim_mission(_mission_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare um public.user_missions; m public.missions;
begin
  perform public.refresh_missions(auth.uid());
  select * into m from public.missions where id = _mission_id;
  select * into um from public.user_missions where user_id = auth.uid() and mission_id = _mission_id;
  if um is null or not um.is_completed then raise exception 'Mission non terminée'; end if;
  if um.bonus_claimed then raise exception 'Bonus déjà récupéré'; end if;
  update public.user_missions set bonus_claimed = true, updated_at = now() where id = um.id;
  update public.profiles set balance = balance + m.bonus_amount, total_bonus = total_bonus + m.bonus_amount where id = auth.uid();
  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (auth.uid(), 'bonus', m.bonus_amount, m.bonus_amount, 'approved', 'Bonus mission : ' || m.name);
  return json_build_object('ok', true, 'bonus', m.bonus_amount);
end; $$;

create or replace function public.create_deposit(_amount numeric, _reference text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if _amount <= 0 then raise exception 'Montant invalide'; end if;
  insert into public.transactions (user_id, type, amount, net_amount, status, reference, description)
  values (auth.uid(), 'deposit', _amount, _amount, 'pending', _reference, 'Demande de recharge');
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_review_transaction(_tx_id uuid, _approve boolean)
returns json language plpgsql security definer set search_path = public as $$
declare tx public.transactions;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  select * into tx from public.transactions where id = _tx_id;
  if tx is null or tx.status <> 'pending' then raise exception 'Transaction invalide'; end if;

  if _approve then
    if tx.type = 'deposit' then
      update public.profiles set balance = balance + tx.amount, total_deposits = total_deposits + tx.amount where id = tx.user_id;
      perform public.distribute_commissions(tx.user_id, tx.amount);
    elsif tx.type = 'withdraw' then
      update public.profiles set total_withdrawals = total_withdrawals + tx.amount where id = tx.user_id;
    end if;
    update public.transactions set status = 'approved', processed_by = auth.uid(), updated_at = now() where id = tx.id;
  else
    if tx.type = 'withdraw' then
      update public.profiles set balance = balance + tx.amount where id = tx.user_id;
    end if;
    update public.transactions set status = 'rejected', processed_by = auth.uid(), updated_at = now() where id = tx.id;
  end if;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_adjust_balance(_user_id uuid, _amount numeric, _reason text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  update public.profiles set balance = balance + _amount where id = _user_id;
  insert into public.transactions (user_id, type, amount, net_amount, status, description, processed_by)
  values (_user_id, case when _amount >= 0 then 'bonus' else 'adjustment' end, abs(_amount), abs(_amount), 'approved',
    coalesce(_reason,'Ajustement administrateur'), auth.uid());
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_toggle_freeze(_user_id uuid, _frozen boolean, _reason text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  update public.profiles set is_frozen = _frozen where id = _user_id;
  if _frozen then
    insert into public.fraud_alerts (user_id, reason, status) values (_user_id, coalesce(_reason,'Gel manuel du compte'), 'pending');
  end if;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_grant_product(_user_id uuid, _product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  insert into public.user_products (user_id, product_id) values (_user_id, _product_id);
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_set_role(_user_id uuid, _role public.app_role)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  insert into public.user_roles (user_id, role) values (_user_id, _role) on conflict do nothing;
  return json_build_object('ok', true);
end; $$;

-- Anti-fraud view
create or replace view public.fraud_audit with (security_invoker = on) as
select p.id, p.phone, p.balance as db_balance, p.is_frozen, p.created_at,
  coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type in ('deposit') and t.status='approved'),0)
  + coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type in ('bonus','commission','yield') and t.status='approved'),0)
  - coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type in ('withdraw','purchase','adjustment') and t.status in ('approved','pending')),0)
  as theoretical_balance
from public.profiles p;

grant select on public.fraud_audit to authenticated;

-- Realtime
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.user_products;

-- ============ SEED ============
insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Air Force 1', 4000, 750, 45000, 'VIP1'
where not exists (select 1 from public.products where name = 'Air Force 1');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Air Max 90', 8000, 1500, 90000, 'VIP2'
where not exists (select 1 from public.products where name = 'Air Max 90');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Dunk Low', 15000, 2700, 162000, 'VIP3'
where not exists (select 1 from public.products where name = 'Dunk Low');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Jordan 1', 20000, 4500, 270000, 'VIP4'
where not exists (select 1 from public.products where name = 'Jordan 1');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Jordan 4', 50000, 10000, 600000, 'VIP5'
where not exists (select 1 from public.products where name = 'Jordan 4');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Air Max 270', 120000, 22000, 1320000, 'VIP6'
where not exists (select 1 from public.products where name = 'Air Max 270');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Vaporfly 3', 250000, 45000, 2700000, 'VIP7'
where not exists (select 1 from public.products where name = 'Vaporfly 3');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Air Zoom Alphafly', 500000, 90000, 5400000, 'VIP8'
where not exists (select 1 from public.products where name = 'Air Zoom Alphafly');

insert into public.products (id, name, price, daily_yield, total_yield, vip_level)
select gen_random_uuid(), 'Nike Mag Limited', 1000000, 120000, 7200000, 'VIP9'
where not exists (select 1 from public.products where name = 'Nike Mag Limited');

insert into public.missions (name, description, requirement_type, requirement_value, bonus_amount, icon_name, sort_order) values
('Inviter 3 investisseurs','Parrainez 3 membres qui rejoignent la plateforme','referrals',3,1000,'Users',1),
('Inviter 10 investisseurs','Parrainez 10 membres','referrals',10,2500,'Users',2),
('Inviter 30 investisseurs','Parrainez 30 membres','referrals',30,5000,'Users',3),
('Acheter VIP2','Achetez une paire VIP2','vip_purchase',2,70,'ShoppingBag',4),
('Acheter VIP3','Achetez une paire VIP3','vip_purchase',3,150,'ShoppingBag',5),
('Acheter VIP4','Achetez une paire VIP4','vip_purchase',4,300,'ShoppingBag',6),
('Acheter VIP5','Achetez une paire VIP5','vip_purchase',5,600,'ShoppingBag',7),
('Acheter VIP6','Achetez une paire VIP6','vip_purchase',6,1200,'ShoppingBag',8),
('Acheter VIP7','Achetez une paire VIP7','vip_purchase',7,2500,'ShoppingBag',9),
('Acheter VIP8','Achetez une paire VIP8','vip_purchase',8,5000,'ShoppingBag',10),
('Acheter VIP9','Achetez une paire VIP9','vip_purchase',9,10000,'ShoppingBag',11);