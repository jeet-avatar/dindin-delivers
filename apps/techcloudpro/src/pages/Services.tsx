import { Helmet } from 'react-helmet-async'
import { SectionHeader } from '../components/ui'

export default function Services() {
  return (
    <>
      <Helmet><title>Services | TechCloudPro</title></Helmet>
      <section className="min-h-[60vh] flex items-center justify-center px-6">
        <SectionHeader label="Coming Soon" title="Services" subtitle="This page will be built in a later wave." />
      </section>
    </>
  )
}
