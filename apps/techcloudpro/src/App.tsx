import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './context/ThemeProvider'
import { PageLayout } from './components/layout/PageLayout'
import { ScrollToTop } from './components/layout/ScrollToTop'

const Home = lazy(() => import('./pages/Home'))
const Services = lazy(() => import('./pages/Services'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'))
const AIConsulting = lazy(() => import('./pages/AIConsulting'))
const Clients = lazy(() => import('./pages/Clients'))
const CaseStudies = lazy(() => import('./pages/CaseStudies'))
const About = lazy(() => import('./pages/About'))
const Leadership = lazy(() => import('./pages/Leadership'))
const Partners = lazy(() => import('./pages/Partners'))
const Careers = lazy(() => import('./pages/Careers'))
const Contact = lazy(() => import('./pages/Contact'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop />
          <PageLayout>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/ai" element={<AIConsulting />} />
                <Route path="/services/:slug" element={<ServiceDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/case-studies" element={<CaseStudies />} />
                <Route path="/about" element={<About />} />
                <Route path="/leadership" element={<Leadership />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PageLayout>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  )
}
