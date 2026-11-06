import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/helpers'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'

export default function Events() {
  const [events, setEvents] = useState([])
  const [q, setQ] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('events')
      .select('*, event_photos(count)')
      .order('event_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [])

  const years = useMemo(
    () => [...new Set(events.map((e) => e.event_date.slice(0, 4)))],
    [events]
  )

  const results = events.filter((e) => {
    const s = q.trim().toLowerCase()
    return (
      (!s || `${e.title} ${e.description ?? ''}`.toLowerCase().includes(s)) &&
      (!year || e.event_date.startsWith(year))
    )
  })

  return (
    <>
      <PageHeader title="Арга хэмжээ" text="Өдөрлөг, семинар, тэмцээн." />
      <section className="container section">
        <div className="filters">
          <input type="search" placeholder="Арга хэмжээ хайх" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Арга хэмжээ хайх" />
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Он">
            <option value="">Бүх он</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : results.length === 0 ? (
          <EmptyState title="Арга хэмжээ олдсонгүй" text="Хайлтаа өөрчилж үзнэ үү." />
        ) : (
          <div className="grid grid-3">
            {results.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="card event-card">
                <div className="card-img">
                  {ev.cover_image_url ? <img src={ev.cover_image_url} alt={ev.title} loading="lazy" /> : <div className="img-placeholder" />}
                  <span className="badge">{ev.event_photos?.[0]?.count ?? 0} зураг</span>
                </div>
                <div className="card-body">
                  <p className="card-meta">{formatDate(ev.event_date)}</p>
                  <h3>{ev.title}</h3>
                  {ev.description && <p className="muted small clamp">{ev.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
