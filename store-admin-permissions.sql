-- =====================================================================
-- NANSHUO - STORE ADMIN PERMISSIONS
-- Phân quyền mỗi quản trị cửa hàng chỉ quản lý DUY NHẤT 1 cửa hàng.
-- Chạy MỘT LẦN trong Supabase > SQL Editor.
-- Sau đó chạy BOOTSTRAP-SUPER-ADMIN.sql để cấp quyền super_admin đầu tiên.
-- =====================================================================

-- Kiểm tra các module nền tảng trước khi thay policy, để tránh migration chạy dở dang.
do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Thiếu bảng public.products. Hãy chạy catalog-setup.sql trước.';
  end if;
  if to_regclass('public.store_profiles') is null then
    raise exception 'Thiếu bảng public.store_profiles. Hãy chạy fashion-catalog-upgrade.sql trước.';
  end if;
  if to_regclass('public.orders') is null then
    raise exception 'Thiếu bảng public.orders. Hãy chạy orders-setup.sql trước.';
  end if;
end $$;

-- 1) Bảng hồ sơ quyền quản trị
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','store_manager')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mỗi store_manager chỉ có 1 dòng => chỉ được phụ trách 1 cửa hàng.
create table if not exists public.store_admin_permissions (
  user_id uuid primary key references public.admin_users(user_id) on delete cascade,
  brand_id bigint not null references public.brands(id) on delete cascade,
  store_location text not null,
  can_manage_products boolean not null default true,
  can_manage_store_profile boolean not null default true,
  can_view_orders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_admin_permissions_brand_store_idx
  on public.store_admin_permissions (brand_id, store_location);

-- 2) Chuẩn hóa tên cửa hàng để Royal City = Vincom Royal City, v.v.
create or replace function public.store_key(p_value text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        trim(regexp_replace(lower(coalesce(p_value,'')), '\s+', ' ', 'g')),
        '^(vincom plaza|vincom|vinhomes|vinhome)\s+', '', 'i'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- 3) Helper functions dùng trong RLS
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.active = true
      and au.role = 'super_admin'
  );
$$;

create or replace function public.can_manage_product_store(p_brand_id bigint, p_store text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.admin_users au
    join public.store_admin_permissions sp on sp.user_id = au.user_id
    where au.user_id = auth.uid()
      and au.active = true
      and au.role = 'store_manager'
      and sp.can_manage_products = true
      and sp.brand_id = p_brand_id
      and public.store_key(sp.store_location) = public.store_key(p_store)
  );
$$;

create or replace function public.can_manage_profile_store(p_brand_id bigint, p_store text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.admin_users au
    join public.store_admin_permissions sp on sp.user_id = au.user_id
    where au.user_id = auth.uid()
      and au.active = true
      and au.role = 'store_manager'
      and sp.can_manage_store_profile = true
      and sp.brand_id = p_brand_id
      and public.store_key(sp.store_location) = public.store_key(p_store)
  );
$$;

create or replace function public.can_view_store_orders(p_brand_id bigint, p_store text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.admin_users au
    join public.store_admin_permissions sp on sp.user_id = au.user_id
    where au.user_id = auth.uid()
      and au.active = true
      and au.role = 'store_manager'
      and sp.can_view_orders = true
      and sp.brand_id = p_brand_id
      and public.store_key(sp.store_location) = public.store_key(p_store)
  );
$$;

-- 4) RLS cho bảng quyền
alter table public.admin_users enable row level security;
alter table public.store_admin_permissions enable row level security;

drop policy if exists "admin users read own" on public.admin_users;
create policy "admin users read own"
on public.admin_users for select to authenticated
using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "super admin manage admin users" on public.admin_users;
create policy "super admin manage admin users"
on public.admin_users for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "store admins read own permission" on public.store_admin_permissions;
create policy "store admins read own permission"
on public.store_admin_permissions for select to authenticated
using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "super admin manage store permissions" on public.store_admin_permissions;
create policy "super admin manage store permissions"
on public.store_admin_permissions for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

grant select on public.admin_users to authenticated;
grant select on public.store_admin_permissions to authenticated;

