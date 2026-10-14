-- Apply once in a new Supabase project. All student records are private by default.
begin;
create table public.assembly_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role = 'professor')
);
create table public.assembly_classes (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 100),
 join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 accepting_members boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.assembly_memberships (
 class_id uuid not null references public.assembly_classes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(class_id,user_id)
);
create table public.assembly_reports (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 report_id text not null check(char_length(report_id) between 1 and 100),
 class_id uuid references public.assembly_classes(id) on delete set null,
 report jsonb not null check (jsonb_typeof(report)='object' and octet_length(report::text)<150000),
 created_at timestamptz not null default now(),
 unique(owner_id,report_id)
);
alter table public.assembly_roles enable row level security;
alter table public.assembly_classes enable row level security;
alter table public.assembly_memberships enable row level security;
alter table public.assembly_reports enable row level security;
revoke all on public.assembly_roles,public.assembly_classes,public.assembly_memberships,public.assembly_reports from anon,authenticated;
grant select on public.assembly_roles,public.assembly_classes,public.assembly_memberships to authenticated;
grant select,insert,update on public.assembly_reports to authenticated;
grant all on public.assembly_roles,public.assembly_classes,public.assembly_memberships,public.assembly_reports to service_role;
create policy own_role on public.assembly_roles for select to authenticated using(user_id=(select auth.uid()));
create policy own_memberships on public.assembly_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy visible_classes on public.assembly_classes for select to authenticated using(
 teacher_id=(select auth.uid()) or exists(select 1 from public.assembly_memberships m where m.class_id=id and m.user_id=(select auth.uid()))
);
create policy own_or_submitted_report on public.assembly_reports for select to authenticated using(
 owner_id=(select auth.uid()) or exists(select 1 from public.assembly_classes c where c.id=class_id and c.teacher_id=(select auth.uid()))
);
create policy insert_own_report on public.assembly_reports for insert to authenticated with check(
 owner_id=(select auth.uid()) and (class_id is null or exists(select 1 from public.assembly_memberships m where m.class_id=assembly_reports.class_id and m.user_id=(select auth.uid())))
);
create policy update_own_report on public.assembly_reports for update to authenticated using(owner_id=(select auth.uid())) with check(
 owner_id=(select auth.uid()) and (class_id is null or exists(select 1 from public.assembly_memberships m where m.class_id=assembly_reports.class_id and m.user_id=(select auth.uid())))
);
create function public.assembly_create_class(class_title text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.assembly_roles where user_id=auth.uid() and role='professor') then raise exception 'Professor access required'; end if;
 if length(trim(class_title)) not between 1 and 100 then raise exception 'Use a class title of 1–100 characters'; end if;
 insert into public.assembly_classes(teacher_id,title) values(auth.uid(),trim(class_title)) returning id into result;
 return result;
end $$;
create function public.assembly_join_class(code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select id into result from public.assembly_classes where join_code=upper(trim(code)) and accepting_members;
 if result is null then raise exception 'Class code is invalid or joining is closed'; end if;
 insert into public.assembly_memberships(class_id,user_id) values(result,auth.uid()) on conflict do nothing;
 return result;
end $$;
create function public.assembly_close_class(target_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 update public.assembly_classes set accepting_members=false where id=target_id and teacher_id=auth.uid();
 if not found then raise exception 'Class not found'; end if;
end $$;
revoke all on function public.assembly_create_class(text),public.assembly_join_class(text),public.assembly_close_class(uuid) from public,anon,authenticated;
grant execute on function public.assembly_create_class(text),public.assembly_join_class(text),public.assembly_close_class(uuid) to authenticated;
create index on public.assembly_reports(class_id);
create index on public.assembly_memberships(user_id);
commit;
