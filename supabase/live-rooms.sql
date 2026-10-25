-- Run in the existing project's SQL Editor. Additive and safe to run again.
-- Existing classrooms, reports and permissions are retained.
begin;
create table if not exists public.assembly_live_rooms (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.assembly_classes(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 100),
 phase text not null default 'lobby' check(phase in ('lobby','consultation','committee','plenary','adopted')),
 seats jsonb not null default '{}',
 draft text not null default 'Recognizing that access requires both supplies and delivery capacity,
1. URGES Member States to prepare equitable national delivery plans;
2. INVITES partners to support transparent financing and predictable production;
3. REQUESTS the Director-General to provide technical assistance upon request and report on implementation barriers.',
 draft_version integer not null default 1,
 revision integer not null default 1,
 responses jsonb not null default '{}',
 events jsonb not null default '[]',
 created_at timestamptz not null default now()
);
alter table public.assembly_live_rooms enable row level security;
revoke all on public.assembly_live_rooms from public,anon,authenticated;
grant all on public.assembly_live_rooms to service_role;

create or replace function public.assembly_live_list() returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'class_id',r.class_id,'title',r.title,'phase',r.phase,'teacher',c.teacher_id=auth.uid(),'seats',(select count(*) from jsonb_object_keys(r.seats))) order by r.created_at desc),'[]'::jsonb)
 from public.assembly_live_rooms r join public.assembly_classes c on c.id=r.class_id
 where auth.uid() is not null and (c.teacher_id=auth.uid() or exists(select 1 from public.assembly_memberships m where m.class_id=c.id and m.user_id=auth.uid()));
$$;

create or replace function public.assembly_live_create(target_class uuid,room_title text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.assembly_classes c join public.assembly_roles a on a.user_id=c.teacher_id and a.role='professor' where c.id=target_class and c.teacher_id=auth.uid()) then raise exception 'Only the classroom professor can create a room';end if;
 if char_length(trim(room_title)) not between 1 and 100 then raise exception 'Use a room title of 1–100 characters';end if;
 insert into public.assembly_live_rooms(class_id,title) values(target_class,trim(room_title)) returning id into result;return result;
end $$;

