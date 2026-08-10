alter table public.profiles
  add column if not exists checkin_count integer not null default 0;

create or replace function public.claim_daily_checkin()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  eligible_at timestamptz;
  reward numeric := 100;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then
    raise exception 'Profil introuvable';
  end if;
  if me.is_frozen then
    raise exception 'Compte gelé';
  end if;

  if me.last_checkin_at is null then
    eligible_at := now();
  else
    eligible_at := me.last_checkin_at + interval '24 hours';
  end if;

  if now() < eligible_at then
    raise exception 'Pointage indisponible pour le moment';
  end if;

  update public.profiles
    set balance = balance + reward,
        total_bonus = total_bonus + reward,
        last_checkin_at = now(),
        checkin_count = coalesce(checkin_count, 0) + 1
  where id = me.id;

  insert into public.transactions (user_id, type, amount, net_amount, status, description)
  values (me.id, 'bonus', reward, reward, 'approved', 'Pointage quotidien +100 FCFA');

  return json_build_object(
    'ok', true,
    'reward', reward,
    'next_eligible_at', now() + interval '24 hours'
  );
end;
$$;

grant execute on function public.claim_daily_checkin() to authenticated;
revoke execute on function public.claim_daily_checkin() from anon;
