-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)

create extension if not exists pgcrypto;

create table if not exists vacation_requests (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  date date not null,
  leave_type text not null,
  start_time text,
  end_time text,
  destination text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists overtime_requests (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  name text not null,
  date date not null,
  sub_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists vacation_requests_team_date_idx on vacation_requests (team, date);
create index if not exists overtime_requests_team_date_idx on overtime_requests (team, date);

-- 이 앱은 로그인 없이 이름/팀명만으로 동작하므로, RLS는 "누구나 읽기/쓰기 가능"으로 열어둔다.
-- (본인만 취소, 관리자만 타인 삭제 같은 권한은 클라이언트 앱 UI 단에서 처리된다.)
alter table vacation_requests enable row level security;
alter table overtime_requests enable row level security;

drop policy if exists "public read vacation" on vacation_requests;
drop policy if exists "public insert vacation" on vacation_requests;
drop policy if exists "public delete vacation" on vacation_requests;
create policy "public read vacation" on vacation_requests for select using (true);
create policy "public insert vacation" on vacation_requests for insert with check (true);
create policy "public delete vacation" on vacation_requests for delete using (true);

drop policy if exists "public read overtime" on overtime_requests;
drop policy if exists "public insert overtime" on overtime_requests;
drop policy if exists "public delete overtime" on overtime_requests;
create policy "public read overtime" on overtime_requests for select using (true);
create policy "public insert overtime" on overtime_requests for insert with check (true);
create policy "public delete overtime" on overtime_requests for delete using (true);

-- 실시간 구독을 위해 Realtime publication에 테이블 추가 (이미 추가되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'vacation_requests'
  ) then
    alter publication supabase_realtime add table vacation_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'overtime_requests'
  ) then
    alter publication supabase_realtime add table overtime_requests;
  end if;
end $$;
