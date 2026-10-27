begin;
alter table public.assembly_teaching_sessions add column if not exists resume_state jsonb;
create or replace function public.assembly_end_teaching_session(target_class uuid,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.assembly_teaching_sessions;
begin
 if not exists(select 1 from public.assembly_classes where id=target_class and teacher_id=auth.uid()) then raise exception 'Only the session professor can end this session';end if;
 select * into s from public.assembly_teaching_sessions where class_id=target_class for update;
 if not found then raise exception 'Teaching session unavailable';end if;
 if s.stage='finished' then return public.assembly_session_snapshot(target_class);end if;
 if expected_revision is distinct from s.revision then raise exception 'Session changed. Review the latest state and try again';end if;
 update public.assembly_teaching_sessions set resume_state=jsonb_build_object('stage',s.stage,'seconds',case when s.stage_end is not null then greatest(0,ceil(extract(epoch from s.stage_end-now()))::integer) else s.remaining_seconds end),stage='finished',stage_started=now(),stage_end=null,remaining_seconds=null,revision=revision+1,
 timing_log=timing_log||jsonb_build_array(jsonb_build_object('stage',s.stage,'started',s.stage_started,'ended',now(),'scheduled_end',s.stage_end,'reason','Professor ended session early')),
 broadcasts=broadcasts||jsonb_build_array(jsonb_build_object('text','The professor has ended this teaching session. Saved work is retained.','stage','finished','at',now())) where class_id=target_class;
 return public.assembly_session_snapshot(target_class);
end $$;
revoke all on function public.assembly_end_teaching_session(uuid,integer) from public,anon,authenticated;
grant execute on function public.assembly_end_teaching_session(uuid,integer) to authenticated;

create or replace function public.assembly_resume_saved_session(target_class uuid,expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.assembly_teaching_sessions;previous text;seconds integer;
begin
 if not exists(select 1 from public.assembly_classes where id=target_class and teacher_id=auth.uid()) then raise exception 'Only the session professor can reopen it';end if;
 select * into s from public.assembly_teaching_sessions where class_id=target_class for update;
 if s.stage is distinct from 'finished' or s.revision is distinct from expected_revision then raise exception 'Session changed. Reopen its record and try again';end if;
 previous=coalesce(s.resume_state->>'stage',s.timing_log->-1->>'stage','prebrief');
 if previous not in ('preparation','prebrief','negotiation','report','debrief') then previous='prebrief';end if;
 seconds=coalesce((s.resume_state->>'seconds')::integer,case previous when 'prebrief' then 600 when 'negotiation' then 1200 when 'report' then 900 when 'debrief' then 900 else null end);
 update public.assembly_teaching_sessions set stage=previous,stage_end=null,stage_started=now(),remaining_seconds=seconds,revision=revision+1,resume_state=null,
 broadcasts=broadcasts||jsonb_build_array(jsonb_build_object('text','Professor reopened this session. Resume the timer when ready.','stage',previous,'at',now())) where class_id=target_class;
 return public.assembly_session_snapshot(target_class);
end $$;
create or replace function public.assembly_delete_session_permanently(target_class uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.assembly_classes where id=target_class and teacher_id=auth.uid() for update;
 if not found then raise exception 'Only the session professor can delete it';end if;
 delete from public.assembly_reports where class_id=target_class;
 delete from public.assembly_classes where id=target_class;
end $$;
revoke all on function public.assembly_resume_saved_session(uuid,integer),public.assembly_delete_session_permanently(uuid) from public,anon,authenticated;
grant execute on function public.assembly_resume_saved_session(uuid,integer),public.assembly_delete_session_permanently(uuid) to authenticated;
commit;
