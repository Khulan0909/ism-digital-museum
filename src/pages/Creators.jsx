import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Avatar, EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'

export default function Creators() {
  const [creators, setCreators] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // profiles → exhibits (creator_id FK)-ээр бүтээлийн тоог хамт авна
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio, exhibits(count)')
      .order('display_name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setCreators(
          (data ?? []).map((p) => ({ ...p, count: p.exhibits?.[0]?.count ?? 0 }))
        )
        setLoading(false)
      })
  }, [])

  const results = creators.filter(
    (c) => c.count > 0 && c.display_name.toLowerCase().includes(q.trim().toLowerCase())
  )

  return (
    <>
      <PageHeader title="Бүтээгчид" text="Музейд бүтээлээ нийтэлсэн оюутнууд." />
      <section className="container section">
        <div className="filters single">
          <input type="search" placeholder="Нэрээр хайх" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Бүтээгч хайх" />
        </div>
        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : results.length === 0 ? (
          <EmptyState
            title="Бүтээгч олдсонгүй"
            text="Бүтээл нэмсэн хэрэглэгчид энд харагдана."
            action={<Link to="/exhibits/new" className="btn btn-primary">Бүтээл нэмэх</Link>}
          />
        ) : (
          <div className="grid grid-3">
            {results.map((c) => (
              <Link key={c.id} to={`/creators/${c.id}`} className="card creator-card">
                <Avatar url={c.avatar_url} name={c.display_name} size={64} />
                <div>
                  <h3>{c.display_name}</h3>
                  <p className="card-meta">{c.count} бүтээл</p>
                  {c.bio && <p className="muted small clamp">{c.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
