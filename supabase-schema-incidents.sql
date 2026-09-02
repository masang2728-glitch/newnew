-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)
-- "사고관리": 출장/교육/휴직/공로/파견 - 직장 관리자가 직접 입력하는 기간 기반 기록.
-- 달력에는 표시되지 않고, start_date~end_date 기간의 매일 사고현황표 집계에만 포함된다.

create extension if not exists pgcrypto;

create table if not exists incident_records (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  type text not null,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists incident_records_team_idx on incident_records (team);
create index if not exists incident_records_date_range_idx on incident_records (start_date, end_date);

-- 이 앱은 로그인 없이 이름/팀명만으로 동작하므로, RLS는 "누구나 읽기/쓰기 가능"으로 열어둔다.
alter table incident_records enable row level security;

drop policy if exists "public read incident_records" on incident_records;
drop policy if exists "public insert incident_records" on incident_records;
drop policy if exists "public delete incident_records" on incident_records;
create policy "public read incident_records" on incident_records for select using (true);
create policy "public insert incident_records" on incident_records for insert with check (true);
create policy "public delete incident_records" on incident_records for delete using (true);

-- 실시간 구독을 위해 Realtime publication에 테이블 추가 (이미 추가되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'incident_records'
  ) then
    alter publication supabase_realtime add table incident_records;
  end if;
end $$;
