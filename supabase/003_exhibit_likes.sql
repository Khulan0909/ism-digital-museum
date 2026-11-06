-- =====================================================================
-- 003: Виртуал танхимын "Таалагдлаа" (like)
-- Supabase → SQL Editor → New query → хуулж тавиад → Run (НЭГ удаа)
-- =====================================================================

-- exhibit_likes: хэрэглэгч ↔ үзмэр (олон : олон)
-- Нийлмэл PK (exhibit_id, user_id) — нэг хэрэглэгч нэг үзмэрт нэг л удаа like дарна.
-- FK exhibit_id → exhibits.id, user_id → profiles.id. Аль нэг нь устахад like хамт устна.
create table if not exists public.exhibit_likes (
  exhibit_id  bigint not null references public.exhibits (id) on delete cascade,
  user_id     uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (exhibit_id, user_id)
);

alter table public.exhibit_likes enable row level security;

-- Хүн бүр тоог харна
create policy "likes: public read"
  on public.exhibit_likes for select using (true);

-- Зөвхөн өөрийн нэрийн өмнөөс like дарна
create policy "likes: insert own"
  on public.exhibit_likes for insert to authenticated
  with check (user_id = auth.uid());

-- Зөвхөн өөрийн like-ийг буцаана
create policy "likes: delete own"
  on public.exhibit_likes for delete to authenticated
  using (user_id = auth.uid());
