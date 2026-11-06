import { useEffect, useState } from 'react'

export function Loading({ text = 'Ачаалж байна…' }) {
  return (
    <div className="state">
      <div className="spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  )
}

export function SuccessBox({ message }) {
  if (!message) return null
  return (
    <div className="alert alert-success" role="status">
      {message}
    </div>
  )
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="state empty">
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ title, text, children }) {
  return (
    <section className="page-header">
      <div className="container page-header-inner">
        <div>
          <h1>{title}</h1>
          {text && <p className="lead">{text}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

export function Avatar({ url, name = '', size = 48 }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return url ? (
    <img className="avatar" src={url} alt={name} style={{ width: size, height: size }} />
  ) : (
    <span className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size / 2.6 }}>
      {initials || '?'}
    </span>
  )
}

// Зураг сонгох талбар + урьдчилан харах
export function ImageInput({ label = 'Зураг', currentUrl, file, onChange, hint }) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview || currentUrl
  return (
    <div className="field">
      <label>{label}</label>
      {shown && <img className="img-preview" src={shown} alt="Урьдчилан харах" />}
      <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}
