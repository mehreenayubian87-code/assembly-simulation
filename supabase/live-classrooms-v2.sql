-- Apply after live-rooms.sql. Private scenario seeds are supplied separately, not in GitHub.
begin;
create table if not exists public.assembly_topics (
 id text primary key,title text not null,summary text not null,public_packet jsonb not null,
 zero_draft text not null,private_roles jsonb not null,injects jsonb not null default '[]'
);
create table if not exists public.assembly_student_labels(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(char_length(display_name) between 1 and 60));
alter table public.assembly_topics enable row level security;
alter table public.assembly_student_labels enable row level security;
revoke all on public.assembly_topics,public.assembly_student_labels from public,anon,authenticated;
grant all on public.assembly_topics,public.assembly_student_labels to service_role;
alter table public.assembly_live_rooms add column if not exists topic_id text;
alter table public.assembly_live_rooms add column if not exists capacity integer not null default 4;
alter table public.assembly_live_rooms add column if not exists briefs jsonb not null default '{}';
alter table public.assembly_live_rooms add column if not exists duration_seconds integer not null default 1800;
alter table public.assembly_live_rooms add column if not exists timer_end timestamptz;
alter table public.assembly_live_rooms add column if not exists timer_remaining integer;
-- Keep the original battle-tested transitions internal. Public wrappers enforce new requirements.
do $$begin
 if to_regprocedure('public.assembly_live_snapshot_v1(uuid)') is null then alter function public.assembly_live_snapshot(uuid) rename to assembly_live_snapshot_v1;end if;
 if to_regprocedure('public.assembly_live_action_v1(uuid,text,jsonb)') is null then alter function public.assembly_live_action(uuid,text,jsonb) rename to assembly_live_action_v1;end if;
end $$;
revoke all on function public.assembly_live_snapshot_v1(uuid),public.assembly_live_action_v1(uuid,text,jsonb) from public,anon,authenticated;

create or replace function public.assembly_topic_catalog() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'summary',t.summary,'packet',t.public_packet,'zero_draft',t.zero_draft,'roles',case when exists(select 1 from public.assembly_roles a where a.user_id=auth.uid() and a.role='professor') then t.private_roles else null end,'injects',case when exists(select 1 from public.assembly_roles a where a.user_id=auth.uid() and a.role='professor') then t.injects else null end) order by t.title),'[]'::jsonb) from public.assembly_topics t where auth.uid() is not null;
$$;
create or replace function public.assembly_live_register(student_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or char_length(trim(student_name)) not between 1 and 60 or student_name is null then raise exception 'Enter a name or classroom alias of 1-60 characters';end if;
 insert into public.assembly_student_labels values(auth.uid(),trim(student_name)) on conflict(user_id) do update set display_name=excluded.display_name;
end $$;
create or replace function public.assembly_class_roster(target_class uuid) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.display_name,'Student '||left(m.user_id::text,8))) order by p.display_name),'[]'::jsonb)
 from public.assembly_memberships m left join public.assembly_student_labels p on p.user_id=m.user_id
 where m.class_id=target_class and exists(select 1 from public.assembly_classes c where c.id=target_class and c.teacher_id=auth.uid());
$$;
create or replace function public.assembly_live_create_v2(target_class uuid,room_title text,chosen_topic text,student_capacity integer default 4,minutes integer default 30) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.assembly_topics;rid uuid;
begin
 if not exists(select 1 from public.assembly_classes c join public.assembly_roles a on a.user_id=c.teacher_id where c.id=target_class and c.teacher_id=auth.uid() and a.role='professor') then raise exception 'Only the classroom professor can create rooms';end if;
 select * into t from public.assembly_topics where id=chosen_topic;if not found then raise exception 'Choose a configured health topic';end if;
 if student_capacity is null or student_capacity not between 4 and 8 or minutes is null or minutes not between 1 and 180 then raise exception 'Choose 4-8 students and 1-180 minutes';end if;
 if room_title is null or char_length(trim(room_title)) not between 1 and 100 then raise exception 'Enter a room title';end if;
 insert into public.assembly_live_rooms(class_id,title,topic_id,capacity,briefs,draft,duration_seconds)
 values(target_class,trim(room_title),chosen_topic,student_capacity,t.private_roles,t.zero_draft,minutes*60) returning id into rid;return rid;
