-- Update referral mission progress to count only referred users who bought at least one product.
create or replace function public.refresh_missions(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.missions;
  prog int;
begin
  for m in select * from public.missions loop
    if m.requirement_type = 'referrals' then
      select count(distinct p.id) into prog
      from public.profiles p
      join public.user_products up on up.user_id = p.id
      where p.referred_by = _user_id;
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

grant execute on function public.refresh_missions(uuid) to authenticated;
grant execute on function public.refresh_missions(uuid) to service_role;
revoke execute on function public.refresh_missions(uuid) from anon;
