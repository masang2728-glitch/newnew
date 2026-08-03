-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)

create extension if not exists pgcrypto;

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  order_no integer not null,
  joined_at timestamptz not null default now(),
  unique (team, name)
);

create index if not exists team_members_team_idx on team_members (team);

-- 이 앱은 로그인 없이 이름/팀명만으로 동작하므로, RLS는 "누구나 읽기/쓰기 가능"으로 열어둔다.
alter table team_members enable row level security;

drop policy if exists "public read team_members" on team_members;
drop policy if exists "public insert team_members" on team_members;
drop policy if exists "public update team_members" on team_members;
create policy "public read team_members" on team_members for select using (true);
create policy "public insert team_members" on team_members for insert with check (true);
create policy "public update team_members" on team_members for update using (true);

-- 실시간 구독을 위해 Realtime publication에 테이블 추가 (이미 추가되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'team_members'
  ) then
    alter publication supabase_realtime add table team_members;
  end if;
end $$;
