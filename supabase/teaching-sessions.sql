-- Teaching-session orchestration. Apply after manual-role-assignment.sql.
begin;
create table if not exists public.assembly_teaching_sessions(
 class_id uuid primary key references public.assembly_classes(id) on delete cascade,
 stage text not null default 'preparation' check(stage in ('preparation','prebrief','negotiation','report','debrief','finished')),
 stage_started timestamptz, stage_end timestamptz, remaining_seconds integer,
 revision integer not null default 1, meeting_url text not null default '',
 broadcasts jsonb not null default '[]', timing_log jsonb not null default '[]'
);
create table if not exists public.assembly_prepared_students(
 room_id uuid not null references public.assembly_live_rooms(id) on delete cascade,
 student_number integer not null check(student_number between 1 and 8),
 display_name text not null check(char_length(display_name) between 1 and 80),
 role_key text not null, user_id uuid references auth.users(id) on delete set null,
 primary key(room_id,student_number),unique(room_id,role_key),unique(room_id,user_id)
);
alter table public.assembly_live_rooms add column if not exists room_code text unique;
alter table public.assembly_live_rooms add column if not exists prepared boolean not null default false;
alter table public.assembly_teaching_sessions enable row level security;
alter table public.assembly_prepared_students enable row level security;
revoke all on public.assembly_teaching_sessions,public.assembly_prepared_students from public,anon,authenticated;
grant all on public.assembly_teaching_sessions,public.assembly_prepared_students to service_role;

create or replace function public.assembly_session_create(session_title text) returns uuid
language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 cid=public.assembly_create_class(session_title);
 insert into public.assembly_teaching_sessions(class_id) values(cid);
 return cid;
end $$;
create or replace function public.assembly_prepare_room(target_class uuid,room_title text,chosen_topic text,participants jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; item jsonb; pos integer=0; t public.assembly_topics;
begin
 if not exists(select 1 from public.assembly_classes c join public.assembly_teaching_sessions s on s.class_id=c.id where c.id=target_class and c.teacher_id=auth.uid() and s.stage='preparation') then raise exception 'Only the professor can prepare rooms before the teaching session starts';end if;
 if jsonb_typeof(participants) is distinct from 'array' then raise exception 'Enter the student names and roles';end if;
 if jsonb_array_length(participants) not between 4 and 8 then raise exception 'Choose four to eight students';end if;
 select * into t from public.assembly_topics where id=chosen_topic;
 if not found then raise exception 'Choose a health issue';end if;
 if (select count(distinct lower(trim(value->>'name'))) from jsonb_array_elements(participants))<>jsonb_array_length(participants) then raise exception 'Use a distinct name or name plus identifier for every student';end if;
 rid=public.assembly_live_create_v2(target_class,room_title,chosen_topic,jsonb_array_length(participants),20);
 update public.assembly_live_rooms set prepared=true,room_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) where id=rid;
 for item in select value from jsonb_array_elements(participants) loop
  pos=pos+1;
  if not (t.private_roles ? (item->>'role')) then raise exception 'Choose a role from the selected health issue';end if;
  if item->>'name' is null or char_length(trim(item->>'name')) not between 1 and 80 then raise exception 'Enter every student name';end if;
  insert into public.assembly_prepared_students(room_id,student_number,display_name,role_key) values(rid,pos,trim(item->>'name'),item->>'role');
 end loop;
 return rid;
