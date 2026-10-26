-- Shared classroom codes, name claims and professor approval.
begin;
alter table public.assembly_live_rooms add column if not exists report_text text not null default '';
alter table public.assembly_live_rooms add column if not exists report_version integer not null default 1;
create table if not exists public.assembly_join_requests(
 room_id uuid not null references public.assembly_live_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 student_number integer not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 requested_at timestamptz not null default now(),
 primary key(room_id,user_id),
 foreign key(room_id,student_number) references public.assembly_prepared_students(room_id,student_number) on delete cascade
);
alter table public.assembly_join_requests enable row level security;
revoke all on public.assembly_join_requests from public,anon,authenticated;
grant all on public.assembly_join_requests to service_role;
create or replace function public.assembly_request_entry(classroom_code text,student_name text) returns text
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;p public.assembly_prepared_students;
begin
 if auth.uid() is null then raise exception 'Sign in before requesting entry';end if;
 select * into r from public.assembly_live_rooms where room_code=upper(trim(classroom_code)) and prepared;
 if not found then raise exception 'Classroom code not found. Ask your professor for this room code';end if;
 if (select stage from public.assembly_teaching_sessions where class_id=r.class_id)='finished' then raise exception 'This teaching session has finished';end if;
 if (select count(*) from public.assembly_prepared_students where room_id=r.id and lower(display_name)=lower(trim(student_name)))<>1 then raise exception 'Enter your name exactly as listed by your professor';end if;
 select * into p from public.assembly_prepared_students where room_id=r.id and lower(display_name)=lower(trim(student_name));
 if p.user_id=auth.uid() then return 'approved';end if;
 if p.user_id is not null then raise exception 'This student already has an approved device session. Ask your professor for help';end if;
 if exists(select 1 from public.assembly_prepared_students ps join public.assembly_live_rooms rr on rr.id=ps.room_id where ps.user_id=auth.uid() and rr.class_id=r.class_id) then raise exception 'You already have an approved role in this teaching session';end if;
 insert into public.assembly_join_requests(room_id,user_id,student_number) values(r.id,auth.uid(),p.student_number)
 on conflict(room_id,user_id) do update set student_number=excluded.student_number,status='pending',requested_at=now();
 return 'pending';
end $$;
create or replace function public.assembly_my_entry_requests() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('room',r.title,'status',q.status,'name',p.display_name,'number',q.student_number)),'[]') from public.assembly_join_requests q join public.assembly_live_rooms r on r.id=q.room_id join public.assembly_prepared_students p on p.room_id=q.room_id and p.student_number=q.student_number where q.user_id=auth.uid();
$$;
create or replace function public.assembly_entry_requests(target_class uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.assembly_classes where id=target_class and teacher_id=auth.uid()) then raise exception 'Only the professor can view entry requests';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('room_id',r.id,'room',r.title,'user_id',q.user_id,'number',q.student_number,'name',p.display_name,'role',r.briefs->p.role_key->>'name','at',q.requested_at) order by q.requested_at),'[]') from public.assembly_join_requests q join public.assembly_live_rooms r on r.id=q.room_id join public.assembly_prepared_students p on p.room_id=q.room_id and p.student_number=q.student_number where r.class_id=target_class and q.status='pending');
end $$;
create or replace function public.assembly_approve_entry(target_room uuid,student_user uuid,approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;q public.assembly_join_requests;p public.assembly_prepared_students;
begin
 select * into r from public.assembly_live_rooms where id=target_room for update;
 if not found or not exists(select 1 from public.assembly_classes where id=r.class_id and teacher_id=auth.uid()) then raise exception 'Only this classroom professor can approve entry';end if;
 perform 1 from public.assembly_classes where id=r.class_id for update;
 select * into q from public.assembly_join_requests where room_id=r.id and user_id=student_user for update;
 if not found or q.status<>'pending' then raise exception 'No pending entry request';end if;
 if approve is not true then update public.assembly_join_requests set status='rejected' where room_id=r.id and user_id=student_user;return;end if;
 select * into p from public.assembly_prepared_students where room_id=r.id and student_number=q.student_number for update;
 if p.user_id is not null then raise exception 'This name already has an approved student';end if;
 if exists(select 1 from public.assembly_prepared_students ps join public.assembly_live_rooms rr on rr.id=ps.room_id where ps.user_id=student_user and rr.class_id=r.class_id) then raise exception 'This student already has a role in the session';end if;
 update public.assembly_prepared_students set user_id=student_user where room_id=r.id and student_number=p.student_number;
 insert into public.assembly_memberships(class_id,user_id) values(r.class_id,student_user) on conflict do nothing;
 insert into public.assembly_room_students(room_id,user_id,student_number) values(r.id,student_user,p.student_number);
 update public.assembly_live_rooms set seats=seats||jsonb_build_object(p.role_key,student_user::text),revision=revision+1 where id=r.id;
 update public.assembly_join_requests set status=case when user_id=student_user then 'approved' else 'rejected' end where room_id=r.id and student_number=p.student_number and status='pending';
end $$;
-- Block older entry and role-assignment paths from bypassing approval.
do $$begin
 if to_regprocedure('public.assembly_join_class_legacy(text)') is null then alter function public.assembly_join_class(text) rename to assembly_join_class_legacy;end if;
 if to_regprocedure('public.assembly_room_enroll_legacy(uuid)') is null then alter function public.assembly_room_enroll(uuid) rename to assembly_room_enroll_legacy;end if;
 if to_regprocedure('public.assembly_live_action_legacy(uuid,text,jsonb)') is null then alter function public.assembly_live_action(uuid,text,jsonb) rename to assembly_live_action_legacy;end if;
 if to_regprocedure('public.assembly_live_snapshot_legacy(uuid)') is null then alter function public.assembly_live_snapshot(uuid) rename to assembly_live_snapshot_legacy;end if;
end $$;
revoke all on function public.assembly_join_class_legacy(text),public.assembly_room_enroll_legacy(uuid),public.assembly_live_action_legacy(uuid,text,jsonb),public.assembly_live_snapshot_legacy(uuid) from public,anon,authenticated;
create or replace function public.assembly_join_class(code text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assembly_classes c join public.assembly_teaching_sessions s on s.class_id=c.id where c.join_code=upper(trim(code))) then raise exception 'Use the classroom room code and request professor approval';end if;
 return public.assembly_join_class_legacy(code);
end $$;
create or replace function public.assembly_room_enroll(target_room uuid) returns integer language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assembly_live_rooms where id=target_room and prepared) then raise exception 'This classroom requires professor approval';end if;
 return public.assembly_room_enroll_legacy(target_room);
