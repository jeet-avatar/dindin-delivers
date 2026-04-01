export function MeshFloor() {
  return (
    <div
      className="absolute -bottom-[10%] -left-[20%] -right-[20%] h-[50%]"
      style={{
        backgroundImage: `linear-gradient(var(--mesh-color) 1px, transparent 1px), linear-gradient(90deg, var(--mesh-color) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        transform: 'rotateX(60deg)',
        animation: 'grid-scroll 20s linear infinite',
      }}
    />
  )
}
