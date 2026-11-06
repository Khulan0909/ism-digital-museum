import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorBox, Loading } from './ui'

// Нэвтрээгүй хэрэглэгчийг /login руу, админ биш хэрэглэгчийг хориглох.
// Анхаар: жинхэнэ хамгаалалтыг Supabase RLS хийдэг, энэ нь зөвхөн UI-ийн хамгаалалт.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading || (user && adminOnly && !profile)) return <Loading />

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  if (adminOnly && !isAdmin) {
    return (
      <div className="container section">
        <ErrorBox message="Энэ хуудсанд зөвхөн администратор нэвтрэх эрхтэй." />
      </div>
    )
  }

  return children
}
