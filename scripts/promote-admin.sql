-- Script: promote user to admin role
-- Replace <USER_UUID> with the user's UUID value (e.g. '44453077-...')

-- Insert role if not present
insert into public.user_roles (user_id, role)
values ('44453077'::uuid, 'admin')
on conflict do nothing;

-- Optionally verify
select * from public.user_roles where user_id = '44453077'::uuid;
