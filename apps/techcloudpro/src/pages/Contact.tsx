import { useState } from 'react'
import { Send, CheckCircle, AlertCircle, MapPin, Mail, Phone } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, Button, SEO } from '../components/ui'
import { SchemaMarkup } from '../components/ui/SchemaMarkup'

type Status = 'idle' | 'sending' | 'success' | 'error'

const serviceOptions = ['NetSuite ERP', 'Cybersecurity', 'AI & Private LLM', 'IT Staffing', 'Other']

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    // Honeypot check
    if (data._honey) { setStatus('success'); return }

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'https://script.google.com/macros/s/AKfycbwViyeodzio8FG_JyGzlpfXE3dbVIkoGxFr9QH3rgZ1JxyTE_9APyZTzUVx1ncO3r4oMA/exec')
      xhr.setRequestHeader('Content-Type', 'text/plain')
      xhr.onloadend = () => resolve()
      xhr.onerror = () => resolve()
      xhr.send(JSON.stringify(data))
    })
    setStatus('success')
    form.reset()
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors [.light_&]:bg-white'

  return (
    <>
      <SEO
        title="Contact Us — Get a Free Consultation"
        description="Schedule a free consultation with TechCloudPro. 40 hours of free discovery sessions included."
        path="/contact"
      />
      <SchemaMarkup page="contact" breadcrumbs={[
        { name: 'Home', url: 'https://techcloudpro.com/' },
        { name: 'Contact', url: 'https://techcloudpro.com/contact' },
      ]} />

      <section className="relative py-28 md:py-32 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            as="h1"
            label="Get In Touch"
            title="Ready to Transform Your Business?"
            subtitle="Schedule a free consultation. 40 hours of discovery sessions included. We'll get back to you within 24 hours."
          />
        </div>
      </section>

      <section className="py-12 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3">
            <GlassCard className="p-8">
              {status === 'success' ? (
                <div className="text-center py-12">
                  <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                  <p className="text-[var(--text-muted)]">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Honeypot */}
                  <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" />

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2">Full Name *</label>
                      <input type="text" id="name" name="name" required className={inputClass} placeholder="John Smith" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2">Email *</label>
                      <input type="email" id="email" name="email" required className={inputClass} placeholder="john@company.com" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="company" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2">Company</label>
                      <input type="text" id="company" name="company" className={inputClass} placeholder="Acme Corp" />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2">Phone</label>
                      <input type="tel" id="phone" name="phone" className={inputClass} placeholder="+1 (555) 000-0000" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="service" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2">Service of Interest</label>
                    <select id="service" name="service" className={`${inputClass} cursor-pointer`}>
                      <option value="">Select a service</option>
                      {serviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2">Message</label>
                    <textarea id="message" name="message" rows={5} className={`${inputClass} resize-none`} placeholder="Tell us about your needs..." />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 text-rose-400 text-sm">
                      <AlertCircle size={16} />
                      <span>Something went wrong. Please try again or email us directly.</span>
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full justify-center">
                    {status === 'sending' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Send Message <Send size={16} /></>
                    )}
                  </Button>
                </form>
              )}
            </GlassCard>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2 space-y-5">
            <GlassCard className="p-6">
              <div className="flex items-start gap-3">
                <Mail size={20} className="text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-bold mb-1">Email Us</h4>
                  <a href="mailto:contact@techcloudpro.com" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors block">contact@techcloudpro.com</a>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-start gap-3">
                <Phone size={20} className="text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-bold mb-1">Call Us</h4>
                  <p className="text-[13px] text-[var(--text-muted)]">Contact us for a direct consultation</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-bold mb-1">Global Offices</h4>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1">7 offices across 5 countries</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <SectionHeader
          label="Our Offices"
          title="Global Presence"
          subtitle="Strategically located across North America, Asia-Pacific, and India to serve our clients worldwide."
          className="mb-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#FB923C' }} />
              <h3 className="text-sm font-bold">Beverly Hills, USA</h3>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: 'rgba(249,115,22,0.12)', color: '#FB923C' }}>Head Office</span>
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-dim)] mb-1">Vibing World Inc</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              8383 Wilshire Blvd, Suite 800<br />
              Beverly Hills, CA 90211<br />
              <span className="text-[12px]">Phone: +1-866-983-2425</span>
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#FB923C' }} />
              <h3 className="text-sm font-bold">New York, USA</h3>
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-dim)] mb-1">Vibing World Inc</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              477 Madison Avenue, 6th Floor<br />
              New York, NY 10022
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#FB923C' }} />
              <h3 className="text-sm font-bold">Phoenix, USA</h3>
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-dim)] mb-1">Vibing World Inc</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              Two North Central Ave<br />
              18th and 19th Floor<br />
              Phoenix, AZ 85004
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#60A5FA' }} />
              <h3 className="text-sm font-bold">Toronto, Canada</h3>
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-dim)] mb-1">Vibing Technologies Limited</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              1275-B (First Floor), Jane Street<br />
              Toronto, Ontario M6M 4Y1<br />
              <span className="text-[12px]">Phone: +1-647-865-4739</span>
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#34D399' }} />
              <h3 className="text-sm font-bold">Melbourne, Australia</h3>
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-dim)] mb-1">Vibing Technology Pty. Ltd.</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              Unit 804, 60 Lorimer Street<br />
              Melbourne, Victoria 3008<br />
              <span className="text-[12px]">Phone: +61 435919419</span>
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#A78BFA' }} />
              <h3 className="text-sm font-bold">Manila, Philippines</h3>
            </div>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              Bonifacio Global City, 32nd Street<br />
              Taguig, Metro Manila 1634<br />
              Philippines
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#22D3EE' }} />
              <h3 className="text-sm font-bold">Bangalore, India</h3>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: 'rgba(6,182,212,0.12)', color: '#22D3EE' }}>India HQ</span>
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-dim)] mb-1">Vibing Techcloud Solutions (P) Ltd.</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              2M – 419, 2nd Floor, East of NGEF Layout<br />
              Kasturi Nagar, Bangalore – 560043<br />
              <span className="text-[12px]">Phone: +91-80-41464689</span>
            </p>
          </GlassCard>
        </div>
      </section>
    </>
  )
}
