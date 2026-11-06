import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/*
 * Нүүр хуудасны 3D хонгил (perspective tunnel).
 * Хулганы дугуй / хуруугаар гүйлгэхэд үзмэрүүдийн зургууд гүнээс (z = -1700px)
 * дэлгэц рүү (z = 500px) нисэж ирнэ. Хулгана хөдөлгөхөд камер бага зэрэг хазайна.
 * framer-motion-гүйгээр requestAnimationFrame + энгийн spring тооцоогоор хийсэн.
 */

const START = 0.15 // эхлэхэд хэдэн зураг аль хэдийн харагдаж байх

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// x-ийг xs цэгүүдээр ys утгууд руу шугаман байдлаар буулгана (framer-ийн useTransform шиг)
function interp(x, xs, ys) {
  if (x <= xs[0]) return ys[0]
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
      return ys[i - 1] + (ys[i] - ys[i - 1]) * t
    }
  }
  return ys[ys.length - 1]
}

// Пүрш (spring): x нь target руу зөөлөн хөдөлнө
function springStep(s, target, stiffness, damping, mass, dt) {
  const accel = (stiffness * (target - s.x) - damping * s.v) / mass
  s.v += accel * dt
  s.x += s.v * dt
}

// Алтан өнцгөөр (137.5°) картуудыг дугуйлан тараана — давхцахгүй, жигд
function layout(items) {
  return items.map((item, i) => {
    const a = i * 137.5 * (Math.PI / 180)
    return {
      item,
      cos: Math.cos(a),
      sin: Math.sin(a),
      rx: 0.28 + (i % 3) * 0.08,
      ry: 0.26 + (i % 2) * 0.09,
      rot: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
    }
  })
}

export default function TunnelHero({ items, children, actions }) {
  const rootRef = useRef(null)
  const titleRef = useRef(null)
  const promptRef = useRef(null)
  const cardRefs = useRef([])
  const [stage, setStage] = useState({ width: 1200, height: 700, isMobile: false })

  const cards = layout(items)

  // Давталт дотроос хамгийн сүүлийн хэмжээг уншихын тулд ref-д хадгална
  const stageRef = useRef(stage)
  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  // Хонгилын хэмжээг хянана
  useEffect(() => {
    const el = rootRef.current
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setStage({ width, height, isMobile: width < 768 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Хөдөлгөөний гол давталт
  useEffect(() => {
    const root = rootRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = { progress: START, px: 0, py: 0 }
    const progress = { x: START, v: 0 }
    const px = { x: 0, v: 0 }
    const py = { x: 0, v: 0 }

    // Хонгил дуустал хуудас гүйлгэхгүй, дууссаны дараа хуудас ердийнхөөрөө гүйлгэгдэнэ
    function advance(delta, event) {
      const atTop = window.scrollY < 5
      const forward = delta > 0 && target.progress < 1
      const backward = delta < 0 && target.progress > 0
      if (atTop && (forward || backward)) {
        event.preventDefault()
        target.progress = clamp(target.progress + delta, 0, 1)
      }
    }
    const onWheel = (e) => advance(e.deltaY * 0.0008, e)
    let touchY = null
    const onTouchStart = (e) => { touchY = e.touches[0].clientY }
    const onTouchMove = (e) => {
      if (touchY === null) return
      const y = e.touches[0].clientY
      advance((touchY - y) * 0.003, e)
      touchY = y
    }
    const onPointer = (e) => {
      if (reduced) return
      target.px = (e.clientX / window.innerWidth - 0.5) * 2
      target.py = (e.clientY / window.innerHeight - 0.5) * 2
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointermove', onPointer, { passive: true })

    let frame
    let last = performance.now()
    function tick(now) {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      springStep(progress, target.progress, 80, 30, 1, dt)
      springStep(px, target.px, 60, 25, 0.5, dt)
      springStep(py, target.py, 60, 25, 0.5, dt)
      render(progress.x, px.x, py.x)
      frame = requestAnimationFrame(tick)
    }

    function render(p, mx, my) {
      const { width, height, isMobile } = stageRef.current
      const total = cards.length
      const span = 0.55
      const farZ = isMobile ? -1200 : -1700
      const nearZ = isMobile ? 350 : 500
      const pan = isMobile ? 20 : 45

      cards.forEach((card, i) => {
        const el = cardRefs.current[i]
        if (!el) return
        const start = (i / total) * (1 - span)
        const local = clamp((p - start) / span, 0, 1)
        const z = farZ + (nearZ - farZ) * local
        const opacity = interp(local, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0])
        const x = card.cos * width * card.rx - mx * pan
        const y = card.sin * height * card.ry - my * pan
        el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateZ(${card.rot}deg)`
        el.style.opacity = opacity
        el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none'
      })

      // Гарчиг "ISM өртөө" үргэлж харагдана, зөвхөн бага зэрэг томорно
      const title = titleRef.current
      if (title) title.style.transform = `scale(${interp(p, [0, 1], [1, 1.12])})`
      if (promptRef.current) promptRef.current.style.opacity = interp(p, [0, 0.3], [1, 0])
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('pointermove', onPointer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const cardWidth = stage.isMobile
    ? Math.max(120, Math.min(170, stage.width * 0.36))
    : Math.max(170, Math.min(250, stage.width * 0.17))

  return (
    <section
      ref={rootRef}
      className="tunnel"
      style={{ perspective: stage.isMobile ? '900px' : '1200px' }}
    >
      <div className="tunnel-grid" aria-hidden="true" />
      <div className="tunnel-ring" aria-hidden="true" />
      <div className="tunnel-ring dashed" aria-hidden="true" />

      <div ref={titleRef} className="tunnel-title">
        {children}
      </div>

      {/* Товчнууд зургуудаас үргэлж дээгүүр байна */}
      {actions && <div className="tunnel-cta">{actions}</div>}

      <div ref={promptRef} className="tunnel-prompt" aria-hidden="true">
        <span>Гүйлгээд аялаарай</span>
        <i />
      </div>

      <div className="tunnel-plane">
        {cards.map((card, i) => (
          <Link
            key={i}
            ref={(el) => (cardRefs.current[i] = el)}
            to={card.item.to}
            className="tunnel-card"
            style={{ width: cardWidth, opacity: 0 }}
            aria-label={card.item.title}
            tabIndex={-1}
          >
            <span className="tunnel-card-inner">
              {card.item.src && <img src={card.item.src} alt="" draggable={false} />}
              <span className="tunnel-caption">{card.item.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
