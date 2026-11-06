import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT, formatDate, translateError, uploadImage } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { ErrorBox, ImageInput, Loading, SuccessBox } from '../components/ui'

// Админ: нийтэд харагдах агуулгыг хянах. RLS-ийн is_admin() шалгалт сервер талд хамгаална.
const TABS = [
  ['exhibits', 'Үзмэр'],
  ['teachers', 'Багш нар'],
  ['events', 'Арга хэмжээ'],
  ['history', 'Түүх'],
  ['categories', 'Ангилал'],
]

export default function Admin() {
  const [tab, setTab] = useState('exhibits')
  return (
    <section className="container section">
      <h1>Админ самбар</h1>
            <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'exhibits' && <ExhibitsAdmin />}
      {tab === 'teachers' && <TeachersAdmin />}
      {tab === 'events' && <EventsAdmin />}
      {tab === 'history' && <HistoryAdmin />}
      {tab === 'categories' && <CategoriesAdmin />}
    </section>
  )
}

// Хүснэгтийн мөрүүдийг ачаалах жижиг hook
function useRows(table, select = '*', order = 'id', ascending = true) {
  const [rows, setRows] = useState(null)
  const reload = useCallback(async () => {
    const { data } = await supabase.from(table).select(select).order(order, { ascending })
    setRows(data ?? [])
  }, [table, select, order, ascending])
  useEffect(() => {
    reload()
  }, [reload])
  return [rows, reload]
}

async function confirmDelete(table, id, label, reload, setError) {
  if (!window.confirm(`"${label}"-г устгах уу?`)) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) setError(translateError(error))
  else reload()
}