create or replace function public.assembly_live_snapshot(target_room uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;teacher boolean;own_role text;
begin
 select * into r from public.assembly_live_rooms where id=target_room;
 if not found or auth.uid() is null then raise exception 'Room unavailable';end if;
 select c.teacher_id=auth.uid() into teacher from public.assembly_classes c where c.id=r.class_id;
 if not teacher and not exists(select 1 from public.assembly_memberships m where m.class_id=r.class_id and m.user_id=auth.uid()) then raise exception 'Join this classroom first';end if;
 select key into own_role from jsonb_each_text(r.seats) where value=auth.uid()::text;
 -- Classmates can see the lobby; only seated participants and the professor see its content.
 return jsonb_build_object('id',r.id,'title',r.title,'phase',r.phase,'revision',r.revision,'draft_version',r.draft_version,'teacher',teacher,'role',own_role,'seats',(select coalesce(jsonb_agg(key),'[]'::jsonb) from jsonb_each(r.seats)),
 'draft',case when teacher or own_role is not null then r.draft else null end,
 'responses',case when teacher or own_role is not null then r.responses else '{}'::jsonb end,
 'events',case when teacher or own_role is not null then r.events else '[]'::jsonb end);
end $$;

create or replace function public.assembly_live_action(target_room uuid,action_name text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;teacher boolean;own_role text;role_name text;body text;entry jsonb;next_phase text;seat_count integer;
begin
 select * into r from public.assembly_live_rooms where id=target_room for update;
 if not found or auth.uid() is null then raise exception 'Room unavailable';end if;
 select c.teacher_id=auth.uid() into teacher from public.assembly_classes c where c.id=r.class_id;
 if not teacher and not exists(select 1 from public.assembly_memberships m where m.class_id=r.class_id and m.user_id=auth.uid()) then raise exception 'Join this classroom first';end if;
 select key into own_role from jsonb_each_text(r.seats) where value=auth.uid()::text;
 if r.phase='adopted' then raise exception 'The adopted room is read-only';end if;
 if jsonb_array_length(r.events)>=250 then raise exception 'Room record limit reached; ask the professor to create a new room';end if;
 if action_name='join' then
  role_name=payload->>'role';
  if teacher then raise exception 'The professor facilitates as Chair';end if;
  if r.phase<>'lobby' then raise exception 'Seats are locked after the professor opens consultation';end if;
  if role_name is null or role_name not in ('k','n','m','p') then raise exception 'Choose a valid delegation';end if;
  if own_role is not null then raise exception 'You already have a seat in this room';end if;
  if r.seats ? role_name then raise exception 'That delegation has been taken; choose another';end if;
  r.seats=r.seats||jsonb_build_object(role_name,auth.uid()::text);body='Joined the delegation.';own_role=role_name;
 elsif action_name='release' then
  if not teacher or r.phase<>'lobby' then raise exception 'Only the professor can release a seat before starting';end if;
  role_name=payload->>'role';if role_name is null or not r.seats ? role_name then raise exception 'Seat not found';end if;
  r.seats=r.seats-role_name;body='Released delegation seat '||role_name||'.';
 else
  if not teacher and own_role is null then raise exception 'Take a delegation seat first';end if;
  if action_name='message' then
   body=trim(payload->>'text');if body is null or char_length(body) not between 1 and 1000 then raise exception 'Use 1–1000 characters';end if;
  elsif action_name='draft' then
   if r.phase<>'consultation' then raise exception 'Draft changes require informal consultation';end if;
   if (payload->>'revision')::integer is distinct from r.revision then raise exception 'The room changed. Refresh and review the latest draft before saving';end if;
   body=trim(payload->>'text');if body is null or char_length(body) not between 30 and 6000 then raise exception 'Use 30–6000 characters for the draft';end if;
   r.draft=body;r.draft_version=r.draft_version+1;r.responses='{}';
  elsif action_name='respond' then
   if teacher or own_role is null then raise exception 'Only seated country delegates record a position';end if;
   if r.phase not in ('committee','plenary') or payload->>'phase' is distinct from r.phase or (payload->>'draft_version')::integer is distinct from r.draft_version then raise exception 'The phase or draft changed. Review it before responding';end if;
   if payload->>'position' is null or payload->>'position' not in ('no_objection','object') then raise exception 'Choose no objection or object';end if;
   body=coalesce(trim(payload->>'explanation'),'');if char_length(body)>600 then raise exception 'Use at most 600 characters for the explanation';end if;
   r.responses=r.responses||jsonb_build_object(own_role,jsonb_build_object('position',payload->>'position','explanation',body,'draft_version',r.draft_version));
   body=(payload->>'position')||case when body='' then '' else ': '||body end;
  elsif action_name='advance' then
   if not teacher then raise exception 'Only the professor can change the phase';end if;
   if (payload->>'revision')::integer is distinct from r.revision then raise exception 'The room changed. Refresh before changing the phase';end if;
   select count(*) into seat_count from jsonb_object_keys(r.seats);
   if r.phase='lobby' then
    if seat_count<2 then raise exception 'At least two student delegations must join';end if;next_phase='consultation';
   elsif r.phase='consultation' then next_phase='committee';
   else
    if exists(select 1 from jsonb_object_keys(r.seats) k where r.responses->k->>'position' is distinct from 'no_objection') then raise exception 'Every seated delegation must explicitly record no objection';end if;
    next_phase=case r.phase when 'committee' then 'plenary' else 'adopted' end;
   end if;
   body=r.phase||' -> '||next_phase;r.phase=next_phase;if next_phase<>'adopted' then r.responses='{}';end if;
  elsif action_name='reopen' then
   if not teacher or r.phase not in ('committee','plenary') then raise exception 'Only the professor can return a decision to consultation';end if;
   r.phase='consultation';r.responses='{}';body='Returned to informal consultation; previous positions cleared.';
  else raise exception 'Unknown action';end if;
 end if;
 entry=jsonb_build_object('number',jsonb_array_length(r.events)+1,'actor',case when teacher then 'Chair' else own_role end,'kind',action_name,'phase',r.phase,'draft_version',r.draft_version,'text',body,'at',now());
 update public.assembly_live_rooms set seats=r.seats,phase=r.phase,draft=r.draft,draft_version=r.draft_version,responses=r.responses,events=r.events||jsonb_build_array(entry),revision=r.revision+1 where id=target_room;
 return public.assembly_live_snapshot(target_room);
end $$;
revoke all on function public.assembly_live_list(),public.assembly_live_create(uuid,text),public.assembly_live_snapshot(uuid),public.assembly_live_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.assembly_live_list(),public.assembly_live_create(uuid,text),public.assembly_live_snapshot(uuid),public.assembly_live_action(uuid,text,jsonb) to authenticated;
commit;
