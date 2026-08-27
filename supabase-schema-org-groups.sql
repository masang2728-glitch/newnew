-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)
-- 직장(team) → 공장(factory) 소속 매핑 테이블. 기존 테이블은 전혀 건드리지 않는다.

create table if not exists org_groups (
  team text primary key,
  factory text not null
);

alter table org_groups enable row level security;

drop policy if exists "public read org_groups" on org_groups;
drop policy if exists "public insert org_groups" on org_groups;
drop policy if exists "public update org_groups" on org_groups;
create policy "public read org_groups" on org_groups for select using (true);
create policy "public insert org_groups" on org_groups for insert with check (true);
create policy "public update org_groups" on org_groups for update using (true);

-- 실시간 구독을 위해 Realtime publication에 테이블 추가 (이미 추가되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'org_groups'
  ) then
    alter publication supabase_realtime add table org_groups;
  end if;
end $$;
