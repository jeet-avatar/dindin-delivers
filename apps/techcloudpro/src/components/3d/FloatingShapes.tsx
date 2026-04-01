interface Shape {
  className: string
  style: React.CSSProperties
}

const shapes: Shape[] = [
  {
    className: 'w-20 h-20 border-[1.5px] border-blue-500 rounded-md',
    style: { top: '12%', right: '14%', animation: 'orbit 25s linear infinite', opacity: 'var(--shape-opacity)' },
  },
  {
    className: 'w-28 h-28 border-[1.5px] border-cyan-500 rounded-full',
    style: { top: '22%', left: '10%', animation: 'orbit 18s linear infinite', animationDelay: '-4s', opacity: 'var(--shape-opacity)' },
  },
  {
    className: 'w-12 h-12 border-[1.5px] border-purple-500 rounded-sm',
    style: { top: '55%', left: '14%', transform: 'rotate(45deg)', animation: 'orbit 22s linear infinite', animationDelay: '-8s', opacity: 'var(--shape-opacity)' },
  },
  {
    className: 'w-[70px] h-[70px] border-[1.5px] border-emerald-500 rounded-xl',
    style: { top: '60%', right: '10%', transform: 'rotate(30deg)', animation: 'orbit 20s linear infinite', animationDelay: '-12s', opacity: 'var(--shape-opacity)' },
  },
]

export function FloatingShapes() {
  return (
    <>
      {shapes.map((s, i) => (
        <div key={i} className={`absolute ${s.className}`} style={s.style} />
      ))}
    </>
  )
}
