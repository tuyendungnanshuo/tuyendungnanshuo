-- =====================================================================
-- NANSHUO - BOOTSTRAP SUPER ADMIN
-- BẮT BUỘC: thay YOUR_ADMIN_EMAIL@example.com bằng email Admin hiện tại.
-- Chạy SAU store-admin-permissions.sql.
-- =====================================================================

insert into public.admin_users(user_id, role, active, updated_at)
select id, 'super_admin', true, now()
from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
on conflict (user_id) do update
set role = 'super_admin', active = true, updated_at = now();

-- Kiểm tra kết quả:
select u.email, au.role, au.active
from public.admin_users au
join auth.users u on u.id = au.user_id
where au.role = 'super_admin';
