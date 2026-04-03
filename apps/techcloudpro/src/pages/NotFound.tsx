import { Scene3D } from '../components/3d'
import { Button, SEO, SchemaMarkup } from '../components/ui'

export default function NotFound() {
  return (
    <>
      <SEO title="404 — Page Not Found" description="This page doesn't exist." path="/404" />
      <SchemaMarkup page="home" />
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 text-center px-6">
          <h1 className="text-8xl font-extrabold grad-text-blue mb-4">404</h1>
          <p className="text-xl text-[var(--text-dim)] mb-8">This page doesn't exist.</p>
          <Button href="/" size="lg">Go Home</Button>
        </div>
      </section>
    </>
  )
}
