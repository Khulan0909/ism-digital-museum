import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { translateError } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { ErrorBox } from '../components/ui'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const redirectTo = location.state?.from ?? '/'
  if (user) return <Navigate to={redirectTo} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('Имэйл болон нууц үгээ оруулна уу.')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(translateError(error))
    navigate(redirectTo, { replace: true })
  }

  return (
    <section className="container section auth">
      <form className="card form-card form" onSubmit={handleSubmit} noValidate>
        <h1>Нэвтрэх</h1>
        <ErrorBox message={error} />
        <div className="field">
          <label htmlFor="email">Имэйл</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Нууц үг</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}</button>
        <p className="muted small center">
          Бүртгэлгүй юу? <Link to="/register" className="link">Бүртгүүлэх</Link>
        </p>
      </form>
    </section>
  )
}
