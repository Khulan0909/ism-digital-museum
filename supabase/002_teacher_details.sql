-- =====================================================================
-- 002: Багшийн дэлгэрэнгүй мэдээлэл
-- Supabase → SQL Editor → New query → хуулж тавиад → Run (НЭГ удаа)
-- =====================================================================

alter table public.teachers
  add column if not exists department   text,   -- Алба нэгж
  add column if not exists degree       text,   -- Цол зэрэг
  add column if not exists email        text,   -- И-мэйл
  add column if not exists room         text,   -- Өрөөний дугаар
  add column if not exists education    text,   -- Боловсрол (мөр бүр нэг зүйл)
  add column if not exists trainings    text,   -- Мэргэжлийн сургалт
  add column if not exists publications text,   -- Эрдэм шинжилгээний бүтээл
  add column if not exists research     text;   -- Судалгааны төсөлт ажлын тайлан, орчуулга

-- courses: мөр бүр "КОД Хичээлийн нэр" хэлбэртэй (жишээ: CSC111 Компьютерийн үндэс ба хэрэглээ)

-- Жишээ багш нарт жишээ мэдээлэл (бодит мэдээллээр солино)
update public.teachers set
  department = 'Мэдээллийн системийн менежментийн тэнхим',
  degree = case when sort_order = 1 then 'Доктор (Ph.D)' else 'Магистр' end,
  email = 'jishee.bagsh' || sort_order || '@example.com',
  room = 'Жишээ ' || (300 + sort_order),
  education = 'Бакалавр — Жишээ их сургууль, Мэдээллийн технологи' || chr(10) || 'Магистр — Жишээ их сургууль, Мэдээллийн систем',
  trainings = 'Жишээ мэргэжлийн сургалт, 2024' || chr(10) || 'Жишээ багшлах арга зүйн сургалт, 2025',
  publications = 'Жишээ өгүүлэл: Мэдээллийн системийн хэрэглээ, 2023',
  research = 'Жишээ судалгааны тайлан, 2024'
where name like 'Жишээ%';

update public.teachers set courses = array['CSC111 Компьютерийн үндэс ба хэрэглээ', 'ISM221 Мэдээллийн системийн үндэс']
  where name = 'Жишээ Багш А';
update public.teachers set courses = array['WEB231 Вэб дизайн', 'CGR221 График дизайн']
  where name = 'Жишээ Багш Б';
update public.teachers set courses = array['ISA332 Бизнесийн шинжилгээ', 'DBM433 Өгөгдөл олборлолт']
  where name = 'Жишээ Багш В';
update public.teachers set courses = array['ISM432 Agile төслийн удирдлага']
  where name = 'Жишээ Багш Г';