/* ---------- Үзмэр: нуух / нийтлэх / устгах ---------- */
function ExhibitsAdmin() {
  const [rows, reload] = useRows('exhibits', EXHIBIT_SELECT, 'created_at', false)
  const [error, setError] = useState('')

  async function toggle(row) {
    const status = row.status === 'published' ? 'hidden' : 'published'
    const { error } = await supabase.from('exhibits').update({ status }).eq('id', row.id)
    if (error) setError(translateError(error))
    else reload()
  }

  if (!rows) return <Loading />
  return (
    <div className="admin-panel">
      <ErrorBox message={error} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Гарчиг</th><th>Бүтээгч</th><th>Он</th><th>Төлөв</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/exhibits/${r.id}`} className="link">{r.title}</Link></td>
                <td>{r.creator?.display_name ?? '—'}</td>
                <td>{r.year_created ?? '—'}</td>
                <td><span className={`badge inline ${r.status === 'hidden' ? 'badge-warn' : 'badge-ok'}`}>{r.status === 'hidden' ? 'Нуусан' : 'Нийтэлсэн'}</span></td>
                <td className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(r)}>{r.status === 'hidden' ? 'Нийтлэх' : 'Нуух'}</button>
                  <Link className="btn btn-ghost btn-sm" to={`/exhibits/${r.id}/edit`}>Засах</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('exhibits', r.id, r.title, reload, setError)}>Устгах</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Багш нар: нэмэх / засах / устгах ---------- */
// Нэг мөрт талбарууд
const TEACHER_INPUTS = [
  ['name', 'Нэр *'],
  ['position', 'Албан тушаал'],
  ['department', 'Алба нэгж'],
  ['degree', 'Цол зэрэг'],
  ['email', 'И-мэйл'],
  ['room', 'Өрөөний дугаар'],
]
// Олон мөрт талбарууд: мөр бүр нэг зүйл
const TEACHER_TEXTAREAS = [
  ['courses', 'Заадаг хичээлүүд', 'Мөр бүрт: КОД Хичээлийн нэр\nCSC111 Компьютерийн үндэс ба хэрэглээ'],
  ['bio', 'Товч танилцуулга', ''],
  ['education', 'Боловсрол', 'Мөр бүрт нэг зэрэг'],
  ['trainings', 'Мэргэжлийн сургалт', 'Мөр бүрт нэг сургалт'],
  ['publications', 'Эрдэм шинжилгээний бүтээл', 'Мөр бүрт нэг бүтээл'],
  ['research', 'Судалгааны төсөлт ажлын тайлан, орчуулга', 'Мөр бүрт нэг ажил'],
]
const EMPTY_TEACHER = Object.fromEntries(
  [...TEACHER_INPUTS, ...TEACHER_TEXTAREAS].map(([k]) => [k, ''])
)
EMPTY_TEACHER.photo_url = ''
EMPTY_TEACHER.sort_order = 0

function TeachersAdmin() {
  const { user } = useAuth()
  const [rows, reload] = useRows('teachers', '*', 'sort_order')
  const [form, setForm] = useState(EMPTY_TEACHER)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function reset() {
    setForm(EMPTY_TEACHER)
    setEditingId(null)
    setFile(null)
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.name.trim().length < 2) return setError('Багшийн нэрийг оруулна уу.')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setError('И-мэйл хаяг буруу байна.')
    setSaving(true)
    try {
      let photo_url = form.photo_url || null
      if (file) photo_url = await uploadImage(file, user.id)
      const text = (v) => v.trim() || null
      const payload = {
        name: form.name.trim(),
        position: text(form.position),
        department: text(form.department),
        degree: text(form.degree),
        email: text(form.email),
        room: text(form.room),
        courses: form.courses.split('\n').map((l) => l.trim()).filter(Boolean),
        bio: text(form.bio),
        education: text(form.education),
        trainings: text(form.trainings),
        publications: text(form.publications),
        research: text(form.research),
        photo_url,
        sort_order: Number(form.sort_order) || 0,
      }
      const { error } = editingId
        ? await supabase.from('teachers').update(payload).eq('id', editingId)
        : await supabase.from('teachers').insert(payload)
      if (error) throw error
      setSuccess(editingId ? 'Багшийн мэдээлэл шинэчлэгдлээ.' : 'Багш нэмэгдлээ.')
      reset()
      reload()
    } catch (err) {
      setError(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  function edit(row) {
    setEditingId(row.id)
    setFile(null)
    const next = { ...EMPTY_TEACHER }
    for (const key of Object.keys(next)) if (row[key] != null) next[key] = row[key]
    next.courses = (row.courses ?? []).join('\n')
    setForm(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="admin-panel admin-split">
      <form className="card form-card form" onSubmit={save}>
        <h2>{editingId ? 'Багш засах' : 'Багш нэмэх'}</h2>
        <ErrorBox message={error} />
        <SuccessBox message={success} />
        {TEACHER_INPUTS.map(([key, label]) => (
          <div key={key} className="field">
            <label>{label}</label>
            <input type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={update(key)} />
          </div>
        ))}
        {TEACHER_TEXTAREAS.map(([key, label, placeholder]) => (
          <div key={key} className="field">
            <label>{label}</label>
            <textarea rows={key === 'courses' ? 5 : 3} placeholder={placeholder} value={form[key]} onChange={update(key)} />
          </div>
        ))}
        <div className="field"><label>Эрэмбэ</label><input type="number" value={form.sort_order} onChange={update('sort_order')} /></div>
        <ImageInput currentUrl={form.photo_url} file={file} onChange={setFile} />
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Хадгалж байна…' : 'Хадгалах'}</button>
          {editingId && <button type="button" className="btn btn-ghost" onClick={reset}>Болих</button>}
        </div>
      </form>

      <div className="admin-list">
        {!rows ? <Loading /> : rows.map((r) => (
          <div key={r.id} className="admin-row">
            {r.photo_url && <img src={r.photo_url} alt="" />}
            <div className="grow"><strong>{r.name}</strong><p className="muted small">{r.position}</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => edit(r)}>Засах</button>
            <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('teachers', r.id, r.name, reload, setError)}>Устгах</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Арга хэмжээ + зурагт цомог ---------- */
const EMPTY_EVENT = { title: '', event_date: '', description: '', cover_image_url: '' }

function EventsAdmin() {
  const { user } = useAuth()
  const [rows, reload] = useRows('events', '*, event_photos(*)', 'event_date', false)
  const [form, setForm] = useState(EMPTY_EVENT)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [selected, setSelected] = useState(null) // зураг нэмэх арга хэмжээний id
  const [photoFiles, setPhotoFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function reset() {
    setForm(EMPTY_EVENT)
    setEditingId(null)
    setFile(null)
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.title.trim().length < 2) return setError('Арга хэмжээний нэрийг оруулна уу.')
    if (!form.event_date) return setError('Огноог сонгоно уу.')
    setSaving(true)
    try {
      let cover_image_url = form.cover_image_url || null
      if (file) cover_image_url = await uploadImage(file, user.id)
      const payload = {
        title: form.title.trim(),
        event_date: form.event_date,
        description: form.description.trim() || null,
        cover_image_url,
      }
      const { error } = editingId
        ? await supabase.from('events').update(payload).eq('id', editingId)
        : await supabase.from('events').insert(payload)
      if (error) throw error
      setSuccess('Хадгалагдлаа.')
      reset()
      reload()
    } catch (err) {
      setError(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhotos() {
    if (!selected || photoFiles.length === 0) return
    setError('')
    setSaving(true)
    try {
      for (const f of photoFiles) {
        const image_url = await uploadImage(f, user.id)
        const { error } = await supabase.from('event_photos').insert({ event_id: selected, image_url, caption: caption.trim() || null })
        if (error) throw error
      }
      setPhotoFiles([])
      setCaption('')
      setSuccess(`${photoFiles.length} зураг нэмэгдлээ.`)
      reload()
    } catch (err) {
      setError(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  function edit(row) {
    setEditingId(row.id)
    setFile(null)
    setForm({
      title: row.title,
      event_date: row.event_date,
      description: row.description ?? '',
      cover_image_url: row.cover_image_url ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedEvent = rows?.find((r) => r.id === selected)

  return (
    <div className="admin-panel admin-split">
      <form className="card form-card form" onSubmit={save}>
        <h2>{editingId ? 'Арга хэмжээ засах' : 'Арга хэмжээ нэмэх'}</h2>
        <ErrorBox message={error} />
        <SuccessBox message={success} />
        <div className="field"><label>Нэр *</label><input value={form.title} onChange={update('title')} /></div>
        <div className="field"><label>Огноо *</label><input type="date" value={form.event_date} onChange={update('event_date')} /></div>
        <div className="field"><label>Тайлбар</label><textarea rows={3} value={form.description} onChange={update('description')} /></div>
        <ImageInput label="Нүүр зураг" currentUrl={form.cover_image_url} file={file} onChange={setFile} />
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Хадгалж байна…' : 'Хадгалах'}</button>
          {editingId && <button type="button" className="btn btn-ghost" onClick={reset}>Болих</button>}
        </div>
      </form>

      <div className="admin-list">
        {!rows ? <Loading /> : rows.map((r) => (
          <div key={r.id} className={`admin-row ${selected === r.id ? 'selected' : ''}`}>
            {r.cover_image_url && <img src={r.cover_image_url} alt="" />}
            <div className="grow">
              <strong>{r.title}</strong>
              <p className="muted small">{formatDate(r.event_date)}, {r.event_photos.length} зураг</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(selected === r.id ? null : r.id)}>Цомог</button>
            <button className="btn btn-ghost btn-sm" onClick={() => edit(r)}>Засах</button>
            <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('events', r.id, r.title, reload, setError)}>Устгах</button>
          </div>
        ))}

        {selectedEvent && (
          <div className="card form-card album-editor">
            <h3>{selectedEvent.title}: зурагт цомог</h3>
            <div className="field">
              <label>Зураг нэмэх (олныг сонгож болно)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles([...(e.target.files ?? [])])} />
            </div>
            <div className="field"><label>Тайлбар</label><input value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
            <button className="btn btn-primary btn-sm" onClick={uploadPhotos} disabled={saving || photoFiles.length === 0}>
              {saving ? 'Оруулж байна…' : `${photoFiles.length || ''} зураг оруулах`}
            </button>
            <div className="thumb-grid">
              {[...selectedEvent.event_photos].sort((a, b) => a.id - b.id).map((p) => (
                <div key={p.id} className="thumb">
                  <img src={p.image_url} alt={p.caption ?? ''} />
                  <button className="thumb-del" aria-label="Зураг устгах" onClick={() => confirmDelete('event_photos', p.id, 'энэ зураг', reload, setError)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Тэнхимийн түүх ---------- */
const EMPTY_MILESTONE = { year: '', title: '', description: '' }

function HistoryAdmin() {
  const { user } = useAuth()
  const [rows, reload] = useRows('history_milestones', '*', 'year')
  const [form, setForm] = useState(EMPTY_MILESTONE)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError('')
    const year = Number(form.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return setError('Он буруу байна.')
    if (form.title.trim().length < 2) return setError('Гарчиг оруулна уу.')
    setSaving(true)
    try {
      const image_url = file ? await uploadImage(file, user.id) : null
      const { error } = await supabase.from('history_milestones').insert({
        year, title: form.title.trim(), description: form.description.trim() || null, image_url,
      })
      if (error) throw error
      setForm(EMPTY_MILESTONE)
      setFile(null)
      reload()
    } catch (err) {
      setError(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-panel admin-split">
      <form className="card form-card form" onSubmit={save}>
        <h2>Түүхэн үйл явдал нэмэх</h2>
        <ErrorBox message={error} />
        <div className="field"><label>Он *</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
        <div className="field"><label>Гарчиг *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field"><label>Тайлбар</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <ImageInput file={file} onChange={setFile} />
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Хадгалж байна…' : 'Нэмэх'}</button>
      </form>
      <div className="admin-list">
        {!rows ? <Loading /> : rows.map((r) => (
          <div key={r.id} className="admin-row">
            <span className="year-pill">{r.year}</span>
            <div className="grow"><strong>{r.title}</strong></div>
            <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('history_milestones', r.id, r.title, reload, setError)}>Устгах</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Ангилал ---------- */
function CategoriesAdmin() {
  const [rows, reload] = useRows('exhibition_categories', '*', 'name')
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setError('')
    if (form.name.trim().length < 2) return setError('Ангиллын нэрийг оруулна уу.')
    const { error } = await supabase.from('exhibition_categories').insert({
      name: form.name.trim(), description: form.description.trim() || null,
    })
    if (error) return setError(error.code === '23505' ? 'Ийм нэртэй ангилал аль хэдийн байна.' : translateError(error))
    setForm({ name: '', description: '' })
    reload()
  }

  return (
    <div className="admin-panel admin-split">
      <form className="card form-card form" onSubmit={save}>
        <h2>Ангилал нэмэх</h2>
        <ErrorBox message={error} />
        <div className="field"><label>Нэр *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>Тайлбар</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <button className="btn btn-primary">Нэмэх</button>
      </form>
      <div className="admin-list">
        {!rows ? <Loading /> : rows.map((r) => (
          <div key={r.id} className="admin-row">
            <div className="grow"><strong>{r.name}</strong><p className="muted small">{r.description}</p></div>
            <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('exhibition_categories', r.id, r.name, reload, setError)}>Устгах</button>
          </div>
        ))}
      </div>
    </div>
  )
}
