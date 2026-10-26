begin;
create table if not exists public.assembly_room_students(
 room_id uuid not null references public.assembly_live_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 student_number integer not null check(student_number between 1 and 8),
 primary key(room_id,user_id),unique(room_id,student_number)
);
alter table public.assembly_room_students enable row level security;
revoke all on public.assembly_room_students from public,anon,authenticated;
grant all on public.assembly_room_students to service_role;
-- Preserve existing assigned students and give each a stable room-local number.
insert into public.assembly_room_students(room_id,user_id,student_number)
select id,student::uuid,n from (
 select r.id,x.value student,row_number() over(partition by r.id order by x.key)::integer n
 from public.assembly_live_rooms r cross join lateral jsonb_each_text(r.seats) x
 where not exists(select 1 from public.assembly_room_students s where s.room_id=r.id)
) numbered on conflict do nothing;
create or replace function public.assembly_room_enroll(target_room uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;n integer;
begin
 select * into r from public.assembly_live_rooms where id=target_room for update;
 if not found or auth.uid() is null then raise exception 'Room unavailable';end if;
 perform 1 from public.assembly_classes where id=r.class_id for update;
 select * into r from public.assembly_live_rooms where id=target_room for update;
 if not exists(select 1 from public.assembly_memberships where class_id=r.class_id and user_id=auth.uid()) then raise exception 'Join this classroom using its code first';end if;
 select student_number into n from public.assembly_room_students where room_id=r.id and user_id=auth.uid();
 if n is not null then return n;end if;
 if r.phase<>'lobby' then raise exception 'This simulation has already started';end if;
 if exists(select 1 from public.assembly_room_students s join public.assembly_live_rooms other on other.id=s.room_id where s.user_id=auth.uid() and other.class_id=r.class_id and other.id<>r.id and other.phase<>'adopted') then raise exception 'You have already joined another active room in this classroom';end if;
 select min(slot) into n from generate_series(1,r.capacity) slot where not exists(select 1 from public.assembly_room_students s where s.room_id=r.id and s.student_number=slot);
 if n is null then raise exception 'This room is full';end if;
 insert into public.assembly_room_students values(r.id,auth.uid(),n);return n;
end $$;
create or replace function public.assembly_room_roster(target_room uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.assembly_live_rooms r join public.assembly_classes c on c.id=r.class_id where r.id=target_room and c.teacher_id=auth.uid()) then raise exception 'Only this classroom professor can view the roster';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',s.user_id,'number',s.student_number,'name','Student '||s.student_number) order by s.student_number),'[]') from public.assembly_room_students s where s.room_id=target_room);
end $$;
do $$begin
 if to_regprocedure('public.assembly_live_action_v2(uuid,text,jsonb)') is null then alter function public.assembly_live_action(uuid,text,jsonb) rename to assembly_live_action_v2;end if;
 if to_regprocedure('public.assembly_live_snapshot_v2(uuid)') is null then alter function public.assembly_live_snapshot(uuid) rename to assembly_live_snapshot_v2;end if;
end $$;
revoke all on function public.assembly_live_action_v2(uuid,text,jsonb),public.assembly_live_snapshot_v2(uuid) from public,anon,authenticated;
create or replace function public.assembly_live_snapshot(target_room uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 return public.assembly_live_snapshot_v2(target_room)||jsonb_build_object('student_number',(select student_number from public.assembly_room_students where room_id=target_room and user_id=auth.uid()));
end $$;
create or replace function public.assembly_live_action(target_room uuid,action_name text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if action_name='assign' and not exists(select 1 from public.assembly_room_students where room_id=target_room and user_id=(payload->>'student')::uuid) then raise exception 'Choose a student who has joined this room';end if;
 return public.assembly_live_action_v2(target_room,action_name,payload);
end $$;
revoke all on function public.assembly_room_enroll(uuid),public.assembly_room_roster(uuid),public.assembly_live_snapshot(uuid),public.assembly_live_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.assembly_room_enroll(uuid),public.assembly_room_roster(uuid),public.assembly_live_snapshot(uuid),public.assembly_live_action(uuid,text,jsonb) to authenticated;
commit;
