import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { EXHIBIT_SELECT, translateError } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import { EmptyState, ErrorBox, Loading } from '../components/ui'

/*
 * Бүтээлч шийдэл: Virtual Exhibition (виртуал үзэсгэлэнгийн танхим)
 *
 * - CSS 3D коридор: хана, шал, тааз, жааз бүрийг rotateX/rotateY/translate3d-ээр
 *   3D орон зайд байрлуулна. Камер хөдлөхөд бүх "ертөнц"-ийг эсрэг тийш нь шилжүүлнэ.
 * - Үзмэрүүдийг АНГИЛЛААР нь тусдаа танхимд (өнгөт хана + өлгөөтэй самбар) хуваана.
 * - Minimap: дээрээс харсан зураг, үзэгчийн байрлал ба чиглэл бодит хугацаанд.
 * - Хөтөчтэй аялал: бүтээл бүр рүү автоматаар очиж шошгыг нээнэ.
 * - "Таалагдлаа": exhibit_likes хүснэгтэд хадгална (RLS — зөвхөн өөрийнхийг).
 *
 * Удирдлага: дугуй, ↑↓ / W S — алхах · чирэх, ← → / A D — эргэх
 */

const W = 900 // коридорын өргөн
const H = 560 // өндөр
const EYE = 800 // perspective (нүдний зай)
const NEAR = EYE - 150 // коридор үзэгчийн өмнөхөн эхэлнэ
const START = 700 // эхний жааз
const SPACING = 430 // жааз хоорондын зай
const ROOM_GAP = 320 // танхим хоорондын нэмэлт зай
const AHEAD = 180 // жааз руу очихдоо хэр өмнө нь зогсох
const TOUR_MS = 5500 // хөтөчтэй аялалд жааз бүр дээр зогсох хугацаа
const TINTS = ['#efe9e1', '#e5eae2', '#ece6ee', '#f0e5dd', '#e8e7df', '#ebe4d6']
const MAP_H = 220 // minimap-ийн өндөр

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function springStep(s, target, k, d, dt) {
  s.v += (k * (target - s.x) - d * s.v) * dt
  s.x += s.v * dt
}

// Үзмэрүүдийг ангиллаар бүлэглэж, жааз бүрийн z байрлалыг тооцно
function buildLayout(exhibits) {
  const groups = new Map()
  for (const ex of exhibits) {
    const key = ex.category?.name ?? 'Бусад'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(ex)
  }
  const rooms = []
  const items = []
  let z = START
  ;[...groups.entries()].forEach(([name, list], r) => {
    const room = { name, start: z - 300, tint: TINTS[r % TINTS.length], count: list.length }
    list.forEach((ex, k) => {
      items.push({ ex, z, left: k % 2 === 0, room: r })
      z += SPACING
    })
    room.end = z - SPACING + 260
    rooms.push(room)
    z += ROOM_GAP
  })
  return { rooms, items, length: z + 500 }
}

