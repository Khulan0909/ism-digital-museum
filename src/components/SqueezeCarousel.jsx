import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/*
 * Squeeze carousel — нэг үзмэр нээлттэй, бусад нь баруун талд нарийн
 * зурвас (slat) болж шахагдана. Зурвас дээр дарахад мөр гулсаж нээгдэнэ.
 * (21st.dev-ийн TypeScript + Tailwind хувилбараас JavaScript + CSS рүү хөрвүүлсэн.)
 *
 * Мөр нь 4 багана + зурваснуудын сүүл. 0-р багана 16:9 хэмжээтэй, бусад нь
 * үлдсэн зайг SHARES-ийн дагуу хуваана. Хулгана авчирсан багана өргөсөж
 * (STRETCHED), хөршүүд нь бага зэрэг нарийсна (SQUEEZED).
 */
const SHARES = [-0.06, 0.61, 0.3, 0.15]
const STRETCHED = [0, 0.71, 0.4, 0.25]
const SQUEEZED = [-0.12, 0.59, 0.28, 0.13]

const size = (value) => (typeof value === 'number' ? `${value}px` : value)
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])
  return reduced
}

export default function SqueezeCarousel({
  slides,
  defaultIndex = 0,
  onIndexChange,
  height = 'clamp(150px, 30cqi, 340px)',
  slatWidth = 8,
  slatGap = 8,
  gap = 16,
  radius = 4,
  duration = 1000,
  hoverGrow = true,
  autoplay = false,
  interval = 6000,
  controls = true,
  label = 'Онцлох бүтээлүүд',
  className = '',
}) {
  const count = slides.length
  const wrap = (i) => ((i % count) + count) % count

  const slats = clamp(count - 4, 1, 3)
  const visible = 4 + slats

  const reduced = useReducedMotion()
  const ms = reduced ? 0 : duration

  const ids = useId()
  const seed = useRef(0)

  // Мөрөнд байгаа картууд: { key, slide }
  const [cards, setCards] = useState(() =>
    Array.from({ length: visible }, (_, p) => ({ key: seed.current++, slide: wrap(defaultIndex + p) }))
  )
  // Карт бүрийн багана = мөрөн дэх байрлал + column. Урагшлах үед буурна.
  const [column, setColumn] = useState(0)
  const columnRef = useRef(0)
  const forward = useRef(true)
  // Мөр хэдэн зурвасаар гулссан бэ
  const [slid, setSlid] = useState(0)
  const [still, setStill] = useState(false)
  const [hover, setHover] = useState(-1)

  const open = cards[-column]?.slide ?? defaultIndex
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Хөдөлгөөн дууссаны дараа мөрийг харагдаж буй картууд руу нь буцааж тайрна.
  const settle = useCallback(() => {
    setCards((strip) => (forward.current ? strip.slice(-visible) : strip.slice(0, visible)))
    columnRef.current = 0
    setColumn(0)
    setSlid(0)
    setStill(true)
  }, [visible])

  useLayoutEffect(() => {
    if (!still) return
    const id = requestAnimationFrame(() => setStill(false))
    return () => cancelAnimationFrame(id)
  }, [still])

  const step = useCallback(
    (by) => {
      if (count < 2 || by === 0) return
      timers.current.forEach(clearTimeout)
      timers.current = []
      forward.current = by > 0

      if (by > 0) {
        setCards((strip) => [
          ...strip,
          ...Array.from({ length: by }, (_, k) => ({
            key: seed.current++,
            slide: wrap(strip[strip.length - 1].slide + 1 + k),
          })),
        ])
        columnRef.current -= by
        setColumn(columnRef.current)
        setSlid((s) => s - by)
      } else {
        // Буцахад мөрийн эхэнд карт нэмэгдэж бүгд баруун тийш түлхэгдэнэ.
        // Анимацгүйгээр зүүн тийш шилжүүлээд, дараа нь зөөлөн буцаана.
        setCards((strip) => [
          ...Array.from({ length: -by }, (_, k) => ({
            key: seed.current++,
            slide: wrap(strip[0].slide - (-by - k)),
          })),
          ...strip,
        ])
        setSlid((s) => s + by)
        setStill(true)
        timers.current.push(window.setTimeout(() => setSlid(0), 0))
      }
      timers.current.push(window.setTimeout(settle, ms + 20))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, ms, settle]
  )

  useEffect(() => {
    onIndexChange?.(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Автоматаар солигдох (autoplay)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!autoplay || paused || reduced || count < 2) return
    const timer = window.setTimeout(() => step(1), interval)
    return () => clearTimeout(timer)
  }, [autoplay, paused, reduced, count, open, interval, step])

  function onKeyDown(event) {
    const by = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (by === undefined) return
    event.preventDefault()
    step(by)
  }

  if (!count) return null

  const slat = size(slatWidth)
  const hovering = hoverGrow && hover >= 0 && hover <= 3 && !reduced

  const shareOf = (col) => (!hovering ? SHARES[col] : hover === col ? STRETCHED[col] : SQUEEZED[col])

  // Баганын өргөнийг CSS calc-аар тооцно — юу ч хэмжих шаардлагагүй.
  const widthOf = (col) => {
    if (col < 0 || col > 3) return slat
    if (col === 0) return `calc(var(--sq-hero) + var(--sq-room) * ${shareOf(0)})`
    return `calc(var(--sq-room) * ${shareOf(col)})`
  }

  const vars = {
    '--sq-h': size(height),
    '--sq-gap': size(gap),
    '--sq-slat-gap': size(slatGap),
    '--sq-radius': size(radius),
    '--sq-ms': `${ms}ms`,
    '--sq-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',
    '--sq-hero': 'calc(var(--sq-h) * 16 / 9)',
    '--sq-room': `calc(100cqi - var(--sq-hero) - ${slats} * var(--sq-slat-gap) - 3 * var(--sq-gap) - ${slats} * ${slat})`,
  }

  return (
    <div
      className={`sq ${className}`}
      style={vars}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false)
        setHover(-1)
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {controls && count > 1 && (
        <div className="sq-controls">
          <Arrow back label="Өмнөх" onClick={() => step(-1)} />
          <Arrow label="Дараах" onClick={() => step(1)} />
        </div>
      )}

      <div className="sq-viewport">
        <div
          role="tablist"
          aria-label={label}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="sq-strip"
          style={{
            transform: `translateX(calc(${slid} * (${slat} + var(--sq-gap))))`,
            transition: still ? 'none' : 'transform var(--sq-ms) var(--sq-ease)',
          }}
        >
          {cards.map((card, place) => {
            const col = place + column
            const slide = slides[card.slide]
            const front = col === 0
            return (
              <button
                key={card.key}
                type="button"
                role="tab"
                aria-selected={front}
                aria-controls={`${ids}-panel`}
                aria-label={slide.title}
                tabIndex={front ? 0 : -1}
                onMouseMove={() => hoverGrow && setHover(col)}
                onClick={() => col > 0 && step(col)}
                className="sq-panel"
                style={{
                  width: widthOf(col),
                  marginLeft: place === 0 ? 0 : col < 4 ? 'var(--sq-gap)' : 'var(--sq-slat-gap)',
                  borderRadius: `min(var(--sq-radius), calc(${widthOf(col)} / 2))`,
                  transitionDuration: still ? '0s' : 'var(--sq-ms)',
                }}
              >
                <Picture slide={slide} />
                {slide.overlay && (
                  <span className="sq-overlay" aria-hidden="true" style={{ opacity: front ? 1 : 0 }}>
                    {slide.overlay}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div id={`${ids}-panel`} role="tabpanel" aria-live="polite" className="sq-copy">
        {slides.map((slide, i) => {
          const shown = i === open
          return (
            <div
              key={slide.id ?? i}
              aria-hidden={!shown}
              className="sq-copy-item"
              style={{
                opacity: shown ? 1 : 0,
                visibility: shown ? 'visible' : 'hidden',
                pointerEvents: shown ? 'auto' : 'none',
              }}
            >
              <p className="sq-text">
                <span className="sq-title">{slide.title}</span>{' '}
                {slide.description && <span className="sq-desc">{slide.description}</span>}
              </p>
              {slide.action && slide.to && (
                <Link to={slide.to} tabIndex={shown ? 0 : -1} className="sq-action">
                  {slide.action}
                  <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true">
                    <path d="M1.2 1 4.7 4.5 1.2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Зургийг үргэлж 16:9 хэмжээтэй зурж голлуулна — карт нарийсахад зөвхөн
// харагдах хэсэг нь өөрчлөгдөнө, зураг өөрөө дахин томорч/жижгэрэхгүй.
function Picture({ slide }) {
  const box = { width: 'var(--sq-hero)', minWidth: '100%' }
  if (slide.image) {
    return <img src={slide.image} alt={slide.imageAlt ?? ''} draggable={false} className="sq-img" style={box} />
  }
  return <span aria-hidden="true" className="sq-img sq-img-empty" style={box} />
}

function Arrow({ back = false, label, onClick }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="sq-arrow">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d={
            back
              ? 'M9.6 2.6 5.1 7.1h9.1v1.8H5.1l4.5 4.5-1.2 1.2-6-6L1.8 8l.6-.6 6-6 1.2 1.2Z'
              : 'M6.4 2.6l4.5 4.5H1.8v1.8h9.1l-4.5 4.5 1.2 1.2 6-6 .6-.6-.6-.6-6-6-1.2 1.2Z'
          }
        />
      </svg>
    </button>
  )
}