end $$;
create or replace function public.assembly_live_action(target_room uuid,action_name text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assembly_live_rooms where id=target_room and prepared) and action_name in ('assign','reassign','clear_assignments','release','timer_pause','timer_resume','timer_extend') then raise exception 'Use the teaching-session controls for prepared classrooms';end if;
 if action_name='advance' and exists(select 1 from public.assembly_live_rooms where id=target_room and prepared and phase='lobby') then raise exception 'Start negotiation from the teaching-session lobby';end if;
 return public.assembly_live_action_legacy(target_room,action_name,payload);
end $$;
create or replace function public.assembly_live_snapshot(target_room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;r public.assembly_live_rooms;extra jsonb;
begin
 result=public.assembly_live_snapshot_legacy(target_room);select * into r from public.assembly_live_rooms where id=target_room;
 if not r.prepared then return result;end if;
 if (result->>'teacher')::boolean or result->>'role' is not null then
  extra=public.assembly_session_snapshot(r.class_id);
  return result||jsonb_build_object('prepared',true,'report_text',r.report_text,'report_version',r.report_version,'teaching_session',extra,'participants',(select coalesce(jsonb_agg(jsonb_build_object('number',student_number,'name',display_name,'role',role_key,'role_name',r.briefs->role_key->>'name') order by student_number),'[]') from public.assembly_prepared_students where room_id=r.id));
 end if;
 return result||jsonb_build_object('prepared',true);
end $$;
revoke all on function public.assembly_request_entry(text,text),public.assembly_my_entry_requests(),public.assembly_entry_requests(uuid),public.assembly_approve_entry(uuid,uuid,boolean),public.assembly_join_class(text),public.assembly_room_enroll(uuid),public.assembly_live_action(uuid,text,jsonb),public.assembly_live_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.assembly_request_entry(text,text),public.assembly_my_entry_requests(),public.assembly_entry_requests(uuid),public.assembly_approve_entry(uuid,uuid,boolean),public.assembly_join_class(text),public.assembly_room_enroll(uuid),public.assembly_live_action(uuid,text,jsonb),public.assembly_live_snapshot(uuid) to authenticated;
create or replace function public.assembly_session_list() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title) order by c.created_at desc),'[]') from public.assembly_classes c join public.assembly_teaching_sessions s on s.class_id=c.id where c.teacher_id=auth.uid() or exists(select 1 from public.assembly_prepared_students p join public.assembly_live_rooms r on r.id=p.room_id where r.class_id=c.id and p.user_id=auth.uid());
$$;
revoke all on function public.assembly_session_list() from public,anon,authenticated;
grant execute on function public.assembly_session_list() to authenticated;
create or replace function public.assembly_save_room_report(target_room uuid,report_body text,expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;
begin
 select * into r from public.assembly_live_rooms where id=target_room for update;
 if not found or not r.prepared or auth.uid() is null then raise exception 'Room unavailable';end if;
 if not exists(select 1 from public.assembly_classes where id=r.class_id and teacher_id=auth.uid()) and not exists(select 1 from public.assembly_prepared_students where room_id=r.id and user_id=auth.uid()) then raise exception 'Only approved classroom participants can write this report';end if;
 if (select stage from public.assembly_teaching_sessions where class_id=r.class_id)<>'report' then raise exception 'Report editing opens during the report-writing stage';end if;
 if expected_version is distinct from r.report_version then raise exception 'A classmate saved a newer report. Copy your changes, load the latest report, and merge them';end if;
 if report_body is null or char_length(report_body)>15000 then raise exception 'Use at most 15000 characters';end if;
 update public.assembly_live_rooms set report_text=report_body,report_version=report_version+1 where id=r.id;
 return public.assembly_live_snapshot(r.id);
end $$;
revoke all on function public.assembly_save_room_report(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.assembly_save_room_report(uuid,text,integer) to authenticated;
commit;

