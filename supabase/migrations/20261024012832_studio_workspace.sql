-- Additive Studio schema. Does not modify Manager tables or auth settings.
create table public.studio_projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  kind text not null check (kind in ('product','narrative','music','microdrama')),
  planning jsonb not null check (jsonb_typeof(planning)='object' and octet_length(planning::text)<=48000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,owner_id)
);
create index studio_projects_owner_updated on public.studio_projects(owner_id,updated_at desc);
alter table public.studio_projects enable row level security;
create policy studio_projects_read on public.studio_projects for select to authenticated using ((select auth.uid())=owner_id);
create policy studio_projects_create on public.studio_projects for insert to authenticated with check ((select auth.uid())=owner_id);
create policy studio_projects_edit on public.studio_projects for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
revoke all on public.studio_projects from anon, authenticated;
grant select on public.studio_projects to authenticated;
grant insert (id,owner_id,name,kind,planning) on public.studio_projects to authenticated;
grant update (name,kind,planning) on public.studio_projects to authenticated;

create function public.studio_bump_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.revision=old.revision+1;
  new.updated_at=clock_timestamp();
  return new;
end;
$$;
revoke execute on function public.studio_bump_revision() from public, anon, authenticated;
create trigger studio_projects_revision before update on public.studio_projects for each row execute function public.studio_bump_revision();

create table public.studio_messages (
  id uuid primary key,
  project_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 6000),
  kind text not null default 'note' check (kind='note'),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (project_id,owner_id) references public.studio_projects(id,owner_id) on delete cascade
);
create index studio_messages_project_time on public.studio_messages(project_id,created_at desc,id desc);
create index studio_messages_owner on public.studio_messages(owner_id);
alter table public.studio_messages enable row level security;
create policy studio_messages_read on public.studio_messages for select to authenticated using ((select auth.uid())=owner_id);
create policy studio_messages_create on public.studio_messages for insert to authenticated with check (
  (select auth.uid())=owner_id and exists (select 1 from public.studio_projects p where p.id=project_id and p.owner_id=(select auth.uid()))
);
revoke all on public.studio_messages from anon, authenticated;
grant select on public.studio_messages to authenticated;
grant insert (id,project_id,owner_id,body,kind) on public.studio_messages to authenticated;
