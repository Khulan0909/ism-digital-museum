-- =====================================================================
-- ISM Digital Museum — Supabase өгөгдлийн сангийн скрипт
-- Supabase → SQL Editor → New query → бүгдийг хуулж тавиад → Run
-- (Шинэ, хоосон төсөл дээр НЭГ удаа ажиллуулна)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ХҮСНЭГТҮҮД
-- ---------------------------------------------------------------------

-- profiles: хэрэглэгчийн профайл.
-- PK id = auth.users.id (FK) → Supabase Auth-ийн хэрэглэгч бүрт нэг профайл (1:1).
-- role: 'creator' (оюутан/бүтээгч) эсвэл 'admin'.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  role          text not null default 'creator' check (role in ('creator', 'admin')),
  created_at    timestamptz not null default now()
);

-- exhibition_categories: үзмэрийн ангилал.
create table public.exhibition_categories (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  description  text
);

-- exhibits: музейн үзмэр / оюутны бүтээл.
-- FK category_id → exhibition_categories.id (олон үзмэр : нэг ангилал)
-- FK creator_id  → profiles.id              (олон үзмэр : нэг бүтээгч) — ISM Creators холбоо
-- status: 'published' = нийтэд харагдана, 'hidden' = админ нуусан.
create table public.exhibits (
  id                bigint generated always as identity primary key,
  title             text not null check (char_length(title) between 2 and 150),
  description       text,
  image_url         text,
  category_id       bigint references public.exhibition_categories (id) on delete set null,
  technology_stack  text[] not null default '{}',
  year_created      int check (year_created between 1990 and 2100),
  creator_id        uuid references public.profiles (id) on delete set null default auth.uid(),
  demo_url          text,
  github_url        text,
  status            text not null default 'published' check (status in ('published', 'hidden')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- teachers: тэнхимийн багш нар.
-- courses: мөр бүр "КОД Хичээлийн нэр" (жишээ: CSC111 Компьютерийн үндэс ба хэрэглээ)
create table public.teachers (
  id            bigint generated always as identity primary key,
  name          text not null,
  position      text,
  department    text,   -- Алба нэгж
  degree        text,   -- Цол зэрэг
  email         text,
  room          text,   -- Өрөөний дугаар
  courses       text[] not null default '{}',
  bio           text,
  education     text,   -- Боловсрол
  trainings     text,   -- Мэргэжлийн сургалт
  publications  text,   -- Эрдэм шинжилгээний бүтээл
  research      text,   -- Судалгааны төсөлт ажлын тайлан, орчуулга
  photo_url     text,
  sort_order    int not null default 0
);

-- events: тэнхимийн өдөрлөг, арга хэмжээ.
create table public.events (
  id               bigint generated always as identity primary key,
  title            text not null,
  event_date       date not null,
  description      text,
  cover_image_url  text,
  created_at       timestamptz not null default now()
);

-- event_photos: арга хэмжээний зурагт цомог.
-- FK event_id → events.id (нэг арга хэмжээ : олон зураг). Арга хэмжээ устахад зургууд нь хамт устна.
create table public.event_photos (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references public.events (id) on delete cascade,
  image_url  text not null,
  caption    text
);

-- history_milestones: тэнхимийн түүхэн үйл явдал (Тэнхимийн түүх + ISM Time Machine).
create table public.history_milestones (
  id           bigint generated always as identity primary key,
  year         int not null,
  title        text not null,
  description  text,
  image_url    text
);

-- Хайлт, шүүлтүүрийг хурдасгах индексүүд
create index exhibits_category_idx on public.exhibits (category_id);
create index exhibits_creator_idx  on public.exhibits (creator_id);
create index exhibits_year_idx     on public.exhibits (year_created);
create index event_photos_event_idx on public.event_photos (event_id);


-- ---------------------------------------------------------------------
-- 2. ФУНКЦ, TRIGGER
-- ---------------------------------------------------------------------

-- Бүртгүүлэх үед профайлыг автоматаар үүсгэнэ.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Одоогийн хэрэглэгч админ эсэхийг шалгана (RLS policy-д ашиглана).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- exhibits засагдах бүрт updated_at шинэчлэгдэнэ.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger exhibits_set_updated_at
  before update on public.exhibits
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------

alter table public.profiles              enable row level security;
alter table public.exhibition_categories enable row level security;
alter table public.exhibits              enable row level security;
alter table public.teachers              enable row level security;
alter table public.events                enable row level security;
alter table public.event_photos          enable row level security;
alter table public.history_milestones    enable row level security;

-- profiles: хүн бүр үзнэ (ISM Creators), зөвхөн өөрийнхөө профайлыг засна.
create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: owner update"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Хэрэглэгч өөрийгөө admin болгохоос сэргийлж зөвхөн эдгээр баганыг засахыг зөвшөөрнө.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;

-- exhibits: нийтлэгдсэнийг хүн бүр үзнэ; эзэн нь болон админ нуусныг ч харна.
create policy "exhibits: read published or own"
  on public.exhibits for select
  using (status = 'published' or creator_id = auth.uid() or public.is_admin());

create policy "exhibits: insert own"
  on public.exhibits for insert to authenticated
  with check (creator_id = auth.uid());

create policy "exhibits: update own or admin"
  on public.exhibits for update to authenticated
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

create policy "exhibits: delete own or admin"
  on public.exhibits for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- Ангилал, багш, арга хэмжээ, зураг, түүх: хүн бүр үзнэ, зөвхөн админ өөрчилнө.
create policy "categories: public read"  on public.exhibition_categories for select using (true);
create policy "categories: admin write"  on public.exhibition_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "teachers: public read"    on public.teachers for select using (true);
create policy "teachers: admin write"    on public.teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "events: public read"      on public.events for select using (true);
create policy "events: admin write"      on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "event_photos: public read" on public.event_photos for select using (true);
create policy "event_photos: admin write" on public.event_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "history: public read"     on public.history_milestones for select using (true);
create policy "history: admin write"     on public.history_milestones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 4. STORAGE (зураг хадгалах)
-- Файлын зам: museum/<хэрэглэгчийн_uid>/<файлын_нэр>
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('museum', 'museum', true)
on conflict (id) do nothing;

create policy "museum: public read"
  on storage.objects for select
  using (bucket_id = 'museum');

create policy "museum: upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'museum' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "museum: update own or admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'museum' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "museum: delete own or admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'museum' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));


-- ---------------------------------------------------------------------
-- 5. ЖИШЭЭ ӨГӨГДӨЛ
-- Анхаар: багш, арга хэмжээ, түүхийн мэдээлэл ЗӨВХӨН ЖИШЭЭ.
-- Бодит мэдээлэл, зургаар (зөвшөөрөлтэйгээр) солиорой.
-- ---------------------------------------------------------------------

insert into public.exhibition_categories (name, description) values
  ('Веб хөгжүүлэлт',      'Вэб сайт, вэб аппликейшн'),
  ('Мобайл апп',          'iOS, Android аппликейшн'),
  ('Өгөгдлийн шинжилгээ', 'Data mining, BI, dashboard'),
  ('AI / ML',             'Хиймэл оюун, машин сургалт'),
  ('Систем шинжилгээ',    'Бизнес процесс, системийн загварчлал'),
  ('Судалгааны ажил',     'Эрдэм шинжилгээ, дипломын ажил');

insert into public.exhibits (title, description, image_url, category_id, technology_stack, year_created, creator_id, demo_url, github_url) values
  ('Оюутны хичээлийн хуваарь', 'Нэгдүгээр курсын оюутнуудад зориулсан хуваарь, сануулагч бүхий вэб апп.',
   'https://picsum.photos/seed/ism-ex1/800/500',
   (select id from public.exhibition_categories where name = 'Веб хөгжүүлэлт'),
   array['React', 'Supabase'], 2026, null, null, null),
  ('Жижиг дэлгүүрийн бараа бүртгэл', 'Барааны үлдэгдэл, орлого зарлагыг хянах систем.',
   'https://picsum.photos/seed/ism-ex2/800/500',
   (select id from public.exhibition_categories where name = 'Систем шинжилгээ'),
   array['Node.js', 'PostgreSQL'], 2025, null, null, null),
  ('Зээлийн эрсдэлийн таамаглал', 'Decision Tree болон Neural Net загваруудын харьцуулалт.',
   'https://picsum.photos/seed/ism-ex3/800/500',
   (select id from public.exhibition_categories where name = 'Өгөгдлийн шинжилгээ'),
   array['RapidMiner', 'Python'], 2025, null, null, null),
  ('Хүнсний ургацын регресс', 'PyTorch ашигласан олон гаралттай шугаман регресс.',
   'https://picsum.photos/seed/ism-ex4/800/500',
   (select id from public.exhibition_categories where name = 'AI / ML'),
   array['PyTorch', 'Colab'], 2026, null, null, null),
  ('Тэнхимийн мэдээллийн самбар', 'Оюутны тоо, хичээлийн үнэлгээний dashboard.',
   'https://picsum.photos/seed/ism-ex5/800/500',
   (select id from public.exhibition_categories where name = 'Өгөгдлийн шинжилгээ'),
   array['Power BI', 'SQL'], 2024, null, null, null),
  ('Кампусын навигаци апп', 'Хичээлийн байр, танхимыг олоход туслах мобайл апп.',
   'https://picsum.photos/seed/ism-ex6/800/500',
   (select id from public.exhibition_categories where name = 'Мобайл апп'),
   array['Flutter', 'Firebase'], 2023, null, null, null);

insert into public.teachers (name, position, courses, bio, photo_url, sort_order) values
  ('Жишээ Багш А', 'Тэнхимийн эрхлэгч, дэд профессор', array['Мэдээллийн систем', 'Системийн шинжилгээ'],
   'Жишээ танилцуулга — бодит мэдээллээр солино.', 'https://picsum.photos/seed/ism-t1/400/400', 1),
  ('Жишээ Багш Б', 'Ахлах багш', array['Интернет програмчлал', 'Вэб технологи'],
   'Жишээ танилцуулга — бодит мэдээллээр солино.', 'https://picsum.photos/seed/ism-t2/400/400', 2),
  ('Жишээ Багш В', 'Багш', array['Өгөгдөл олборлолт', 'Өгөгдлийн сан'],
   'Жишээ танилцуулга — бодит мэдээллээр солино.', 'https://picsum.photos/seed/ism-t3/400/400', 3),
  ('Жишээ Багш Г', 'Багш', array['Agile төслийн удирдлага'],
   'Жишээ танилцуулга — бодит мэдээллээр солино.', 'https://picsum.photos/seed/ism-t4/400/400', 4);

insert into public.events (title, event_date, description, cover_image_url) values
  ('ISM өдөрлөг', '2025-11-15', 'Тэнхимийн жил бүрийн өдөрлөг (жишээ).', 'https://picsum.photos/seed/ism-e1/800/500'),
  ('Хакатон', '2026-03-20', 'Оюутны 24 цагийн хакатон (жишээ).', 'https://picsum.photos/seed/ism-e2/800/500'),
  ('Технологийн семинар', '2026-10-10', 'Салбарын мэргэжилтнүүдийн семинар (жишээ).', 'https://picsum.photos/seed/ism-e3/800/500');

insert into public.event_photos (event_id, image_url, caption)
select e.id, 'https://picsum.photos/seed/' || e.id || '-' || g || '/800/600', 'Зураг ' || g
from public.events e
cross join generate_series(1, 4) as g;

insert into public.history_milestones (year, title, description, image_url) values
  (2000, 'Тэнхим байгуулагдсан (жишээ)', 'Бодит түүхэн мэдээллээр солино.', 'https://picsum.photos/seed/ism-h1/800/500'),
  (2010, 'Шинэ хөтөлбөр батлагдсан (жишээ)', 'Бодит түүхэн мэдээллээр солино.', 'https://picsum.photos/seed/ism-h2/800/500'),
  (2018, 'Компьютерийн лаборатори шинэчлэгдсэн (жишээ)', 'Бодит түүхэн мэдээллээр солино.', 'https://picsum.photos/seed/ism-h3/800/500'),
  (2024, 'Олон улсын хамтын ажиллагаа (жишээ)', 'Бодит түүхэн мэдээллээр солино.', 'https://picsum.photos/seed/ism-h4/800/500');


-- ---------------------------------------------------------------------
-- 6. ӨӨРИЙГӨӨ АДМИН БОЛГОХ (сайт дээр бүртгүүлсний ДАРАА тусад нь ажиллуулна)
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'таны_имэйл@example.com');
