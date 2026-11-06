import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'

// Музейн ханан дээрх шошго шиг: нэр, бүтээгч, он, хэрэглэсэн материал (технологи)
export default function ExhibitCard({ exhibit }) {
  const tech = exhibit.technology_stack ?? []
  const meta = [exhibit.year_created, exhibit.category?.name].filter(Boolean).join(', ')

  return (
    <Link to={`/exhibits/${exhibit.id}`} className="exhibit-card">
      <div className="frame">
        {exhibit.image_url ? (
          <img src={exhibit.image_url} alt={exhibit.title} loading="lazy" />
        ) : (
          <div className="img-placeholder"><LogoMark size={40} /></div>
        )}
        {exhibit.status === 'hidden' && <span className="badge">Нуусан</span>}
      </div>
      <div className="label">
        <h3>{exhibit.title}</h3>
        {exhibit.creator && <p className="label-creator">{exhibit.creator.display_name}</p>}
        {meta && <p className="label-meta">{meta}</p>}
        {tech.length > 0 && <p className="label-medium">{tech.join(', ')}</p>}
      </div>
    </Link>
  )
}