end $$;
create or replace function public.assembly_session_snapshot(target_class uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.assembly_teaching_sessions;teacher boolean;room_list jsonb;
begin
 select c.teacher_id=auth.uid() into teacher from public.assembly_classes c where c.id=target_class;
 if auth.uid() is null or teacher is null or (not teacher and not exists(select 1 from public.assembly_memberships where class_id=target_class and user_id=auth.uid())) then raise exception 'Session unavailable';end if;
 select * into s from public.assembly_teaching_sessions where class_id=target_class;
 if not found then raise exception 'Teaching session unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'topic',t.title,'capacity',r.capacity,'code',case when teacher then r.room_code else null end,'participants',(select coalesce(jsonb_agg(jsonb_build_object('number',p.student_number,'name',p.display_name,'role',p.role_key,'role_name',r.briefs->p.role_key->>'name','joined',p.user_id is not null) order by p.student_number),'[]') from public.assembly_prepared_students p where p.room_id=r.id)) order by r.created_at),'[]') into room_list
 from public.assembly_live_rooms r left join public.assembly_topics t on t.id=r.topic_id where r.class_id=target_class and r.prepared and (teacher or exists(select 1 from public.assembly_prepared_students p where p.room_id=r.id and p.user_id=auth.uid()));
 return jsonb_build_object('class_id',target_class,'teacher',teacher,'stage',s.stage,'started',s.stage_started,'ends',s.stage_end,'remaining',s.remaining_seconds,'revision',s.revision,'server_now',now(),'meeting_url',s.meeting_url,'broadcasts',s.broadcasts,'timing_log',s.timing_log,'rooms',room_list);
end $$;
create or replace function public.assembly_session_control(target_class uuid,command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.assembly_teaching_sessions;next_stage text;seconds integer;body text;
begin
 if not exists(select 1 from public.assembly_classes c where c.id=target_class and c.teacher_id=auth.uid()) then raise exception 'Only the session professor can use these controls';end if;
 select * into s from public.assembly_teaching_sessions where class_id=target_class for update;
 if not found then raise exception 'Session unavailable';end if;
 if command='next' then
  if (payload->>'revision')::integer is distinct from s.revision then raise exception 'Session changed; refresh before advancing';end if;
  next_stage=case s.stage when 'preparation' then 'prebrief' when 'prebrief' then 'negotiation' when 'negotiation' then 'report' when 'report' then 'debrief' when 'debrief' then 'finished' end;
  if next_stage is null then raise exception 'Session is finished';end if;
  if next_stage='negotiation' and (not exists(select 1 from public.assembly_live_rooms where class_id=target_class and prepared) or exists(select 1 from public.assembly_prepared_students p join public.assembly_live_rooms r on r.id=p.room_id where r.class_id=target_class and r.prepared and p.user_id is null)) then raise exception 'All prepared students must join before negotiation begins';end if;
  if next_stage='negotiation' then update public.assembly_live_rooms set phase='consultation',revision=revision+1 where class_id=target_class and prepared and phase='lobby';end if;
  seconds=case next_stage when 'prebrief' then 600 when 'negotiation' then 1200 when 'report' then 900 when 'debrief' then 900 else 0 end;
  s.timing_log=s.timing_log||jsonb_build_array(jsonb_build_object('stage',s.stage,'started',s.stage_started,'ended',now(),'scheduled_end',s.stage_end));
  s.stage=next_stage;s.stage_started=now();s.stage_end=case when seconds>0 then now()+make_interval(secs=>seconds) else null end;s.remaining_seconds=null;
 elsif command='pause' then
  if s.stage_end is null then raise exception 'No running stage timer';end if;
  s.remaining_seconds=greatest(0,ceil(extract(epoch from s.stage_end-now()))::integer);s.stage_end=null;
 elsif command='resume' then
  if s.remaining_seconds is null or s.stage_end is not null then raise exception 'No paused timer';end if;
  s.stage_end=now()+make_interval(secs=>s.remaining_seconds);s.remaining_seconds=null;
 elsif command='broadcast' then
  body=trim(payload->>'text');if body is null or char_length(body) not between 1 and 1500 then raise exception 'Write a message of 1-1500 characters';end if;
  if jsonb_array_length(s.broadcasts)>=300 then raise exception 'Session message limit reached';end if;
  s.broadcasts=s.broadcasts||jsonb_build_array(jsonb_build_object('text',body,'at',now(),'stage',s.stage));
 else raise exception 'Unknown session control';end if;
 update public.assembly_teaching_sessions set stage=s.stage,stage_started=s.stage_started,stage_end=s.stage_end,remaining_seconds=s.remaining_seconds,broadcasts=s.broadcasts,timing_log=s.timing_log,revision=revision+1 where class_id=target_class;
 return public.assembly_session_snapshot(target_class);
end $$;
revoke all on function public.assembly_session_create(text),public.assembly_prepare_room(uuid,text,text,jsonb),public.assembly_session_snapshot(uuid),public.assembly_session_control(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.assembly_session_create(text),public.assembly_prepare_room(uuid,text,text,jsonb),public.assembly_session_snapshot(uuid),public.assembly_session_control(uuid,text,jsonb) to authenticated;
commit;
