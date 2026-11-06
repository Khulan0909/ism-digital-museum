import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT, formatDate } from '../lib/helpers'
import SqueezeCarousel from '../components/SqueezeCarousel'
import TunnelHero from '../components/TunnelHero'
import { exhibitsToSlides } from '../lib/exhibitSlides'
import { ErrorBox, Loading } from '../components/ui'

const TUNNEL_SIZE = 9

export default function Home() {
  const [latest, setLatest] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [ex, ev] = await Promise.all([
        supabase.from('exhibits').select(EXHIBIT_SELECT).eq('status', 'published')
          .order('created_at', { ascending: false }).limit(12),
        supabase.from('events').select('*').order('event_date', { ascending: false }).limit(6),
      ])
      if (ex.error || ev.error) setError((ex.error ?? ev.error).message)
      setLatest(ex.data ?? [])
      setEvents(ev.data ?? [])
    }
    load()
  }, [])

  // Хонгилд нисэх зургууд: үзмэрүүд + арга хэмжээний нүүр зураг (9 хүрэхгүй бол давтана)
  const tunnelItems = useMemo(() => {
    const pool = [
      ...(latest ?? []).filter((e) => e.image_url)
        .map((e) => ({ src: e.image_url, title: e.title, to: `/exhibits/${e.id}` })),
      ...events.filter((e) => e.cover_image_url)
        .map((e) => ({ src: e.cover_image_url, title: e.title, to: `/events/${e.id}` })),
    ]
    if (pool.length === 0) return []
    return Array.from({ length: TUNNEL_SIZE }, (_, i) => pool[i % pool.length])
  }, [latest, events])

  return (
    <>
      <TunnelHero items={tunnelItems}>
        <h1>ISM өртөө</h1>
        <p>Мэдээллийн Системийн Менежментийн тэнхимийн түүх, багш нар, оюутнуудын бүтээл.</p>
      </TunnelHero>

      <div className="container">
        <ErrorBox message={error} />
      </div>

      <section className="section container">
        <div className="section-head">
          <h2>Шинэ бүтээлүүд</h2>
          <Link to="/exhibits" className="link">Бүх үзмэр</Link>
        </div>
        {latest === null ? (
          <Loading />
        ) : (
          <SqueezeCarousel slides={exhibitsToSlides(latest.slice(0, 7))} />
        )}
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Арга хэмжээ</h2>
          <Link to="/events" className="link">Бүх арга хэмжээ</Link>
        </div>
        <ul className="event-list">
          {events.slice(0, 4).map((ev) => (
            <li key={ev.id}>
              <Link to={`/events/${ev.id}`}>
                <time>{formatDate(ev.event_date)}</time>
                <span>{ev.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
