import { Helmet } from 'react-helmet-async'
import { SectionHeader } from '../components/ui'

export default function Clients() {
  return (
    <>
      <Helmet><title>Clients | TechCloudPro</title></Helmet>
      <section className="min-h-[60vh] flex items-center justify-center px-6">
        <SectionHeader label="Coming Soon" title="Clients" subtitle="This page will be built in a later wave." />
      </section>
    </>
  )
}
