import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Avatar, EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'

export default function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('teachers')
      .select('id, name, position, degree, photo_url, courses')
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setTeachers(data ?? [])
        setLoading(false)
      })
  }, [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return teachers
    return teachers.filter((t) =>
      [t.name, t.position, ...(t.courses ?? [])].join(' ').toLowerCase().includes(s)
    )
  }, [teachers, q])

  return (
    <>
      <PageHeader title="Багш нар" />
      <section className="container section">
        <div className="filters single">
          <input
            type="search"
            placeholder="Нэр эсвэл хичээлээр хайх"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Багш хайх"
          />
        </div>
        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : results.length === 0 ? (
          <EmptyState title="Багш олдсонгүй" text="Өөр үгээр хайж үзнэ үү." />
        ) : (
          <div className="grid grid-4">
            {results.map((t) => (
              <Link key={t.id} to={`/teachers/${t.id}`} className="teacher-tile">
                <div className="teacher-tile-photo">
                  {t.photo_url ? <img src={t.photo_url} alt="" loading="lazy" /> : <Avatar name={t.name} size={88} />}
                </div>
                <h3>{t.name}</h3>
                <p>{t.position}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
