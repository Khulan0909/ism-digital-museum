import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT, translateError, uploadImage } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import ExhibitCard from '../components/ExhibitCard'
import { EmptyState, ErrorBox, ImageInput, Loading, SuccessBox } from '../components/ui'

export default function Profile() {
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const [form, setForm] = useState({ display_name: '', bio: '' })
  const [file, setFile] = useState(null)
  const [exhibits, setExhibits] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm({ display_name: profile.display_name ?? '', bio: profile.bio ?? '' })
  }, [profile])

  useEffect(() => {
    supabase
      .from('exhibits')
      .select(EXHIBIT_SELECT)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setExhibits(data ?? []))
  }, [user.id])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.display_name.trim().length < 2) return setError('Нэр хамгийн багадаа 2 тэмдэгт байна.')
    setSaving(true)
    try {
      const updates = { display_name: form.display_name.trim(), bio: form.bio.trim() || null }
      if (file) updates.avatar_url = await uploadImage(file, user.id)
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      setFile(null)
      setSuccess('Профайл хадгалагдлаа.')
    } catch (err) {
      setError(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <Loading />

  return (
    <section className="container section">
      <div className="profile-layout">
        <form className="card form-card form" onSubmit={handleSave}>
          <h1>Миний профайл</h1>
          <p className="muted small">
            {user.email}{isAdmin && ', администратор'}
          </p>
          <ErrorBox message={error} />
          <SuccessBox message={success} />
          <ImageInput label="Профайл зураг" currentUrl={profile.avatar_url} file={file} onChange={setFile} />
          <div className="field">
            <label htmlFor="dn">Нэр</label>
            <input id="dn" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="bio">Товч танилцуулга</label>
            <textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Хадгалж байна…' : 'Хадгалах'}</button>
          <Link to={`/creators/${user.id}`} className="link small">Нийтэд харагдах профайл</Link>
        </form>

        <div>
          <div className="section-head">
            <h2>Миний бүтээлүүд</h2>
            <Link to="/exhibits/new" className="btn btn-primary btn-sm">Бүтээл нэмэх</Link>
          </div>
          {exhibits === null ? (
            <Loading />
          ) : exhibits.length === 0 ? (
            <EmptyState title="Одоогоор бүтээл алга" />
          ) : (
            <div className="grid grid-2">
              {exhibits.map((e) => <ExhibitCard key={e.id} exhibit={e} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