export default function Gallery() {
  const { user } = useAuth()
  const [exhibits, setExhibits] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [nearest, setNearest] = useState(0)
  const [touring, setTouring] = useState(false)
  const [likes, setLikes] = useState(null) // { counts: {id: n}, mine: Set } | null (хүснэгт байхгүй)

  const stageRef = useRef(null)
  const worldRef = useRef(null)
  const frameRefs = useRef([])
  const dotRef = useRef(null)
  const target = useRef({ z: 0, yaw: 0 })
  const touringRef = useRef(false)
  touringRef.current = touring

  useEffect(() => {
    supabase
      .from('exhibits')
      .select(EXHIBIT_SELECT)
      .eq('status', 'published')
      .order('year_created', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setExhibits(data ?? [])
      })
  }, [])

  // Лайкууд (exhibit_likes хүснэгт үүсээгүй бол энэ боломж нуугдана)
  useEffect(() => {
    supabase
      .from('exhibit_likes')
      .select('exhibit_id, user_id')
      .then(({ data, error }) => {
        if (error) return setLikes(null)
        const counts = {}
        const mine = new Set()
        for (const row of data) {
          counts[row.exhibit_id] = (counts[row.exhibit_id] ?? 0) + 1
          if (row.user_id === user?.id) mine.add(row.exhibit_id)
        }
        setLikes({ counts, mine })
      })
  }, [user?.id])

  const layout = useMemo(() => buildLayout(exhibits ?? []), [exhibits])
  const { rooms, items, length } = layout
  const count = items.length
  const maxZ = Math.max(0, length - 1000)

  // Тухайн жааз руу очиж, түүн рүү эргэж харах
  function goTo(i) {
    const idx = clamp(i, 0, count - 1)
    const item = items[idx]
    target.current.z = clamp(item.z - AHEAD, 0, maxZ)
    // Нүднээс жааз хүртэлх өнцөг: atan(хананы зай / гүн)
    const angle = (Math.atan(W / 2 / (AHEAD + EYE)) * 180) / Math.PI
    target.current.yaw = item.left ? -angle : angle
    setNearest(idx)
  }

  // Хөдөлгөөн ба удирдлага
  useEffect(() => {
    if (!count) return
    const stage = stageRef.current
    const cam = { z: { x: 0, v: 0 }, yaw: { x: 0, v: 0 } }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Хэрэглэгч өөрөө хөдөлбөл хөтөчтэй аялал зогсоно
    const stopTour = () => touringRef.current && setTouring(false)
    const walk = (dz) => { stopTour(); target.current.z = clamp(target.current.z + dz, 0, maxZ) }
    const turn = (dy) => { stopTour(); target.current.yaw = clamp(target.current.yaw + dy, -70, 70) }

    function onWheel(e) {
      const atEdge = (e.deltaY > 0 && target.current.z >= maxZ) || (e.deltaY < 0 && target.current.z <= 0)
      if (atEdge) return
      e.preventDefault()
      walk(e.deltaY * 1.2)
    }
    function onKey(e) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      const k = e.key.toLowerCase()
      const moves = { arrowup: [160, 0], w: [160, 0], arrowdown: [-160, 0], s: [-160, 0], arrowleft: [0, -10], a: [0, -10], arrowright: [0, 10], d: [0, 10] }
      if (!moves[k]) return
      e.preventDefault()
      walk(moves[k][0])
      turn(moves[k][1])
    }

    // Чирэх: хэвтээ — эргэх, босоо — алхах
    let drag = null
    function onDown(e) { drag = { x: e.clientX, y: e.clientY, moved: 0 } }
    function onMove(e) {
      if (!drag) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.moved += Math.abs(dx) + Math.abs(dy)
      drag.x = e.clientX
      drag.y = e.clientY
      if (drag.moved > 6) { turn(dx * 0.15); walk(-dy * 2.5) }
    }
    function onUp() { stage.dataset.dragged = drag && drag.moved > 6 ? '1' : ''; drag = null }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)

    let frame
    let last = performance.now()
    let lastNearest = -1
    function tick(now) {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      if (reduced) {
        cam.z.x = target.current.z
        cam.yaw.x = target.current.yaw
      } else {
        springStep(cam.z, target.current.z, 70, 16, dt)
        springStep(cam.yaw, target.current.yaw, 80, 17, dt)
      }

      // Алхах үеийн бага зэргийн дээш доош хөдөлгөөн (head bob)
      const speed = clamp(Math.abs(cam.z.v) / 400, 0, 1)
      const bob = reduced ? 0 : Math.sin(cam.z.x / 55) * 3 * speed

      worldRef.current.style.transform =
        `translateY(${bob}px) translateZ(${EYE}px) rotateY(${cam.yaw.x}deg) translateZ(${-EYE}px) translateZ(${cam.z.x}px)`

      // Хол байгаа жаазуудыг манан шиг бүдгэрүүлнэ
      items.forEach((item, i) => {
        const el = frameRefs.current[i]
        if (!el) return
        const d = item.z - cam.z.x
        el.style.opacity = d < -150 ? 0 : 1 - clamp((d - 2200) / 1200, 0, 1)
      })

      // Minimap дээрх үзэгч
      if (dotRef.current) {
        const y = MAP_H - (cam.z.x + EYE - NEAR) * (MAP_H / length)
        dotRef.current.setAttribute('transform', `translate(30 ${y}) rotate(${cam.yaw.x})`)
      }

      // Хамгийн ойрын жааз
      let best = 0
      items.forEach((item, i) => {
        if (Math.abs(item.z - AHEAD - cam.z.x) < Math.abs(items[best].z - AHEAD - cam.z.x)) best = i
      })
      if (best !== lastNearest) { lastNearest = best; setNearest(best) }

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // Хөтөчтэй аялал: жааз бүр дээр TOUR_MS хугацаанд зогсож шошгыг нь нээнэ
  useEffect(() => {
    if (!touring) return
    let i = 0
    goTo(0)
    setSelected(items[0].ex)
    const id = setInterval(() => {
      i += 1
      if (i >= count) {
        setTouring(false)
        return
      }
      goTo(i)
      setSelected(items[i].ex)
    }, TOUR_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touring])

  // Esc — шошгыг хаана
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  function openFrame(i) {
    if (stageRef.current.dataset.dragged) return // чирсэн бол дарсанд тооцохгүй
    setTouring(false)
    goTo(i)
    setSelected(items[i].ex)
  }

  async function toggleLike(ex) {
    if (!user || !likes) return
    const liked = likes.mine.has(ex.id)
    // Хэрэглэгчид шууд харуулж, дараа нь сервер рүү илгээнэ
    const counts = { ...likes.counts, [ex.id]: (likes.counts[ex.id] ?? 0) + (liked ? -1 : 1) }
    const mine = new Set(likes.mine)
    if (liked) mine.delete(ex.id)
    else mine.add(ex.id)
    setLikes({ counts, mine })

    const { error } = liked
      ? await supabase.from('exhibit_likes').delete().eq('exhibit_id', ex.id).eq('user_id', user.id)
      : await supabase.from('exhibit_likes').insert({ exhibit_id: ex.id })
    if (error) {
      setError(translateError(error))
      setLikes(likes) // буцаах
    }
  }

  if (exhibits === null) return <Loading />
  if (count === 0) {
    return (
      <div className="container section">
        <ErrorBox message={error} />
        <EmptyState title="Үзэсгэлэнд бүтээл алга" action={<Link to="/exhibits/new" className="btn btn-primary">Бүтээл нэмэх</Link>} />
      </div>
    )
  }

  const depth = length + NEAR
  const mid = (NEAR - length) / 2
  const plane = (w, h, transform, className, style = {}) => ({
    className,
    style: { width: w, height: h, transform: `translate(-50%, -50%) ${transform}`, ...style },
  })
  const scale = MAP_H / length
  const mapY = (z) => MAP_H - (z + EYE - NEAR) * scale
  const currentRoom = rooms[items[nearest]?.room]
  const likeCount = (ex) => likes?.counts[ex.id] ?? 0

  return (
    <section className="vx">
      <div ref={stageRef} className="vx-stage" style={{ perspective: EYE }} tabIndex={0} aria-label="Виртуал үзэсгэлэнгийн танхим">
        <div ref={worldRef} className="vx-world">
          {/* Үндсэн коридор */}
          <div {...plane(W, depth, `translate3d(0, ${H / 2}px, ${mid}px) rotateX(90deg)`, 'vx-floor')} />
          <div {...plane(W, depth, `translate3d(0, ${-H / 2}px, ${mid}px) rotateX(-90deg)`, 'vx-ceiling')} />
          <div {...plane(depth, H, `translate3d(${-W / 2}px, 0, ${mid}px) rotateY(90deg)`, 'vx-wall')} />
          <div {...plane(depth, H, `translate3d(${W / 2}px, 0, ${mid}px) rotateY(-90deg)`, 'vx-wall')} />
          <div {...plane(W, H, `translate3d(0, 0, ${-length}px)`, 'vx-wall vx-end')}>
            <p>ISM өртөө</p>
            <span>{rooms.length} танхим, {count} бүтээл</span>
          </div>

          {/* Танхим бүр: өнгөт хана + өлгөөтэй нэрийн самбар */}
          {rooms.map((room) => {
            const len = room.end - room.start
            const zc = -(room.start + len / 2)
            const tint = { background: `linear-gradient(180deg, ${room.tint} 0%, ${room.tint} 82%, #d6d1c8 100%)` }
            return [
              <div key={`${room.name}-l`} {...plane(len, H, `translate3d(${-W / 2 + 1}px, 0, ${zc}px) rotateY(90deg)`, 'vx-room-wall', tint)} />,
              <div key={`${room.name}-r`} {...plane(len, H, `translate3d(${W / 2 - 1}px, 0, ${zc}px) rotateY(-90deg)`, 'vx-room-wall', tint)} />,
              <div key={`${room.name}-sign`} {...plane(460, 80, `translate3d(0, ${-H / 2 + 110}px, ${-room.start}px)`, 'vx-sign')}>
                <strong>{room.name}</strong>
                <span>{room.count} бүтээл</span>
              </div>,
            ]
          })}

          {/* Жаазууд */}
          {items.map((item, i) => {
            const { ex } = item
            const x = item.left ? -W / 2 + 3 : W / 2 - 3
            const rot = item.left ? 90 : -90
            return (
              <button
                key={ex.id}
                ref={(el) => (frameRefs.current[i] = el)}
                className="vx-frame"
                style={{ transform: `translate(-50%, -50%) translate3d(${x}px, -30px, ${-item.z}px) rotateY(${rot}deg)` }}
                onClick={() => openFrame(i)}
                aria-label={`${ex.title} — шошго нээх`}
              >
                <span className="vx-light" aria-hidden="true" />
                <span className="vx-canvas">
                  {ex.image_url ? <img src={ex.image_url} alt="" draggable={false} /> : <span className="vx-blank">{ex.title}</span>}
                </span>
                <span className="vx-plaque">
                  <strong>{ex.title}</strong>
                  <small>{[ex.creator?.display_name, ex.year_created].filter(Boolean).join(', ')}</small>
                  {likeCount(ex) > 0 && <small className="vx-plaque-likes">♥ {likeCount(ex)}</small>}
                </span>
              </button>
            )
          })}
        </div>

      </div>

      {/* Самбарууд 3D ертөнцөөс тусдаа давхаргад — 3D объект тэднийг халхлахгүй */}
      <div className="vx-overlay">
        {/* Minimap */}
        <div className="vx-map" aria-label="Танхимын зураг">
          <svg width="60" height={MAP_H} viewBox={`0 0 60 ${MAP_H}`}>
            <rect x="12" y="0" width="36" height={MAP_H} className="vx-map-hall" />
            {rooms.map((room) => (
              <rect key={room.name} x="12" y={mapY(room.end)} width="36" height={(room.end - room.start) * scale} fill={room.tint} className="vx-map-room">
                <title>{room.name}</title>
              </rect>
            ))}
            {items.map((item, i) => (
              <rect
                key={item.ex.id}
                x={item.left ? 12 : 44}
                y={mapY(item.z) - 4}
                width="4"
                height="8"
                className={`vx-map-frame ${i === nearest ? 'active' : ''}`}
                onClick={() => openFrame(i)}
              >
                <title>{item.ex.title}</title>
              </rect>
            ))}
            <g ref={dotRef} className="vx-map-me">
              <path d="M0 -9 L5 3 L0 0 L-5 3 Z" />
            </g>
          </svg>
          {currentRoom && <p>{currentRoom.name}</p>}
        </div>

        {/* Доод самбар */}
        <div className="vx-hud">
          <button className="vx-btn" onClick={() => { setTouring(false); goTo(nearest - 1) }} disabled={nearest === 0}>Өмнөх</button>
          <span className="vx-count">{nearest + 1} / {count}</span>
          <button className="vx-btn" onClick={() => { setTouring(false); goTo(nearest + 1) }} disabled={nearest === count - 1}>Дараах</button>
          <span className="vx-sep" />
          <button className={`vx-btn ${touring ? 'on' : ''}`} onClick={() => setTouring((t) => !t)}>
            {touring ? 'Аялал зогсоох' : 'Хөтөчтэй аялал'}
          </button>
        </div>
        <p className="vx-help">Гүйлгэх эсвэл ↑ ↓ товчоор алхаж, чирэх эсвэл ← → товчоор эргэнэ. Жааз дээр дарж дэлгэрэнгүйг үзнэ.</p>

        {touring && <div className="vx-tour-bar" key={nearest} style={{ animationDuration: `${TOUR_MS}ms` }} />}
      </div>

      <ErrorBox message={error} />

      {selected && (
        <aside className="vx-panel" role="dialog" aria-label={selected.title}>
          <button className="vx-close" onClick={() => { setSelected(null); setTouring(false) }} aria-label="Хаах">✕</button>
          {selected.image_url && <img src={selected.image_url} alt={selected.title} />}
          <p className="muted small">{selected.category?.name ?? 'Бусад'} танхим</p>
          <h2>{selected.title}</h2>
          <p className="muted small">
            {[selected.creator?.display_name, selected.year_created].filter(Boolean).join(', ')}
          </p>
          {selected.description && <p>{selected.description}</p>}
          {selected.technology_stack?.length > 0 && (
            <p className="label-medium">{selected.technology_stack.join(', ')}</p>
          )}
          <div className="actions">
            <Link to={`/exhibits/${selected.id}`} className="btn btn-primary">Дэлгэрэнгүй</Link>
            {likes && (user ? (
              <button
                className={`btn btn-ghost vx-like ${likes.mine.has(selected.id) ? 'liked' : ''}`}
                onClick={() => toggleLike(selected)}
                aria-pressed={likes.mine.has(selected.id)}
              >
                ♥ {likeCount(selected)} {likes.mine.has(selected.id) ? 'Таалагдсан' : 'Таалагдлаа'}
              </button>
            ) : (
              <Link to="/login" className="btn btn-ghost">♥ {likeCount(selected)} Нэвтэрч дарах</Link>
            ))}
          </div>
        </aside>
      )}
    </section>
  )
}