end $$;
-- Retire old room creation; no generic rooms without a topic.
create or replace function public.assembly_live_create(target_class uuid,room_title text) returns uuid language plpgsql security definer set search_path='' as $$begin raise exception 'Refresh the site and choose a health topic when creating a room';end $$;

create or replace function public.assembly_live_snapshot(target_room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;result jsonb;t public.assembly_topics;own_role text;is_teacher boolean;
begin
 result=public.assembly_live_snapshot_v1(target_room);select * into r from public.assembly_live_rooms where id=target_room;select * into t from public.assembly_topics where id=r.topic_id;
 own_role=result->>'role';is_teacher=(result->>'teacher')::boolean;
 return result||jsonb_build_object('class_id',r.class_id,'topic_id',r.topic_id,'topic',coalesce(t.title,'Legacy vaccine exercise'),'packet',t.public_packet,'capacity',r.capacity,'duration_seconds',r.duration_seconds,'timer_end',r.timer_end,'timer_remaining',r.timer_remaining,'server_now',now(),
 'brief',case when own_role is not null then r.briefs->own_role else null end,
 'all_briefs',case when is_teacher then r.briefs else null end,
 'assigned',case when is_teacher then r.seats else null end,
 'inject_templates',case when is_teacher then t.injects else null end);
end $$;

create or replace function public.assembly_live_list() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'class_id',r.class_id,'class_title',c.title,'title',r.title,'topic',coalesce(t.title,'Legacy vaccine exercise'),'phase',r.phase,'teacher',c.teacher_id=auth.uid(),'capacity',r.capacity,'timer_end',r.timer_end,'timer_remaining',r.timer_remaining,'server_now',now(),'seats',(select count(*) from jsonb_object_keys(r.seats)),
 'responded',case when c.teacher_id=auth.uid() then (select count(*) from jsonb_object_keys(r.responses)) else null end,
 'objections',case when c.teacher_id=auth.uid() then (select count(*) from jsonb_each(r.responses) x where x.value->>'position'='object') else null end,
 'activity',case when c.teacher_id=auth.uid() then jsonb_array_length(r.events) else null end,'mine',exists(select 1 from jsonb_each_text(r.seats) x where x.value=auth.uid()::text)) order by r.created_at desc),'[]'::jsonb)
 from public.assembly_live_rooms r join public.assembly_classes c on c.id=r.class_id left join public.assembly_topics t on t.id=r.topic_id
 where auth.uid() is not null and (c.teacher_id=auth.uid() or exists(select 1 from public.assembly_memberships m where m.class_id=c.id and m.user_id=auth.uid()));
$$;

