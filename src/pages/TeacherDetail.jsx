import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Avatar, EmptyState, Loading } from '../components/ui'

// "CSC111 Компьютерийн үндэс" → { code: 'CSC111', name: 'Компьютерийн үндэс' }
function parseCourse(text) {
  const match = text.match(/^([A-Z]{2,4}\s?\d{3}[A-Z]?)\s+[-–—]?\s*(.+)$/)
  return match ? { code: match[1], name: match[2] } : { code: '', name: text }
}

// Олон мөрт текстийг жагсаалт болгоно
const lines = (text) => (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean)

const SECTIONS = [
  ['education', 'Боловсрол'],
  ['trainings', 'Мэргэжлийн сургалт'],
  ['publications', 'Эрдэм шинжилгээний бүтээл'],
  ['research', 'Судалгааны төсөлт ажлын тайлан, орчуулга'],
]

export default function TeacherDetail() {
  const { id } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('teachers')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setTeacher(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <Loading />
  if (!teacher) {
    return (
      <div className="container section">
        <EmptyState title="Багш олдсонгүй" action={<Link to="/teachers" className="btn btn-ghost">Багш нар</Link>} />
      </div>
    )
  }

  const info = [
    ['Алба нэгж', teacher.department],
    ['Цол зэрэг', teacher.degree],
    ['И-мэйл', teacher.email && <a href={`mailto:${teacher.email}`} className="link">{teacher.email}</a>],
    ['Өрөөний дугаар', teacher.room],
  ]
  const courses = (teacher.courses ?? []).map(parseCourse)
  const sections = SECTIONS.filter(([key]) => lines(teacher[key]).length > 0)

  return (
    <article className="container section">
      <Link to="/teachers" className="link back">Багш нар</Link>

      <div className="teacher-detail">
        <div className="teacher-detail-photo">
          {teacher.photo_url ? <img src={teacher.photo_url} alt={teacher.name} /> : <Avatar name={teacher.name} size={160} />}
        </div>

        <div>
          <h1>{teacher.name}</h1>
          {teacher.position && <p className="muted teacher-position">{teacher.position}</p>}
          {teacher.bio && <p className="description">{teacher.bio}</p>}

          <dl className="info-table">
            {info.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || <span className="muted">—</span>}</dd>
              </div>
            ))}
          </dl>

          {courses.length > 0 && (
            <>
              <h2 className="sub-heading">Заадаг хичээлүүд</h2>
              <ul className="course-list">
                {courses.map((c) => (
                  <li key={c.code + c.name}>
                    {c.code && <code>{c.code}</code>}
                    <span>{c.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {sections.length > 0 && (
            <>
              <h2 className="sub-heading">Дэлгэрэнгүй</h2>
              <div className="detail-sections">
                {sections.map(([key, label], i) => (
                  <details key={key} open={i === 0}>
                    <summary>{label}</summary>
                    <ul>
                      {lines(teacher[key]).map((line, j) => <li key={j}>{line}</li>)}
                    </ul>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
