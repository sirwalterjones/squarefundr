-- RPC to insert admin message using security definer to bypass PostgREST table visibility
-- Creates and returns the inserted row

create or replace function public.admin_send_message(
  p_from_admin_id uuid,
  p_to_user_id uuid,
  p_subject text,
  p_message text
)
returns table (
  id uuid,
  from_admin_id uuid,
  to_user_id uuid,
  subject text,
  message text,
  is_read boolean,
  created_at timestamptz
) 
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_messages(
    from_admin_id, to_user_id, subject, message, is_read
  ) values (
    p_from_admin_id, p_to_user_id, p_subject, p_message, false
  )
  returning admin_messages.id,
            admin_messages.from_admin_id,
            admin_messages.to_user_id,
            admin_messages.subject,
            admin_messages.message,
            admin_messages.is_read,
            admin_messages.created_at
  into id, from_admin_id, to_user_id, subject, message, is_read, created_at;
  
  return next;
end;
$$;

comment on function public.admin_send_message(uuid, uuid, text, text)
is 'Inserts an admin message; security definer to avoid RLS/PostgREST visibility issues.';

-- Allow execution
grant execute on function public.admin_send_message(uuid, uuid, text, text) to anon, authenticated, service_role;