-- 5) PRODUCTS: public vẫn xem sản phẩm active; manager chỉ được ghi cửa hàng của mình
alter table public.products enable row level security;

drop policy if exists "public read active products" on public.products;
create policy "public read active products"
on public.products for select to anon
using (active = true);

drop policy if exists "authenticated read all products" on public.products;
drop policy if exists "authenticated read catalog products" on public.products;
create policy "authenticated read catalog products"
on public.products for select to authenticated
using (
  active = true
  or public.is_super_admin()
  or public.can_manage_product_store(brand_id, store_location)
);

drop policy if exists "admin insert products" on public.products;
create policy "admin insert products"
on public.products for insert to authenticated
with check (
  public.is_super_admin()
  or public.can_manage_product_store(brand_id, store_location)
);

drop policy if exists "admin update products" on public.products;
create policy "admin update products"
on public.products for update to authenticated
using (
  public.is_super_admin()
  or public.can_manage_product_store(brand_id, store_location)
)
with check (
  public.is_super_admin()
  or public.can_manage_product_store(brand_id, store_location)
);

drop policy if exists "admin delete products" on public.products;
create policy "admin delete products"
on public.products for delete to authenticated
using (
  public.is_super_admin()
  or public.can_manage_product_store(brand_id, store_location)
);

-- 6) STORE PROFILES: ảnh/mô tả gian hàng chỉ sửa đúng cửa hàng được giao
alter table public.store_profiles enable row level security;

drop policy if exists "public read active store profiles" on public.store_profiles;
create policy "public read active store profiles"
on public.store_profiles for select to anon
using (active = true);

drop policy if exists "authenticated read store profiles" on public.store_profiles;
create policy "authenticated read store profiles"
on public.store_profiles for select to authenticated
using (
  active = true
  or public.is_super_admin()
  or public.can_manage_profile_store(brand_id, store_location)
);

drop policy if exists "admin insert store profiles" on public.store_profiles;
create policy "admin insert store profiles"
on public.store_profiles for insert to authenticated
with check (
  public.is_super_admin()
  or public.can_manage_profile_store(brand_id, store_location)
);

drop policy if exists "admin update store profiles" on public.store_profiles;
create policy "admin update store profiles"
on public.store_profiles for update to authenticated
using (
  public.is_super_admin()
  or public.can_manage_profile_store(brand_id, store_location)
)
with check (
  public.is_super_admin()
  or public.can_manage_profile_store(brand_id, store_location)
);

drop policy if exists "admin delete store profiles" on public.store_profiles;
create policy "admin delete store profiles"
on public.store_profiles for delete to authenticated
using (
  public.is_super_admin()
  or public.can_manage_profile_store(brand_id, store_location)
);

-- 7) ORDERS: thông tin khách hàng chỉ đúng cửa hàng mới xem được
-- Giữ quyền khách gửi đơn mới.
alter table public.orders enable row level security;

drop policy if exists "public create orders" on public.orders;
create policy "public create orders"
on public.orders for insert to anon
with check (status = 'new' and privacy_accepted = true);

drop policy if exists "authenticated create orders" on public.orders;
create policy "authenticated create orders"
on public.orders for insert to authenticated
with check (privacy_accepted = true);

drop policy if exists "authenticated read orders" on public.orders;
create policy "authenticated read orders"
on public.orders for select to authenticated
using (
  public.is_super_admin()
  or public.can_view_store_orders(brand_id, store_location)
);

drop policy if exists "authenticated update orders" on public.orders;
create policy "authenticated update orders"
on public.orders for update to authenticated
using (
  public.is_super_admin()
  or public.can_view_store_orders(brand_id, store_location)
)
with check (
  public.is_super_admin()
  or public.can_view_store_orders(brand_id, store_location)
);

drop policy if exists "authenticated delete orders" on public.orders;
create policy "authenticated delete orders"
on public.orders for delete to authenticated
using (
  public.is_super_admin()
  or public.can_view_store_orders(brand_id, store_location)
);

-- Quyền SQL cơ bản; RLS phía trên vẫn quyết định từng bản ghi.
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.store_profiles to authenticated;
grant insert on public.orders to anon;
grant select, insert, update, delete on public.orders to authenticated;

