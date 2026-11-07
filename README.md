# ISM өртөө - ISM Digital Museum

Мэдээллийн Системийн Менежментийн тэнхимийн түүх, багш нар, арга хэмжээ, оюутнуудын бүтээлийг нэг дор хадгалж, интерактив хэлбэрээр танилцуулах веб аппликейшн.

**Demo:** https://ism-digital-museum-omega.vercel.app
**Хичээл:** Internet Programming · Гэрийн даалгавар №1

## Боломжууд

| Боломж | Хаана |
|---|---|
| Дижитал үзэсгэлэн (жагсаалт, дэлгэрэнгүй) | `/exhibits`, `/exhibits/:id` |
| Хайлт ба ангилал (нэр, тайлбар, технологи, бүтээгч, ангилал, он) | `/exhibits` |
| Тэнхимийн багш нар | `/teachers` |
| Өдөрлөг, арга хэмжээ + зурагт цомог (lightbox) | `/events`, `/events/:id` |
| Тэнхимийн түүх + **ISM Time Machine** (бүтээлч шийдэл) | `/history` |
| **Virtual Exhibition** — 3D үзэсгэлэнгийн танхим (бүтээлч шийдэл) | `/gallery` |
| Багшийн дэлгэрэнгүй (алба нэгж, цол, хичээл, боловсрол…) | `/teachers/:id` |
| ISM Creators — оюутан ба бүтээлийн холбоо | `/creators`, `/creators/:id` |
| Бүртгүүлэх, нэвтрэх, гарах | `/register`, `/login` |
| Бүтээл нэмэх / засах / устгах + зураг оруулах | `/exhibits/new`, `/exhibits/:id/edit` |
| Профайл засах (нэр, танилцуулга, зураг) | `/profile` |
| Админ самбар (үзмэр нуух/нийтлэх, багш, арга хэмжээ, цомог, түүх, ангилал) | `/admin` |

### Бүтээлч шийдэл 1 — Virtual Exhibition (`/gallery`)
CSS 3D-ээр барьсан виртуал үзэсгэлэнгийн танхим. Үзмэрүүд коридорын хоёр талын хананд оны дарааллаар жаазтай өлгөгдөнө.
- Хулганы дугуй, ↑ ↓ / W S — алхах; чирэх, ← → / A D — эргэх; гар утсанд хуруугаар чирнэ
- "Өмнөх / Дараах" товч нь дараагийн жааз руу очиж, түүн рүү эргэж харна (өнцгийг atan-аар тооцно)
- Жааз дээр дарахад музейн шошго (зураг, бүтээгч, он, технологи, тайлбар) нээгдэнэ
- Үзмэрүүд **ангиллаараа тусдаа танхимд** (өнгөт хана, тааз нь өлгөөтэй нэрийн самбар)
- **Minimap**: дээрээс харсан зураг, үзэгчийн байрлал ба чиглэл бодит хугацаанд; жааз дээр дарж очно
- **Хөтөчтэй аялал**: бүтээл бүр рүү автоматаар алхаж, шошгыг нээнэ
- **"Таалагдлаа"**: `exhibit_likes` хүснэгт (нийлмэл PK, RLS — зөвхөн өөрийнхийг нэмэх/устгах)
- Нэмэлт сан ашиглаагүй: CSS `perspective`, `preserve-3d`, `requestAnimationFrame` + spring

### Бүтээлч шийдэл 2 — ISM Time Machine
Тэнхимийн түүхэн үйл явдал (`history_milestones`), арга хэмжээ (`events`) болон оюутнуудын бүтээл (`exhibits`)-ийг нэг timeline дээр он оноор бүлэглэж харуулна.
- Төрлөөр шүүх (Түүх / Арга хэмжээ / Бүтээл)
- Он руу шууд үсрэх навигаци
- Он бүрийн доор тухайн онд ашиглагдсан технологиуд (Technology Evolution санааг хослуулсан)

## Технологи
- **Frontend:** React 19 + JavaScript, Vite, React Router
- **Backend:** Supabase — Authentication, PostgreSQL, Storage, Row Level Security
- **Байршуулалт:** GitHub + Vercel

## Өгөгдлийн сан

Бүрэн скрипт: [`supabase/schema.sql`](supabase/schema.sql)

| Хүснэгт | PK | FK | Зориулалт |
|---|---|---|---|
| `profiles` | `id` (uuid) | `id → auth.users.id` (1:1) | Хэрэглэгчийн профайл, `role` (creator/admin) |
| `exhibition_categories` | `id` | — | Үзмэрийн ангилал |
| `exhibits` | `id` | `category_id → exhibition_categories.id`, `creator_id → profiles.id` | Үзмэр / оюутны бүтээл |
| `teachers` | `id` | — | Багш нар |
| `events` | `id` | — | Арга хэмжээ |
| `event_photos` | `id` | `event_id → events.id` (on delete cascade) | Зурагт цомог |
| `history_milestones` | `id` | — | Тэнхимийн түүх |
| `exhibit_likes` | `(exhibit_id, user_id)` | `exhibit_id → exhibits.id`, `user_id → profiles.id` | Виртуал танхимын like (олон : олон) |

Холбоо:
- Нэг **ангилал** → олон **үзмэр** (1:N)
- Нэг **бүтээгч (profile)** → олон **үзмэр** (1:N) — ISM Creators
- Нэг **арга хэмжээ** → олон **зураг** (1:N)

### Аюулгүй байдал (RLS)
- Бүх хүснэгтэд RLS идэвхтэй.
- Зочин: нийтлэгдсэн үзмэр болон бусад нийтийн мэдээллийг зөвхөн **уншина**.
- Бүтээгч: зөвхөн **өөрийн** (`creator_id = auth.uid()`) бүтээлийг нэмэх, засах, устгах.
- Админ (`is_admin()`): багш, арга хэмжээ, түүх, ангиллыг удирдах, үзмэр нуух.
- Хэрэглэгч өөрийгөө админ болгох боломжгүй (`profiles`-ийн зөвхөн `display_name, avatar_url, bio` баганыг засах эрхтэй).
- Storage: хэрэглэгч бүр зөвхөн `museum/<өөрийн uid>/` хавтас руу зураг оруулна.
- Frontend-д зөвхөн `publishable/anon` түлхүүр ашиглана. `service_role` түлхүүр кодонд байхгүй.

## Суулгах заавар

```bash
git clone https://github.com/Khulan0909/ism-digital-museum.git
cd ism-digital-museum
npm install
```

`.env.local` файл үүсгэнэ:
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

Supabase → SQL Editor дээр `supabase/schema.sql`, дараа нь `002_teacher_details.sql`, `003_exhibit_likes.sql`-г дарааллаар ажиллуулаад:
```bash
npm run dev
```

Админ эрх олгох (бүртгүүлсний дараа SQL Editor-т):
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'таны_имэйл');
```

## Хавтасны бүтэц
```
src/
├── components/   Layout, ProtectedRoute, ExhibitCard, ui (Loading, Avatar, ImageInput…)
├── context/      AuthContext — нэвтрэлт, профайл, админ эсэх
├── lib/          supabaseClient, helpers (зураг оруулах, validation)
└── pages/        Home, Exhibits, ExhibitDetail, ExhibitForm, Teachers, Events,
                  EventDetail, TimeMachine, Creators, CreatorDetail, Login,
                  Register, Profile, Admin, NotFound
```

## Тэмдэглэл
Багш, арга хэмжээ, түүхийн жишээ өгөгдөл нь зохиомол бөгөөд бодит мэдээллээр (зөвшөөрөлтэйгээр) солигдоно.
