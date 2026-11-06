// ISM лого: музейн барилга. Баганууд нь өсөж буй график хэлбэртэй —
// "музей" ба "мэдээллийн систем" гэсэн хоёр санааг нэгтгэнэ.
export function LogoMark({ size = 32, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 13.5 20 3l17 10.5H3Z" />
      <rect x="7" y="25" width="6" height="9" rx="0.5" />
      <rect x="17" y="20" width="6" height="14" rx="0.5" />
      <rect x="27" y="16" width="6" height="18" rx="0.5" />
      <rect x="3" y="35.5" width="34" height="2.5" />
    </svg>
  )
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark size={30} className="logo-mark" />
      <span className="logo-text">
        <b>ISM</b> өртөө
      </span>
    </span>
  )
}
