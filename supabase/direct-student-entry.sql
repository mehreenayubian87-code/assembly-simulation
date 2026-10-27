begin;
create or replace function public.assembly_request_entry(classroom_code text,student_name text) returns text
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;p public.assembly_prepared_students;old_user uuid;
begin
 if auth.uid() is null then raise exception 'Sign in before joining';end if;
 select * into r from public.assembly_live_rooms where room_code=upper(trim(classroom_code)) and prepared for update;
 if not found then raise exception 'Classroom code not found. Check the code with your professor';end if;
 perform 1 from public.assembly_classes where id=r.class_id for update;
 if (select stage from public.assembly_teaching_sessions where class_id=r.class_id)='finished' then raise exception 'This session has ended. Your professor must reopen it before you can join';end if;
 select * into p from public.assembly_prepared_students where room_id=r.id and lower(trim(display_name))=lower(trim(student_name)) for update;
 if not found then raise exception 'Your name is not on this classroom roster. Use the name entered by your professor';end if;
 if p.user_id=auth.uid() then return 'approved';end if;
 if exists(select 1 from public.assembly_prepared_students ps join public.assembly_live_rooms rr on rr.id=ps.room_id where ps.user_id=auth.uid() and rr.class_id=r.class_id) then raise exception 'This browser is already using another student name in this session. Sign out before switching students';end if;
 old_user=p.user_id;
 delete from public.assembly_room_students where room_id=r.id and student_number=p.student_number;
 update public.assembly_prepared_students set user_id=auth.uid() where room_id=r.id and student_number=p.student_number;
 insert into public.assembly_room_students(room_id,user_id,student_number) values(r.id,auth.uid(),p.student_number);
 insert into public.assembly_memberships(class_id,user_id) values(r.class_id,auth.uid()) on conflict do nothing;
 update public.assembly_live_rooms set seats=seats||jsonb_build_object(p.role_key,auth.uid()::text),revision=revision+1 where id=r.id;
 if old_user is not null then
  delete from public.assembly_memberships where class_id=r.class_id and user_id=old_user and not exists(select 1 from public.assembly_classes where id=r.class_id and teacher_id=old_user);
 end if;
 delete from public.assembly_join_requests where room_id=r.id and student_number=p.student_number;
 return 'approved';
end $$;
revoke all on function public.assembly_request_entry(text,text) from public,anon;
grant execute on function public.assembly_request_entry(text,text) to authenticated;
-- Retire the obsolete approval controls without dropping stored classroom work.
revoke execute on function public.assembly_approve_entry(uuid,uuid,boolean) from authenticated;
commit;
