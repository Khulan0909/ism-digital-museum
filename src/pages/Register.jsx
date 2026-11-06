import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { translateError } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { ErrorBox, SuccessBox } from '../components/ui'

export default function Register() {
  const { user } = useAuth()
  const [form, setForm] = useState({ display_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/profile" replace />

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.display_name.trim().length < 2) return setError('Нэрээ оруулна уу (2+ тэмдэгт).')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Имэйл хаяг буруу байна.')
    if (form.password.length < 6) return setError('Нууц үг хамгийн багадаа 6 тэмдэгт байна.')
    if (form.password !== form.confirm) return setError('Нууц үг таарахгүй байна.')

    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // handle_new_user trigger энэ нэрийг profiles хүснэгтэд бичнэ
        data: { display_name: form.display_name.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    setBusy(false)
    if (error) return setError(translateError(error))

    // Имэйл баталгаажуулалт асаалттай бол session ирэхгүй
    if (!data.session) {
      setSuccess('Бүртгэл үүслээ! Имэйл рүү илгээсэн холбоосоор баталгаажуулаад нэвтэрнэ үү.')
    }
  }

  return (
    <section className="container section auth">
      <form className="card form-card form" onSubmit={handleSubmit} noValidate>
        <h1>Бүртгүүлэх</h1>
        <ErrorBox message={error} />
        <SuccessBox message={success} />
        <div className="field">
          <label htmlFor="name">Нэр</label>
          <input id="name" autoComplete="name" value={form.display_name} onChange={update('display_name')} />
        </div>
        <div className="field">
          <label htmlFor="email">Имэйл</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} />
        </div>
        <div className="field">
          <label htmlFor="password">Нууц үг</label>
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} />
        </div>
        <div className="field">
          <label htmlFor="confirm">Нууц үг давтах</label>
          <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Бүртгэж байна…' : 'Бүртгүүлэх'}</button>
        <p className="muted small center">
          Бүртгэлтэй юу? <Link to="/login" className="link">Нэвтрэх</Link>
        </p>
      </form>
    </section>
  )
}
