const particles = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${8 + i * 9}%`,
  duration: `${9 + (i % 5) * 2}s`,
  delay: `${-(i * 1.3)}s`,
}))

export function Particles() {
  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-0.5 h-0.5 rounded-full"
          style={{
            left: p.left,
            bottom: 0,
            backgroundColor: 'var(--particle-color)',
            animation: `particle-rise ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  )
}
