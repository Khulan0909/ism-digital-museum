import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const LINKS = [
  ['/exhibits', 'Үзэсгэлэн'],
  ['/teachers', 'Багш нар'],
  ['/events', 'Арга хэмжээ'],
  ['/history', 'Time Machine'],
  ['/gallery', 'Виртуал танхим'],
  ['/creators', 'Бүтээгчид'],
]

export default function Layout() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Хуудас солигдох бүрт дээш гүйлгэж, гар утасны цэсийг хаана
  useEffect(() => {
    window.scrollTo(0, 0)
    setOpen(false)
  }, [pathname])

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="ISM өртөө, нүүр хуудас">
            <Logo />
          </Link>

          <button
            className="nav-toggle"
            aria-label="Цэс"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Хаах' : 'Цэс'}
          </button>

          <nav className={`nav-links ${open ? 'open' : ''}`}>
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
            {isAdmin && <NavLink to="/admin">Админ</NavLink>}

            <span className="nav-divider" />

            {user ? (
              <>
                <NavLink to="/profile" className="nav-user">
                  {profile?.display_name ?? 'Профайл'}
                </NavLink>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Гарах
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Нэвтрэх</NavLink>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Бүртгүүлэх
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <Logo />
          <p>Санхүү, эдийн засгийн их сургууль, Мэдээллийн Системийн Менежментийн тэнхим</p>
        </div>
      </footer>
    </div>
  )
}
