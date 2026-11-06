import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import ExhibitCard from '../components/ExhibitCard'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'

const INITIAL_FILTERS = { q: '', category: '', year: '', tech: '', sort: 'newest' }

export default function Exhibits() {
  const { user } = useAuth()
  const [exhibits, setExhibits] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [exRes, catRes] = await Promise.all([
        supabase.from('exhibits').select(EXHIBIT_SELECT).eq('status', 'published'),
        supabase.from('exhibition_categories').select('*').order('name'),
      ])
      if (exRes.error) setError(exRes.error.message)
      setExhibits(exRes.data ?? [])
      setCategories(catRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Шүүлтүүрийн сонголтуудыг өгөгдлөөс гаргана
  const years = useMemo(
    () => [...new Set(exhibits.map((e) => e.year_created).filter(Boolean))].sort((a, b) => b - a),
    [exhibits]
  )
  const techs = useMemo(
    () => [...new Set(exhibits.flatMap((e) => e.technology_stack ?? []))].sort(),
    [exhibits]
  )

  const results = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const list = exhibits.filter((e) => {
      const haystack = [e.title, e.description, e.creator?.display_name, ...(e.technology_stack ?? [])]
        .join(' ')
        .toLowerCase()
      return (
        (!q || haystack.includes(q)) &&
        (!filters.category || String(e.category_id) === filters.category) &&
        (!filters.year || String(e.year_created) === filters.year) &&
        (!filters.tech || (e.technology_stack ?? []).includes(filters.tech))
      )
    })
    const sorters = {
      newest: (a, b) => (b.year_created ?? 0) - (a.year_created ?? 0),
      oldest: (a, b) => (a.year_created ?? 0) - (b.year_created ?? 0),
      title: (a, b) => a.title.localeCompare(b.title),
    }
    return [...list].sort(sorters[filters.sort])
  }, [exhibits, filters])

  const update = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS)

  return (
    <>
      <PageHeader title="Үзэсгэлэн" text="Оюутнуудын төсөл, судалгааны ажлууд.">
        {user && (
          <Link to="/exhibits/new" className="btn btn-primary">Бүтээл нэмэх</Link>
        )}
      </PageHeader>

      <section className="container section">
        <div className="filters">
          <input
            type="search"
            placeholder="Нэр, технологи, бүтээгчээр хайх"
            value={filters.q}
            onChange={update('q')}
            aria-label="Хайх"
          />
          <select value={filters.category} onChange={update('category')} aria-label="Ангилал">
            <option value="">Бүх ангилал</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.year} onChange={update('year')} aria-label="Он">
            <option value="">Бүх он</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.tech} onChange={update('tech')} aria-label="Технологи">
            <option value="">Бүх технологи</option>
            {techs.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.sort} onChange={update('sort')} aria-label="Эрэмбэлэх">
            <option value="newest">Шинэ нь эхэндээ</option>
            <option value="oldest">Хуучин нь эхэндээ</option>
            <option value="title">Нэрээр (А–Я)</option>
          </select>
        </div>

        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : results.length === 0 ? (
          <EmptyState
            title="Хайлтад тохирох үзмэр олдсонгүй"
            text="Өөр үгээр хайх эсвэл шүүлтүүрээ цэвэрлэнэ үү."
            action={
              hasFilters && (
                <button className="btn btn-ghost" onClick={() => setFilters(INITIAL_FILTERS)}>
                  Шүүлтүүр цэвэрлэх
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="muted small result-count">{results.length} үзмэр</p>
            <div className="grid grid-3">
              {results.map((e) => <ExhibitCard key={e.id} exhibit={e} />)}
            </div>
          </>
        )}
      </section>
    </>
  )
}
