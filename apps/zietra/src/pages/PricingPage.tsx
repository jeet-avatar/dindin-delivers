import { NavBar } from '../components/NavBar'
import { PricingSection } from '../components/PricingSection'
import { SiteFooter } from '../components/SiteFooter'

export default function PricingPage() {
  return (
    <>
      <NavBar />
      <main style={{ paddingTop: 52 }}>
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  )
}
