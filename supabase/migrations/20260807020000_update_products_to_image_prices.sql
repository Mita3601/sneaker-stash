-- Align existing product pricing and yields with the current reference table.
update public.products
set price = 4000, daily_yield = 750, total_yield = 45000
where vip_level = 'VIP1';

update public.products
set price = 8000, daily_yield = 1500, total_yield = 90000
where vip_level = 'VIP2';

update public.products
set price = 15000, daily_yield = 2700, total_yield = 162000
where vip_level = 'VIP3';

update public.products
set price = 20000, daily_yield = 4500, total_yield = 270000
where vip_level = 'VIP4';

update public.products
set price = 50000, daily_yield = 10000, total_yield = 600000
where vip_level = 'VIP5';

update public.products
set price = 120000, daily_yield = 22000, total_yield = 1320000
where vip_level = 'VIP6';

update public.products
set price = 250000, daily_yield = 45000, total_yield = 2700000
where vip_level = 'VIP7';

update public.products
set price = 500000, daily_yield = 90000, total_yield = 5400000
where vip_level = 'VIP8';

update public.products
set price = 1000000, daily_yield = 120000, total_yield = 7200000
where vip_level = 'VIP9';