-- 8) STORAGE: manager chỉ upload/update/delete file trong thư mục của chính user đó.
-- File public vẫn được xem bình thường.
drop policy if exists "admin insert site images" on storage.objects;
drop policy if exists "admin update site images" on storage.objects;
drop policy if exists "admin delete site images" on storage.objects;

create policy "admin insert site images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-images'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = 'managed'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

create policy "admin update site images"
on storage.objects for update to authenticated
using (
  bucket_id = 'site-images'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = 'managed'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
)
with check (
  bucket_id = 'site-images'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = 'managed'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

create policy "admin delete site images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-images'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = 'managed'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- 9) RPC cho super_admin phân quyền bằng email mà không lộ auth.users ra client.
create or replace function public.assign_store_manager_by_email(
  p_email text,
  p_brand_id bigint,
  p_store_location text,
  p_can_manage_products boolean default true,
  p_can_manage_store_profile boolean default true,
  p_can_view_orders boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_existing_role text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can assign store managers';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Không tìm thấy tài khoản Auth với email %', p_email;
  end if;

  select role into v_existing_role
  from public.admin_users
  where user_id = v_user_id;

  if v_existing_role = 'super_admin' then
    raise exception 'Không thể chuyển super_admin thành store_manager bằng thao tác này';
  end if;

  insert into public.admin_users(user_id, role, active, updated_at)
  values (v_user_id, 'store_manager', true, now())
  on conflict (user_id) do update
    set role = 'store_manager', active = true, updated_at = now();

  insert into public.store_admin_permissions(
    user_id, brand_id, store_location,
    can_manage_products, can_manage_store_profile, can_view_orders, updated_at
  )
  values (
    v_user_id, p_brand_id, trim(p_store_location),
    p_can_manage_products, p_can_manage_store_profile, p_can_view_orders, now()
  )
  on conflict (user_id) do update
    set brand_id = excluded.brand_id,
        store_location = excluded.store_location,
        can_manage_products = excluded.can_manage_products,
        can_manage_store_profile = excluded.can_manage_store_profile,
        can_view_orders = excluded.can_view_orders,
        updated_at = now();

  return v_user_id;
end;
$$;

create or replace function public.list_store_managers()
returns table (
  user_id uuid,
  email text,
  brand_id bigint,
  brand_name text,
  store_location text,
  can_manage_products boolean,
  can_manage_store_profile boolean,
  can_view_orders boolean,
  active boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can list store managers';
  end if;

  return query
  select
    au.user_id,
    u.email::text,
    sp.brand_id,
    b.name::text,
    sp.store_location,
    sp.can_manage_products,
    sp.can_manage_store_profile,
    sp.can_view_orders,
    au.active
  from public.admin_users au
  join auth.users u on u.id = au.user_id
  join public.store_admin_permissions sp on sp.user_id = au.user_id
  left join public.brands b on b.id = sp.brand_id
  where au.role = 'store_manager'
  order by b.name, sp.store_location, u.email;
end;
$$;

create or replace function public.revoke_store_manager(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can revoke store managers';
  end if;

  delete from public.store_admin_permissions where user_id = p_user_id;
  delete from public.admin_users where user_id = p_user_id and role = 'store_manager';
end;
$$;

revoke all on function public.assign_store_manager_by_email(text,bigint,text,boolean,boolean,boolean) from public;
revoke all on function public.list_store_managers() from public;
revoke all on function public.revoke_store_manager(uuid) from public;

grant execute on function public.assign_store_manager_by_email(text,bigint,text,boolean,boolean,boolean) to authenticated;
grant execute on function public.list_store_managers() to authenticated;
grant execute on function public.revoke_store_manager(uuid) to authenticated;

grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.can_manage_product_store(bigint,text) to authenticated;
grant execute on function public.can_manage_profile_store(bigint,text) to authenticated;
grant execute on function public.can_view_store_orders(bigint,text) to authenticated;

-- Hoàn tất migration. Tiếp theo chạy BOOTSTRAP-SUPER-ADMIN.sql.
