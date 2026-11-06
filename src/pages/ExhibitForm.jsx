import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isValidUrl, splitList, translateError, uploadImage } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { ErrorBox, ImageInput, Loading } from '../components/ui'

const EMPTY = {
  title: '',
  description: '',
  category_id: '',
  technology_stack: '',
  year_created: String(new Date().getFullYear()),
  demo_url: '',
  github_url: '',
  image_url: '',
  status: 'published',
}

function validate(form) {
  const errors = {}
  if (form.title.trim().length < 2) errors.title = 'Гарчиг хамгийн багадаа 2 тэмдэгт байна.'
  if (form.title.length > 150) errors.title = 'Гарчиг 150 тэмдэгтээс хэтрэхгүй.'
  const year = Number(form.year_created)
  if (form.year_created && (!Number.isInteger(year) || year < 1990 || year > 2100))
    errors.year_created = 'Он 1990–2100 хооронд байна.'
  if (form.demo_url && !isValidUrl(form.demo_url)) errors.demo_url = 'https:// -ээр эхэлсэн зөв холбоос оруулна уу.'
  if (form.github_url && !isValidUrl(form.github_url)) errors.github_url = 'https:// -ээр эхэлсэн зөв холбоос оруулна уу.'
  return errors
}

export default function ExhibitForm() {
  const { id } = useParams() // байвал засах, байхгүй бол шинээр нэмэх
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    supabase.from('exhibition_categories').select('*').order('name').then(({ data }) => setCategories(data ?? []))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const { data, error } = await supabase.from('exhibits').select('*').eq('id', id).maybeSingle()
      if (error || !data) {
        setError('Үзмэр олдсонгүй.')
      } else if (data.creator_id !== user.id && !isAdmin) {
        setForbidden(true)
      } else {
        setForm({
          ...EMPTY,
          ...data,
          category_id: data.category_id ? String(data.category_id) : '',
          technology_stack: (data.technology_stack ?? []).join(', '),
          year_created: data.year_created ? String(data.year_created) : '',
          description: data.description ?? '',
          demo_url: data.demo_url ?? '',
          github_url: data.github_url ?? '',
          image_url: data.image_url ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [id, isEdit, user.id, isAdmin])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return

    setSaving(true)
    try {
      let imageUrl = form.image_url || null
      if (file) imageUrl = await uploadImage(file, user.id)

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        technology_stack: splitList(form.technology_stack),
        year_created: form.year_created ? Number(form.year_created) : null,
        demo_url: form.demo_url.trim() || null,
        github_url: form.github_url.trim() || null,
        image_url: imageUrl,
      }
      if (isAdmin) payload.status = form.status

      const query = isEdit
        ? supabase.from('exhibits').update(payload).eq('id', id)
        : supabase.from('exhibits').insert({ ...payload, creator_id: user.id })

      const { data, error } = await query.select().single()
      if (error) throw error
      navigate(`/exhibits/${data.id}`)
    } catch (err) {
      setError(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (forbidden) {
    return (
      <div className="container section narrow">
        <ErrorBox message="Та зөвхөн өөрийн нэмсэн бүтээлийг засах эрхтэй." />
        <Link to="/exhibits" className="link">Үзэсгэлэн рүү буцах</Link>
      </div>
    )
  }

  return (
    <section className="container section narrow">
      <h1>{isEdit ? 'Бүтээл засах' : 'Шинэ бүтээл нэмэх'}</h1>
      <p className="muted">* тэмдэгтэй талбарыг заавал бөглөнө.</p>
      <ErrorBox message={error} />

      <form className="form card form-card" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="title">Гарчиг *</label>
          <input id="title" value={form.title} onChange={update('title')} maxLength={150} />
          {errors.title && <small className="field-error">{errors.title}</small>}
        </div>

        <div className="field">
          <label htmlFor="description">Тайлбар</label>
          <textarea id="description" rows={5} value={form.description} onChange={update('description')} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="category">Ангилал</label>
            <select id="category" value={form.category_id} onChange={update('category_id')}>
              <option value="">— Сонгох —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="year">Бүтээсэн он</label>
            <input id="year" type="number" min="1990" max="2100" value={form.year_created} onChange={update('year_created')} />
            {errors.year_created && <small className="field-error">{errors.year_created}</small>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="tech">Технологи</label>
          <input id="tech" placeholder="React, Supabase, Figma" value={form.technology_stack} onChange={update('technology_stack')} />
          <small className="muted">Таслалаар тусгаарлана.</small>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="demo">Demo холбоос</label>
            <input id="demo" type="url" placeholder="https://" value={form.demo_url} onChange={update('demo_url')} />
            {errors.demo_url && <small className="field-error">{errors.demo_url}</small>}
          </div>
          <div className="field">
            <label htmlFor="github">GitHub холбоос</label>
            <input id="github" type="url" placeholder="https://github.com/" value={form.github_url} onChange={update('github_url')} />
            {errors.github_url && <small className="field-error">{errors.github_url}</small>}
          </div>
        </div>

        <ImageInput currentUrl={form.image_url} file={file} onChange={setFile} hint="JPG, PNG эсвэл WEBP, 5MB хүртэл" />

        {isAdmin && (
          <div className="field">
            <label htmlFor="status">Төлөв (админ)</label>
            <select id="status" value={form.status} onChange={update('status')}>
              <option value="published">Нийтлэгдсэн</option>
              <option value="hidden">Нуусан</option>
            </select>
          </div>
        )}

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Хадгалж байна…' : isEdit ? 'Өөрчлөлт хадгалах' : 'Нэмэх'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Болих</button>
        </div>
      </form>
    </section>
  )
}