create or replace function public.assembly_live_action(target_room uuid,action_name text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;teacher boolean;role_name text;student uuid;body text;n integer;v jsonb;entry jsonb;
begin
 select * into r from public.assembly_live_rooms where id=target_room for update;if not found or auth.uid() is null then raise exception 'Room unavailable';end if;
 select c.teacher_id=auth.uid() into teacher from public.assembly_classes c where c.id=r.class_id;
 if not teacher and not exists(select 1 from public.assembly_memberships m where m.class_id=r.class_id and m.user_id=auth.uid()) then raise exception 'Join this classroom first';end if;
 if r.phase='adopted' then raise exception 'The adopted room is read-only';end if;
 if action_name='join' then raise exception 'Your professor assigns delegation roles';end if;
 if action_name in ('assign','inject','timer_pause','timer_resume','timer_extend') then
  if not teacher then raise exception 'Only the professor can use this control';end if;
  if action_name='assign' then
   if r.phase<>'lobby' then raise exception 'Roles are locked after the simulation starts';end if;
   role_name=payload->>'role';student=(payload->>'student')::uuid;
   if role_name is null or not r.briefs ? role_name then raise exception 'Choose a role from this scenario';end if;
   if not exists(select 1 from public.assembly_memberships m where m.class_id=r.class_id and m.user_id=student) then raise exception 'Student must join the classroom first';end if;
   if exists(select 1 from jsonb_each_text(r.seats) x where x.value=student::text and x.key<>role_name) then raise exception 'This student already has a role in this room';end if;
   -- Prevent simultaneous assignment to another active room in the same class.
   perform 1 from public.assembly_classes where id=r.class_id for update;
   if exists(select 1 from public.assembly_live_rooms other,jsonb_each_text(other.seats) x where other.class_id=r.class_id and other.id<>r.id and other.phase<>'adopted' and x.value=student::text) then raise exception 'Student is assigned to another active room in this classroom';end if;
   if not r.seats ? role_name and (select count(*) from jsonb_object_keys(r.seats))>=r.capacity then raise exception 'Room capacity reached';end if;
   r.seats=r.seats||jsonb_build_object(role_name,student::text);body='Professor assigned delegation '||role_name||'.';
  elsif action_name='inject' then
   body=trim(payload->>'text');if body is null or char_length(body) not between 10 and 1500 then raise exception 'Use 10-1500 characters for the unexpected event';end if;
   if r.phase in ('committee','plenary') then r.phase='consultation';r.responses='{}';body=body||' [Returned to consultation; previous responses cleared.]';end if;
  elsif action_name='timer_pause' then
   if r.timer_end is null then raise exception 'The timer is not running';end if;r.timer_remaining=greatest(0,ceil(extract(epoch from r.timer_end-now()))::integer);r.timer_end=null;body='Professor paused the timer.';
  elsif action_name='timer_resume' then
   if r.phase='lobby' or r.timer_remaining is null then raise exception 'No paused timer to resume';end if;r.timer_end=now()+make_interval(secs=>r.timer_remaining);r.timer_remaining=null;body='Professor resumed the timer.';
  elsif action_name='timer_extend' then
   n=(payload->>'minutes')::integer;if n is null or n not between 1 and 60 or r.phase='lobby' then raise exception 'Add 1-60 minutes after starting';end if;
   if r.timer_end is not null then r.timer_end=greatest(now(),r.timer_end)+make_interval(mins=>n);else r.timer_remaining=coalesce(r.timer_remaining,0)+n*60;end if;body='Professor added '||n||' minutes.';
  end if;
  entry=jsonb_build_object('number',jsonb_array_length(r.events)+1,'actor','Chair','kind',action_name,'phase',r.phase,'text',body,'at',now());
  update public.assembly_live_rooms set seats=r.seats,phase=r.phase,responses=r.responses,timer_end=r.timer_end,timer_remaining=r.timer_remaining,events=r.events||jsonb_build_array(entry),revision=r.revision+1 where id=r.id;
 else
  if action_name='advance' and r.phase='lobby' then
   if not teacher then raise exception 'Only the professor starts the simulation';end if;
   if (select count(*) from jsonb_object_keys(r.seats))<4 then raise exception 'Assign at least four student delegations before starting';end if;
  end if;
  v=public.assembly_live_action_v1(target_room,action_name,payload);
  if action_name='advance' and r.phase='lobby' then update public.assembly_live_rooms set timer_end=now()+make_interval(secs=>duration_seconds),timer_remaining=null where id=r.id;end if;
  if action_name='advance' and v->>'phase'='adopted' then update public.assembly_live_rooms set timer_remaining=case when timer_end is null then coalesce(timer_remaining,0) else greatest(0,ceil(extract(epoch from timer_end-now()))::integer) end,timer_end=null where id=r.id;end if;
 end if;
 return public.assembly_live_snapshot(target_room);
end $$;
revoke all on function public.assembly_topic_catalog(),public.assembly_live_register(text),public.assembly_class_roster(uuid),public.assembly_live_create_v2(uuid,text,text,integer,integer),public.assembly_live_snapshot(uuid),public.assembly_live_action(uuid,text,jsonb),public.assembly_live_list() from public,anon,authenticated;
grant execute on function public.assembly_topic_catalog(),public.assembly_live_register(text),public.assembly_class_roster(uuid),public.assembly_live_create_v2(uuid,text,text,integer,integer),public.assembly_live_snapshot(uuid),public.assembly_live_action(uuid,text,jsonb),public.assembly_live_list() to authenticated;
commit;
