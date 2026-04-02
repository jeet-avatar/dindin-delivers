const bands = [
  { top: '5%', colors: 'transparent, rgba(37,99,235,0.4), rgba(139,92,246,0.3), rgba(6,182,212,0.25), transparent', duration: '12s', delay: '0s' },
  { top: '30%', colors: 'transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.25), transparent', duration: '18s', delay: '-4s' },
  { top: '55%', colors: 'transparent, rgba(6,182,212,0.25), rgba(37,99,235,0.2), transparent', duration: '22s', delay: '-9s' },
]

export function Aurora() {
  return (
    <>
      {bands.map((band, i) => (
        <div
          key={i}
          className="absolute w-[200%] h-[300px] -left-1/2"
          style={{
            top: band.top,
            background: `linear-gradient(90deg, ${band.colors})`,
            filter: 'blur(50px)',
            animation: `aurora-wave ${band.duration} ease-in-out infinite`,
            animationDelay: band.delay,
          }}
        />
      ))}
    </>
  )
}
