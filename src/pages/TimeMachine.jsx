import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/helpers'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'

// Бүтээлч шийдэл: ISM Time Machine
// Түүхэн үйл явдал, арга хэмжээ, бүтээлүүдийг нэг timeline болгож он оноор нь бүлэглэнэ.
const TYPES = {
  history: { label: 'Түүх' },
  event: { label: 'Арга хэмжээ' },
  exhibit: { label: 'Бүтээл' },
}

export default function TimeMachine() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTypes, setActiveTypes] = useState(Object.keys(TYPES))
  const [selectedYear, setSelectedYear] = useState(null)

  useEffect(() => {
    async function load() {
      const [h, e, x] = await Promise.all([
        supabase.from('history_milestones').select('*'),
        supabase.from('events').select('*'),
        supabase.from('exhibits').select('id, title, description, image_url, year_created, technology_stack').eq('status', 'published'),
      ])
      const err = [h, e, x].find((r) => r.error)?.error
      if (err) setError(err.message)

      // Гурван өөр хүснэгтийг нэг ижил бүтэцтэй болгоно
      const merged = [
        ...(h.data ?? []).map((r) => ({
          key: `h${r.id}`, type: 'history', year: r.year, title: r.title,
          text: r.description, image: r.image_url, link: null,
        })),
        ...(e.data ?? []).map((r) => ({
          key: `e${r.id}`, type: 'event', year: Number(r.event_date.slice(0, 4)), title: r.title,
          text: formatDate(r.event_date), image: r.cover_image_url, link: `/events/${r.id}`,
        })),
        ...(x.data ?? []).filter((r) => r.year_created).map((r) => ({
          key: `x${r.id}`, type: 'exhibit', year: r.year_created, title: r.title,
          text: r.description, image: r.image_url, link: `/exhibits/${r.id}`, tech: r.technology_stack ?? [],
        })),
      ]
      setItems(merged)
      setLoading(false)
    }
    load()
  }, [])

  const visible = items.filter((i) => activeTypes.includes(i.type))

  // { 2024: [...], 2025: [...] } хэлбэрээр бүлэглэх
  const byYear = useMemo(() => {
    const groups = {}
    for (const item of visible) (groups[item.year] ??= []).push(item)
    return Object.entries(groups)
      .map(([year, list]) => ({
        year: Number(year),
        list,
        // Technology Evolution: тухайн онд ашиглагдсан технологиуд
        tech: [...new Set(list.flatMap((i) => i.tech ?? []))],
      }))
      .sort((a, b) => a.year - b.year)
  }, [visible])

  const years = byYear.map((g) => g.year)

  function toggleType(type) {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  function jumpTo(year) {
    setSelectedYear(year)
    document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <PageHeader
        title="Time Machine"
        text="Тэнхимийн түүх, арга хэмжээ, бүтээлүүд оны дарааллаар."
      />

      <section className="container section">
        <div className="tm-controls">
          <div className="chips" role="group" aria-label="Төрлөөр шүүх">
            {Object.entries(TYPES).map(([type, { label }]) => (
              <button
                key={type}
                className={`chip ${activeTypes.includes(type) ? 'active' : ''}`}
                onClick={() => toggleType(type)}
                aria-pressed={activeTypes.includes(type)}
              >
                <i className={`dot tl-${type}`} /> {label}
              </button>
            ))}
          </div>

          {years.length > 0 && (
            <div className="year-rail" role="navigation" aria-label="Он руу үсрэх">
              {years.map((y) => (
                <button key={y} className={`year-dot ${selectedYear === y ? 'active' : ''}`} onClick={() => jumpTo(y)}>
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : byYear.length === 0 ? (
          <EmptyState title="Харуулах зүйл алга" text="Дээрээс дор хаяж нэг төрөл сонгоно уу." />
        ) : (
          <ol className="timeline">
            {byYear.map((group) => (
              <li key={group.year} id={`year-${group.year}`} className="tl-year">
                <div className="tl-year-label">
                  <span>{group.year}</span>
                </div>
                <div className="tl-year-body">
                  {group.tech.length > 0 && (
                    <div className="tl-tech">
                      <small className="muted">Технологи:</small>
                      {group.tech.map((t) => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                  <div className="tl-items">
                    {group.list.map((item) => {
                      const content = (
                        <>
                          {item.image && <img src={item.image} alt="" loading="lazy" />}
                          <div className="tl-text">
                            <span className={`tl-type tl-${item.type}`}>
                              <i className={`dot tl-${item.type}`} /> {TYPES[item.type].label}
                            </span>
                            <h3>{item.title}</h3>
                            {item.text && <p className="muted small clamp">{item.text}</p>}
                          </div>
                        </>
                      )
                      return item.link ? (
                        <Link key={item.key} to={item.link} className="tl-card">{content}</Link>
                      ) : (
                        <div key={item.key} className="tl-card">{content}</div>
                      )
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
