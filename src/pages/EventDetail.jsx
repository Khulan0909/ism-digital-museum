import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/helpers'
import { EmptyState, Loading } from '../components/ui'

function Lightbox({ photos, index, onClose, onMove }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onMove(1)
      if (e.key === 'ArrowLeft') onMove(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onMove])

  const photo = photos[index]
  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="lb-btn lb-close" onClick={onClose} aria-label="Хаах">✕</button>
      <button className="lb-btn lb-prev" onClick={(e) => { e.stopPropagation(); onMove(-1) }} aria-label="Өмнөх">‹</button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.image_url} alt={photo.caption ?? ''} />
        <figcaption>{photo.caption && <span>{photo.caption}</span>}<span>{index + 1}/{photos.length}</span></figcaption>
      </figure>
      <button className="lb-btn lb-next" onClick={(e) => { e.stopPropagation(); onMove(1) }} aria-label="Дараах">›</button>
    </div>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('*, event_photos(*)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setEvent(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <Loading />
  if (!event) {
    return (
      <div className="container section">
        <EmptyState title="Арга хэмжээ олдсонгүй" action={<Link to="/events" className="btn btn-ghost">Буцах</Link>} />
      </div>
    )
  }

  const photos = [...(event.event_photos ?? [])].sort((a, b) => a.id - b.id)
  const move = (step) => setActive((i) => (i + step + photos.length) % photos.length)

  return (
    <article className="container section">
      <Link to="/events" className="link back">Арга хэмжээ</Link>
      <div className="event-hero">
        {event.cover_image_url && <img src={event.cover_image_url} alt={event.title} />}
        <div className="event-hero-text">
          <time>{formatDate(event.event_date)}</time>
          <h1>{event.title}</h1>
        </div>
      </div>
      {event.description && <p className="description narrow-text">{event.description}</p>}

      <h2 className="section-title">Зурагт цомог ({photos.length})</h2>
      {photos.length === 0 ? (
        <EmptyState title="Зураг оруулаагүй байна" />
      ) : (
        <div className="gallery">
          {photos.map((p, i) => (
            <button key={p.id} className="gallery-item" onClick={() => setActive(i)} aria-label={`Зураг ${i + 1} томруулах`}>
              <img src={p.image_url} alt={p.caption ?? ''} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {active !== null && (
        <Lightbox photos={photos} index={active} onClose={() => setActive(null)} onMove={move} />
      )}
    </article>
  )
}
