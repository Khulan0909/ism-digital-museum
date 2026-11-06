import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT, formatDate, translateError } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { Avatar, EmptyState, ErrorBox, Loading } from '../components/ui'

export default function ExhibitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [exhibit, setExhibit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('exhibits').select(EXHIBIT_SELECT).eq('id', id).maybeSingle()
      if (error) setError(error.message)
      setExhibit(data)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleDelete() {
    if (!window.confirm(`"${exhibit.title}" үзмэрийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return
    const { error } = await supabase.from('exhibits').delete().eq('id', id)
    if (error) return setError(translateError(error))
    navigate('/exhibits')
  }

  if (loading) return <Loading />
  if (!exhibit) {
    return (
      <div className="container section">
        <EmptyState
          title="Үзмэр олдсонгүй"
          text="Устгагдсан эсвэл нийтэд нээлттэй биш байж магадгүй."
          action={<Link to="/exhibits" className="btn btn-ghost">Үзэсгэлэн рүү буцах</Link>}
        />
      </div>
    )
  }

  const canEdit = user && (exhibit.creator_id === user.id || isAdmin)

  return (
    <article className="container section detail">
      <Link to="/exhibits" className="link back">Үзэсгэлэн</Link>
      <ErrorBox message={error} />

      <div className="detail-grid">
        <div className="detail-media">
          {exhibit.image_url ? (
            <img src={exhibit.image_url} alt={exhibit.title} />
          ) : (
            <div className="img-placeholder big" />
          )}
        </div>

        <div className="detail-info">
                    <h1>{exhibit.title}</h1>
          {exhibit.status === 'hidden' && (
            <span className="badge badge-warn inline">Нийтэд харагдахгүй</span>
          )}

          <dl className="meta-list">
            <div><dt>Он</dt><dd>{exhibit.year_created ?? '—'}</dd></div>
            <div><dt>Ангилал</dt><dd>{exhibit.category?.name ?? '—'}</dd></div>
            <div><dt>Нэмсэн</dt><dd>{formatDate(exhibit.created_at)}</dd></div>
          </dl>

          {exhibit.creator && (
            <Link to={`/creators/${exhibit.creator.id}`} className="creator-chip">
              <Avatar url={exhibit.creator.avatar_url} name={exhibit.creator.display_name} size={40} />
              <span>
                <small className="muted">Бүтээгч</small>
                <strong>{exhibit.creator.display_name}</strong>
              </span>
            </Link>
          )}

          {exhibit.description && <p className="description">{exhibit.description}</p>}

          {exhibit.technology_stack?.length > 0 && (
            <>
              <h3 className="small-heading">Хэрэглэсэн технологи</h3>
              <div className="tags">
                {exhibit.technology_stack.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            </>
          )}

          <div className="actions">
            {exhibit.demo_url && (
              <a href={exhibit.demo_url} target="_blank" rel="noreferrer" className="btn btn-primary">Demo нээх</a>
            )}
            {exhibit.github_url && (
              <a href={exhibit.github_url} target="_blank" rel="noreferrer" className="btn btn-ghost">GitHub</a>
            )}
          </div>

          {canEdit && (
            <div className="actions owner-actions">
              <Link to={`/exhibits/${exhibit.id}/edit`} className="btn btn-ghost">Засах</Link>
              <button onClick={handleDelete} className="btn btn-danger">Устгах</button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
