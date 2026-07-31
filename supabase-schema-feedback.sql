-- "앱 정보" 화면의 요청사항 게시판용 테이블. Supabase SQL Editor에서 실행하세요.

create table if not exists feedback_posts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_posts_created_at_idx on feedback_posts (created_at desc);

alter table feedback_posts enable row level security;

drop policy if exists "public read feedback" on feedback_posts;
drop policy if exists "public insert feedback" on feedback_posts;
create policy "public read feedback" on feedback_posts for select using (true);
create policy "public insert feedback" on feedback_posts for insert with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'feedback_posts'
  ) then
    alter publication supabase_realtime add table feedback_posts;
  end if;
end $$;
