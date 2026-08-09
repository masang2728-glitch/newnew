-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)
-- 관리자가 신청 건을 확인했는지 여부를 기록하는 컬럼을 추가합니다.

alter table vacation_requests add column if not exists confirmed_at timestamptz;
alter table vacation_requests add column if not exists confirmed_by text;

alter table overtime_requests add column if not exists confirmed_at timestamptz;
alter table overtime_requests add column if not exists confirmed_by text;

-- 기존에는 update 정책이 없어 확인 처리(update)가 막혀 있었으므로 추가한다.
drop policy if exists "public update vacation" on vacation_requests;
create policy "public update vacation" on vacation_requests for update using (true) with check (true);

drop policy if exists "public update overtime" on overtime_requests;
create policy "public update overtime" on overtime_requests for update using (true) with check (true);
