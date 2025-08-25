-- SQL function to get user by email from auth.users
-- This bypasses the listUsers() API that's causing database errors

create or replace function get_user_by_email(user_email text)
returns table(id uuid, email text, created_at timestamptz)
language sql
security definer
as $$
  select 
    au.id,
    au.email,
    au.created_at
  from auth.users au
  where au.email = user_email
  limit 1;
$$;