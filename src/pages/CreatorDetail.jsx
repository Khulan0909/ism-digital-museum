import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT, formatDate } from '../lib/helpers'
import ExhibitCard from '../components/ExhibitCard'
import { Avatar, EmptyState, Loading } from '../components/ui'

export default function CreatorDetail() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [exhibits, setExhibits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, x] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('exhibits').select(EXHIBIT_SELECT).eq('creator_id', id).eq('status', 'published')
          .order('year_created', { ascending: false }),
      ])
      setProfile(p.data)
      setExhibits(x.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <Loading />
  if (!profile) {
    return (
      <div className="container section">
        <EmptyState title="Бүтээгч олдсонгүй" action={<Link to="/creators" className="btn btn-ghost">Буцах</Link>} />
      </div>
    )
  }

  return (
    <section className="container section">
      <Link to="/creators" className="link back">Бүтээгчид</Link>
      <div className="profile-head">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={96} />
        <div>
          <h1>{profile.display_name}</h1>
          <p className="muted small">{exhibits.length} бүтээл, {formatDate(profile.created_at)}-нд нэгдсэн</p>
          {profile.bio && <p>{profile.bio}</p>}
        </div>
      </div>

      <h2 className="section-title">Бүтээлүүд</h2>
      {exhibits.length === 0 ? (
        <EmptyState title="Нийтлэгдсэн бүтээл алга" />
      ) : (
        <div className="grid grid-3">
          {exhibits.map((e) => <ExhibitCard key={e.id} exhibit={e} />)}
        </div>
      )}
    </section>
  )
}
