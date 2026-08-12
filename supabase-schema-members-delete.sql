-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)
-- 관리자가 팀원 명단에서 사람을 삭제할 수 있도록 team_members에 delete 정책을 추가합니다.

drop policy if exists "public delete team_members" on team_members;
create policy "public delete team_members" on team_members for delete using (true);
