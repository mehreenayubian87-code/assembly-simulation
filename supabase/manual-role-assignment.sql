begin;
create or replace function public.assembly_live_action(target_room uuid,action_name text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.assembly_live_rooms;old_role text;student uuid;ignored jsonb;
begin
 if action_name in ('reassign','clear_assignments') then
  select * into r from public.assembly_live_rooms where id=target_room for update;
  if not found or not exists(select 1 from public.assembly_classes where id=r.class_id and teacher_id=auth.uid()) then raise exception 'Only this classroom professor can assign roles';end if;
  if r.phase<>'lobby' then raise exception 'Roles are locked after the simulation starts';end if;
  if action_name='clear_assignments' then
   for old_role in select jsonb_object_keys(r.seats) loop
    ignored=public.assembly_live_action_v2(target_room,'release',jsonb_build_object('role',old_role));
   end loop;
   return public.assembly_live_snapshot(target_room);
  end if;
  student=(payload->>'student')::uuid;
  if not exists(select 1 from public.assembly_room_students where room_id=target_room and user_id=student) then raise exception 'This student must join this room first';end if;
  select key into old_role from jsonb_each_text(r.seats) where value=student::text and key<>payload->>'role';
  if old_role is not null then ignored=public.assembly_live_action_v2(target_room,'release',jsonb_build_object('role',old_role));end if;
  return public.assembly_live_action_v2(target_room,'assign',payload);
 end if;
 if action_name='assign' and not exists(select 1 from public.assembly_room_students where room_id=target_room and user_id=(payload->>'student')::uuid) then raise exception 'Choose a student who has joined this room';end if;
 return public.assembly_live_action_v2(target_room,action_name,payload);
end $$;
revoke all on function public.assembly_live_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.assembly_live_action(uuid,text,jsonb) to authenticated;
commit;
