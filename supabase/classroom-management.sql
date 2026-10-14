-- Run once in SQL Editor for the existing Assembly project.
-- Safe to run again. This installs controls; it does not delete any classrooms.
begin;
create or replace function public.assembly_reopen_class(target_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 update public.assembly_classes set accepting_members=true
 where id=target_id and teacher_id=auth.uid();
 if not found then raise exception 'Class not found'; end if;
end $$;
create or replace function public.assembly_delete_class(target_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 -- Existing foreign keys remove memberships and make submitted reports private.
 delete from public.assembly_classes where id=target_id and teacher_id=auth.uid();
 if not found then raise exception 'Class not found'; end if;
end $$;
revoke all on function public.assembly_reopen_class(uuid),public.assembly_delete_class(uuid) from public,anon,authenticated;
grant execute on function public.assembly_reopen_class(uuid),public.assembly_delete_class(uuid) to authenticated;
commit;
