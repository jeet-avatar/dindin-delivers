import { Particles } from './Particles'
import { MeshFloor } from './MeshFloor'
import { FloatingShapes } from './FloatingShapes'

interface Scene3DProps {
  showMesh?: boolean
  className?: string
}

export function Scene3D({ showMesh = true, className = '' }: Scene3DProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ perspective: '1400px' }}>
      {/* Gradient orbs */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-600 -top-[10%] -left-[5%]" style={{ filter: 'blur(100px)', animation: 'orb-breathe 10s ease-in-out infinite' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-purple-600 top-[30%] -right-[5%]" style={{ filter: 'blur(100px)', animation: 'orb-breathe 10s ease-in-out infinite', animationDelay: '-4s' }} />
      <div className="absolute w-[250px] h-[250px] rounded-full bg-cyan-500 bottom-0 left-[35%]" style={{ filter: 'blur(100px)', animation: 'orb-breathe 10s ease-in-out infinite', animationDelay: '-7s', opacity: 0.1 }} />

      {/* Wireframe shapes */}
      <FloatingShapes />

      {/* Particles */}
      <Particles />

      {/* Mesh floor */}
      {showMesh && <MeshFloor />}
    </div>
  )
}
