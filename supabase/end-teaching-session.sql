begin;
create or replace function public.assembly_end_teaching_session(target_class uuid,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.assembly_teaching_sessions;
begin
 if not exists(select 1 from public.assembly_classes where id=target_class and teacher_id=auth.uid()) then raise exception 'Only the session professor can end this session';end if;
 select * into s from public.assembly_teaching_sessions where class_id=target_class for update;
 if not found then raise exception 'Teaching session unavailable';end if;
 if s.stage='finished' then return public.assembly_session_snapshot(target_class);end if;
 if expected_revision is distinct from s.revision then raise exception 'Session changed. Review the latest state and try again';end if;
 update public.assembly_teaching_sessions set stage='finished',stage_started=now(),stage_end=null,remaining_seconds=null,revision=revision+1,
 timing_log=timing_log||jsonb_build_array(jsonb_build_object('stage',s.stage,'started',s.stage_started,'ended',now(),'scheduled_end',s.stage_end,'reason','Professor ended session early')),
 broadcasts=broadcasts||jsonb_build_array(jsonb_build_object('text','The professor has ended this teaching session. Saved work is retained.','stage','finished','at',now())) where class_id=target_class;
 return public.assembly_session_snapshot(target_class);
end $$;
revoke all on function public.assembly_end_teaching_session(uuid,integer) from public,anon,authenticated;
grant execute on function public.assembly_end_teaching_session(uuid,integer) to authenticated;
create or replace function public.assembly_live_action(target_room uuid,action_name text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assembly_live_rooms r join public.assembly_teaching_sessions s on s.class_id=r.class_id where r.id=target_room and r.prepared and s.stage='finished') then raise exception 'This teaching session has ended. Saved work is read-only';end if;
 if exists(select 1 from public.assembly_live_rooms where id=target_room and prepared) and action_name in ('assign','reassign','clear_assignments','release','timer_pause','timer_resume','timer_extend') then raise exception 'Use the teaching-session controls for prepared classrooms';end if;
 if action_name='advance' and exists(select 1 from public.assembly_live_rooms where id=target_room and prepared and phase='lobby') then raise exception 'Start negotiation from the teaching-session lobby';end if;
 return public.assembly_live_action_legacy(target_room,action_name,payload);
end $$;
commit;
